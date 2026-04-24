import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { infrastructure } from "@dossier/core";

import type { AppEnv } from "../app.js";
import * as schema from "../db/schema.js";
import { loadProfileFromDb } from "../db/profile-loader.js";

export const publicRoutes = new Hono<AppEnv>();

// GET /u/:username — Public profile data (only isPublic profiles)
publicRoutes.get("/:username", async (c) => {
  const username = c.req.param("username");
  const { db } = c.get("dbConnection");

  // Find user by username
  const userRows = await db.select().from(schema.users).where(eq(schema.users.username, username));
  if (!userRows[0]) return c.json({ error: "User not found" }, 404);
  const userId = userRows[0].id;

  const profileRows = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const isPublic = profileRows[0]?.isPublic ?? false;

  if (!isPublic) {
    return c.json({ error: "Profile is not public" }, 404);
  }

  const profile = await loadProfileFromDb(db, userId);
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  // Filter out private entities for public access (domain visibility overrides entity visibility)
  const privateDomainIds = new Set<string>(
    profile.domains.filter((d) => d.visibility === "private").map((d) => d.id),
  );
  const isVisible = (entity: { visibility: string; domainId?: string }) => {
    if (entity.visibility === "private") return false;
    if (entity.domainId && privateDomainIds.has(entity.domainId)) return false;
    return true;
  };
  const publicProfile = {
    ...profile,
    skills: profile.skills.filter(isVisible),
    goals: profile.goals.filter(isVisible),
    interests: profile.interests.filter(isVisible),
    projects: profile.projects.filter(isVisible),
  };

  const format = c.req.query("format") ?? "json";

  if (format === "json") {
    const serialized = infrastructure.serializeProfile(publicProfile);
    return c.json(serialized);
  }

  const exporter = infrastructure.createExporter(format);
  return c.text(exporter.export(publicProfile));
});
