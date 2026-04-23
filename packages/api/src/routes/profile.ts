import { Hono } from "hono";
import { application, infrastructure } from "@dossier/core";

import type { AppEnv } from "../app.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { DatabaseProfileRepository } from "../db/db-profile-repository.js";
import { UuidIdGenerator } from "../db/id-generator.js";

export const profileRoutes = new Hono<AppEnv>();

function getDeps(c: { get(key: "dbConnection"): import("../db/connection.js").DbConnection; get(key: "userId"): string | undefined }) {
  const { db } = c.get("dbConnection");
  const userId = c.get("userId")!;
  return {
    profileRepository: new DatabaseProfileRepository(db, userId),
    idGenerator: new UuidIdGenerator(),
  };
}

// GET /profile
profileRoutes.get("/", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  try {
    const serialized = infrastructure.serializeProfile(profile);
    return c.json(serialized);
  } catch (err) {
    console.error("[GET /profile] Serialization error:", err);
    throw err;
  }
});

// PATCH /profile — Update profile-level fields (name, bio, customInstructions, preferredLanguage)
profileRoutes.patch("/", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json<{
    name?: string;
    bio?: string;
    preferredLanguage?: string;
    customInstructions?: string;
  }>();
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  const updated = {
    ...profile,
    ...(body.name !== undefined && { name: body.name }),
    ...(body.bio !== undefined && { bio: body.bio }),
    ...(body.preferredLanguage !== undefined && { preferredLanguage: body.preferredLanguage }),
    ...(body.customInstructions !== undefined && { customInstructions: body.customInstructions }),
    updatedAt: new Date(),
  };
  await deps.profileRepository.save(updated);

  const serialized = infrastructure.serializeProfile(updated);
  return c.json(serialized);
});

// GET /profile/export?format=llm-md
profileRoutes.get("/export", requireAuth, requireScope("read"), async (c) => {
  const format = c.req.query("format") ?? "json";
  const deps = getDeps(c);

  const exporter = infrastructure.createExporter(format);
  const result = await application.exportProfile(
    { profileRepository: deps.profileRepository, exporter },
  );
  return c.text(result.content);
});

// --- Search ---

// GET /profile/search?q=term
profileRoutes.get("/search", requireAuth, requireScope("read"), async (c) => {
  const q = c.req.query("q");
  if (!q) return c.json({ error: "Query parameter 'q' is required" }, 400);
  const deps = getDeps(c);
  const result = await application.searchProfile(deps, { query: q });
  return c.json(result);
});

// --- Skills ---

// GET /profile/skills
profileRoutes.get("/skills", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const result = await application.listSkills(deps, {
    domainId: c.req.query("domainId"),
    categoryId: c.req.query("categoryId"),
    proficiency: c.req.query("proficiency"),
  });
  return c.json(result);
});

// POST /profile/skills
profileRoutes.post("/skills", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addSkill(deps, body);
  return c.json(result, 201);
});

// PUT /profile/skills/:id
profileRoutes.put("/skills/:id", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateSkill(deps, { skillId: c.req.param("id"), ...body });
  return c.json(result);
});

// DELETE /profile/skills/:id
profileRoutes.delete("/skills/:id", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeSkill(deps, { skillId: c.req.param("id") });
  return c.json({ removed: true });
});

// --- Goals ---

// GET /profile/goals
profileRoutes.get("/goals", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  let goals = [...profile.goals];
  const status = c.req.query("status");
  if (status) {
    goals = goals.filter((g) => g.status === status);
  }
  return c.json({ goals: goals.map(application.toGoalOutput) });
});

// POST /profile/goals
profileRoutes.post("/goals", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addLearningGoal(deps, body);
  return c.json(result, 201);
});

// PUT /profile/goals/:id/progress
profileRoutes.put("/goals/:id/progress", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateGoalProgress(deps, { goalId: c.req.param("id"), ...body });
  return c.json(result);
});

// PUT /profile/goals/:id
profileRoutes.put("/goals/:id", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateGoal(deps, { goalId: c.req.param("id"), ...body });
  return c.json(result);
});

// POST /profile/goals/:id/complete
profileRoutes.post("/goals/:id/complete", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.completeGoal(deps, { goalId: c.req.param("id"), ...body });
  return c.json(result);
});

// DELETE /profile/goals/:id
profileRoutes.delete("/goals/:id", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeGoal(deps, { goalId: c.req.param("id") });
  return c.json({ removed: true });
});

// --- Interests ---

// GET /profile/interests
profileRoutes.get("/interests", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({ interests: profile.interests.map(application.toInterestOutput) });
});

// POST /profile/interests
profileRoutes.post("/interests", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addInterest(deps, body);
  return c.json(result, 201);
});

// PUT /profile/interests/:id
profileRoutes.put("/interests/:id", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateInterest(deps, { interestId: c.req.param("id"), ...body });
  return c.json(result);
});

// DELETE /profile/interests/:id
profileRoutes.delete("/interests/:id", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeInterest(deps, { interestId: c.req.param("id") });
  return c.json({ removed: true });
});

// POST /profile/interests/:id/promote
profileRoutes.post("/interests/:id/promote", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const deps = getDeps(c);
  const result = await application.promoteInterest(deps, { interestId: c.req.param("id"), ...body });
  return c.json(result, 201);
});

// --- Domains ---

// POST /profile/domains
profileRoutes.post("/domains", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const deps = getDeps(c);
  const result = await application.addDomain(deps, body);
  return c.json(result, 201);
});

// PUT /profile/domains/:domainId
profileRoutes.put("/domains/:domainId", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateDomain(deps, { domainId: c.req.param("domainId"), ...body });
  return c.json(result);
});

// DELETE /profile/domains/:domainId
profileRoutes.delete("/domains/:domainId", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeDomain(deps, { domainId: c.req.param("domainId") });
  return c.json({ removed: true });
});

// POST /profile/domains/:domainId/categories
profileRoutes.post("/domains/:domainId/categories", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const deps = getDeps(c);
  const result = await application.addCategory(deps, { domainId: c.req.param("domainId"), ...body });
  return c.json(result, 201);
});

// DELETE /profile/domains/:domainId/categories/:categoryId
profileRoutes.delete("/domains/:domainId/categories/:categoryId", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeCategory(deps, {
    domainId: c.req.param("domainId"),
    categoryId: c.req.param("categoryId"),
  });
  return c.json({ removed: true });
});

// --- Projects ---

// GET /profile/projects
profileRoutes.get("/projects", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const result = await application.listProjects(deps, {
    status: c.req.query("status"),
    featured: c.req.query("featured") === "true" ? true : c.req.query("featured") === "false" ? false : undefined,
  });
  return c.json(result);
});

// POST /profile/projects
profileRoutes.post("/projects", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addProject(deps, body);
  return c.json(result, 201);
});

// PUT /profile/projects/:id
profileRoutes.put("/projects/:id", requireAuth, requireScope("write"), async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateProject(deps, { projectId: c.req.param("id"), ...body });
  return c.json(result);
});

// DELETE /profile/projects/:id
profileRoutes.delete("/projects/:id", requireAuth, requireScope("write"), async (c) => {
  const deps = getDeps(c);
  await application.removeProject(deps, { projectId: c.req.param("id") });
  return c.json({ removed: true });
});

// GET /profile/domains
profileRoutes.get("/domains", requireAuth, requireScope("read"), async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({
    domains: profile.domains.map((d) => ({
      id: d.id,
      slug: d.slug,
      name: d.name,
      description: d.description,
      isBuiltIn: d.isBuiltIn,
      categories: d.categories.map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        description: cat.description,
      })),
    })),
  });
});
