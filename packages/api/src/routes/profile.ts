import { Hono } from "hono";
import {
  application,
  infrastructure,
  createDomain,
  createCategory,
  addDomainToProfile,
  addCategoryToDomain,
  findDomainInProfile,
  toDomainId,
  toCategoryId,
  createSlug,
} from "@dossier/core";

import type { AppEnv } from "../app.js";
import { requireAuth } from "../middleware/auth.js";
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
profileRoutes.get("/", requireAuth, async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  const serialized = infrastructure.serializeProfile(profile);
  return c.json(serialized);
});

// PUT /profile — Replace entire profile data (used by MCP Cloud Mode)
profileRoutes.put("/", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);

  // Parse the incoming profile through the schema (validates + converts dates)
  const incoming = infrastructure.parseProfile(body);
  if (!incoming) return c.json({ error: "Invalid profile data" }, 400);

  // Save via the repository (handles delete-and-reinsert)
  await deps.profileRepository.save(incoming);
  return c.json({ ok: true });
});

// GET /profile/export?format=claude
profileRoutes.get("/export", requireAuth, async (c) => {
  const format = c.req.query("format") ?? "json";
  const deps = getDeps(c);

  const exporter = infrastructure.createExporter(format);
  const result = await application.exportProfile(
    { profileRepository: deps.profileRepository, exporter },
  );
  return c.text(result.content);
});

// --- Skills ---

// GET /profile/skills
profileRoutes.get("/skills", requireAuth, async (c) => {
  const deps = getDeps(c);
  const result = await application.listSkills(deps, {
    domainId: c.req.query("domainId"),
    categoryId: c.req.query("categoryId"),
    proficiency: c.req.query("proficiency"),
  });
  return c.json(result);
});

// POST /profile/skills
profileRoutes.post("/skills", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addSkill(deps, body);
  return c.json(result, 201);
});

// PUT /profile/skills/:id
profileRoutes.put("/skills/:id", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateSkill(deps, { skillId: c.req.param("id"), ...body });
  return c.json(result);
});

// DELETE /profile/skills/:id
profileRoutes.delete("/skills/:id", requireAuth, async (c) => {
  const deps = getDeps(c);
  await application.removeSkill(deps, { skillId: c.req.param("id") });
  return c.json({ removed: true });
});

// --- Goals ---

// GET /profile/goals
profileRoutes.get("/goals", requireAuth, async (c) => {
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
profileRoutes.post("/goals", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addLearningGoal(deps, body);
  return c.json(result, 201);
});

// PUT /profile/goals/:id/progress
profileRoutes.put("/goals/:id/progress", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.updateGoalProgress(deps, { goalId: c.req.param("id"), ...body });
  return c.json(result);
});

// POST /profile/goals/:id/complete
profileRoutes.post("/goals/:id/complete", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.completeGoal(deps, { goalId: c.req.param("id"), ...body });
  return c.json(result);
});

// --- Interests ---

// GET /profile/interests
profileRoutes.get("/interests", requireAuth, async (c) => {
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  return c.json({ interests: profile.interests.map(application.toInterestOutput) });
});

// POST /profile/interests
profileRoutes.post("/interests", requireAuth, async (c) => {
  const body = await c.req.json();
  const deps = getDeps(c);
  const result = await application.addInterest(deps, body);
  return c.json(result, 201);
});

// DELETE /profile/interests/:id
profileRoutes.delete("/interests/:id", requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const deps = getDeps(c);
  await application.removeInterest(deps, { interestId: c.req.param("id"), ...body });
  return c.json({ removed: true });
});

// --- Domains ---

// POST /profile/domains
profileRoutes.post("/domains", requireAuth, async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  const id = toDomainId(deps.idGenerator.generate("domain"));
  const slug = createSlug(application.slugify(body.name));
  const domain = createDomain({ id, slug, name: body.name, description: body.description });
  const updated = addDomainToProfile(profile, domain);
  await deps.profileRepository.save(updated);
  return c.json({ domain: { id: domain.id, slug: domain.slug, name: domain.name } }, 201);
});

// POST /profile/domains/:domainId/categories
profileRoutes.post("/domains/:domainId/categories", requireAuth, async (c) => {
  const body = await c.req.json<{ name: string; description?: string }>();
  const deps = getDeps(c);
  const profile = await deps.profileRepository.load();
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  const domainId = toDomainId(c.req.param("domainId"));
  const domain = findDomainInProfile(profile, domainId);
  const categoryId = toCategoryId(deps.idGenerator.generate("category"));
  const slug = createSlug(application.slugify(body.name));
  const category = createCategory({ id: categoryId, slug, name: body.name, description: body.description });
  const updatedDomain = addCategoryToDomain(domain, category);

  const updatedProfile = {
    ...profile,
    domains: profile.domains.map((d) => d.id === domainId ? updatedDomain : d),
    updatedAt: new Date(),
  };
  await deps.profileRepository.save(updatedProfile);
  return c.json({ category: { id: categoryId, slug: category.slug, name: category.name } }, 201);
});

// GET /profile/domains
profileRoutes.get("/domains", requireAuth, async (c) => {
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
