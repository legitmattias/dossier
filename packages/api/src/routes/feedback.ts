import { Hono } from "hono";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";

import type { AppEnv } from "../app.js";
import { requireAuth } from "../middleware/auth.js";
import * as schema from "../db/schema.js";

export const feedbackRoutes = new Hono<AppEnv>();

const VALID_CATEGORIES = ["bug", "friction", "suggestion", "missing-feature", "other"] as const;
const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const VALID_STATUSES = ["new", "triaged", "resolved", "wontfix"] as const;

type Category = typeof VALID_CATEGORIES[number];
type Severity = typeof VALID_SEVERITIES[number];
type Status = typeof VALID_STATUSES[number];

// POST /feedback — open; AI agents submit here (auth optional for attribution)
feedbackRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    category?: string;
    severity?: string;
    message?: string;
    reproduction?: string;
    clientName?: string;
    clientVersion?: string;
    clientSha?: string;
    confirmed?: boolean;
  }>();

  if (body.confirmed !== true) {
    return c.json({ error: "`confirmed` must be true — feedback requires explicit user approval." }, 400);
  }
  if (!body.category || !VALID_CATEGORIES.includes(body.category as Category)) {
    return c.json({ error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}.` }, 400);
  }
  const severity = body.severity ?? "medium";
  if (!VALID_SEVERITIES.includes(severity as Severity)) {
    return c.json({ error: `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(", ")}.` }, 400);
  }
  if (!body.message || body.message.trim().length < 5) {
    return c.json({ error: "`message` is required and must be at least 5 characters." }, 400);
  }

  const { db } = c.get("dbConnection");
  const reporterUserId = c.get("userId") ?? null;
  const id = randomUUID();

  await db.insert(schema.feedback).values({
    id,
    category: body.category,
    severity,
    message: body.message.trim(),
    reproduction: body.reproduction?.trim() || null,
    reporterUserId,
    clientName: body.clientName?.trim() || null,
    clientVersion: body.clientVersion?.trim() || null,
    clientSha: body.clientSha?.trim() || null,
    status: "new",
  });

  return c.json({ id, status: "new", acknowledged: true }, 201);
});

// GET /feedback — list all; authed only
feedbackRoutes.get("/", requireAuth, async (c) => {
  const { db } = c.get("dbConnection");
  const statusFilter = c.req.query("status");

  const where = statusFilter && VALID_STATUSES.includes(statusFilter as Status)
    ? eq(schema.feedback.status, statusFilter)
    : undefined;

  const rows = await db
    .select()
    .from(schema.feedback)
    .where(where)
    .orderBy(desc(schema.feedback.createdAt))
    .limit(500);

  return c.json({ feedback: rows });
});

// PATCH /feedback/:id — update status / resolved note; authed only
feedbackRoutes.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json<{ status?: string; resolvedNote?: string }>();

  const patch: Partial<typeof schema.feedback.$inferInsert> = { updatedAt: new Date() };
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status as Status)) {
      return c.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}.` }, 400);
    }
    patch.status = body.status;
  }
  if (body.resolvedNote !== undefined) {
    patch.resolvedNote = body.resolvedNote.trim() || null;
  }

  const { db } = c.get("dbConnection");
  const result = await db.update(schema.feedback).set(patch).where(eq(schema.feedback.id, id)).returning();
  if (result.length === 0) return c.json({ error: "Feedback not found" }, 404);
  return c.json({ feedback: result[0] });
});

// POST /feedback/:id/forward — forward to GitHub Issues; authed only
feedbackRoutes.post("/:id/forward", requireAuth, async (c) => {
  const id = c.req.param("id");
  const { db } = c.get("dbConnection");

  const ghToken = process.env["GITHUB_TOKEN"];
  const ghRepo = process.env["GITHUB_FEEDBACK_REPO"];
  if (!ghToken || !ghRepo) {
    return c.json({
      error: "GitHub forwarding is not configured. Set GITHUB_TOKEN and GITHUB_FEEDBACK_REPO env vars.",
    }, 501);
  }

  const rows = await db.select().from(schema.feedback).where(eq(schema.feedback.id, id));
  const item = rows[0];
  if (!item) return c.json({ error: "Feedback not found" }, 404);
  if (item.githubIssueUrl) {
    return c.json({ error: "Already forwarded", githubIssueUrl: item.githubIssueUrl }, 409);
  }

  const title = `[${item.category}/${item.severity}] ${item.message.slice(0, 72).trim()}${item.message.length > 72 ? "…" : ""}`;
  const bodyLines: string[] = [];
  bodyLines.push(`**Category:** ${item.category}`);
  bodyLines.push(`**Severity:** ${item.severity}`);
  bodyLines.push("");
  bodyLines.push("## Message");
  bodyLines.push(item.message);
  if (item.reproduction) {
    bodyLines.push("");
    bodyLines.push("## Reproduction");
    bodyLines.push(item.reproduction);
  }
  bodyLines.push("");
  bodyLines.push("## Context");
  bodyLines.push(`- Client: ${item.clientName ?? "unknown"} ${item.clientVersion ?? ""} ${item.clientSha ? `(${item.clientSha.slice(0, 7)})` : ""}`.trim());
  bodyLines.push(`- Reported: ${item.createdAt.toISOString()}`);
  bodyLines.push(`- Feedback ID: \`${item.id}\``);

  const ghRes = await fetch(`https://api.github.com/repos/${ghRepo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ghToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body: bodyLines.join("\n"),
      labels: ["feedback", `severity:${item.severity}`, `category:${item.category}`],
    }),
  });

  if (!ghRes.ok) {
    const errBody = await ghRes.text().catch(() => "");
    return c.json({
      error: `GitHub API responded ${ghRes.status}: ${errBody.slice(0, 500)}`,
    }, 502);
  }

  const issue = await ghRes.json() as { html_url: string; number: number };

  const [updated] = await db
    .update(schema.feedback)
    .set({
      githubIssueUrl: issue.html_url,
      githubIssueNumber: issue.number,
      status: item.status === "new" ? "triaged" : item.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.feedback.id, id))
    .returning();

  return c.json({ feedback: updated, githubIssueUrl: issue.html_url, githubIssueNumber: issue.number }, 201);
});
