/**
 * Loads a full Profile domain entity from the database.
 * Bridges between Drizzle database rows and @dossier/core domain model.
 */
import { eq, inArray } from "drizzle-orm";
import {
  createProfile,
  toProfileId,
  toDomainId,
  toCategoryId,
  toSkillId,
  toGoalId,
  toInterestId,
  createSlug,
} from "@dossier/core";
import type { Profile, Domain, Category, Skill, LearningGoal, Interest } from "@dossier/core";

import type { Database } from "./connection.js";
import * as schema from "./schema.js";

/**
 * Load a full Profile for a user. Returns null if user has no profile.
 */
export async function loadProfileFromDb(db: Database, userId: string): Promise<Profile | null> {
  const profileRows = await db.select().from(schema.profiles).where(eq(schema.profiles.userId, userId));
  const profileRow = profileRows[0];
  if (!profileRow) return null;

  const domainRows = await db.select().from(schema.domains).where(eq(schema.domains.profileId, profileRow.id));
  const domainIds = domainRows.map((d) => d.id);
  const categoryRows = domainIds.length > 0
    ? await db.select().from(schema.categories).where(inArray(schema.categories.domainId, domainIds))
    : [];
  const skillRows = await db.select().from(schema.skills).where(eq(schema.skills.profileId, profileRow.id));
  const goalRows = await db.select().from(schema.goals).where(eq(schema.goals.profileId, profileRow.id));
  const interestRows = await db.select().from(schema.interests).where(eq(schema.interests.profileId, profileRow.id));

  // Build domain → categories map
  const catsByDomain = new Map<string, Category[]>();
  for (const c of categoryRows) {
    const list = catsByDomain.get(c.domainId) ?? [];
    list.push({
      id: toCategoryId(c.id),
      slug: createSlug(c.slug),
      name: c.name,
      ...(c.description != null && { description: c.description }),
    });
    catsByDomain.set(c.domainId, list);
  }

  const domains: Domain[] = domainRows.map((d) => ({
    id: toDomainId(d.id),
    slug: createSlug(d.slug),
    name: d.name,
    ...(d.description != null && { description: d.description }),
    categories: catsByDomain.get(d.id) ?? [],
    isBuiltIn: d.isBuiltIn,
  }));

  const skills: Skill[] = skillRows.map((s) => ({
    id: toSkillId(s.id),
    slug: createSlug(s.slug),
    name: s.name,
    domainId: toDomainId(s.domainId),
    categoryId: toCategoryId(s.categoryId),
    proficiency: s.proficiency as Skill["proficiency"],
    ...(s.notes != null && { notes: s.notes }),
    sources: (s.sources as Skill["sources"]) ?? [],
    usage: (s.usage as Skill["usage"]) ?? [],
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }));

  const goals: LearningGoal[] = goalRows.map((g) => ({
    id: toGoalId(g.id),
    name: g.name,
    domainId: toDomainId(g.domainId),
    ...(g.description != null && { description: g.description }),
    priority: g.priority as LearningGoal["priority"],
    status: g.status as LearningGoal["status"],
    progress: (g.progress as LearningGoal["progress"]) ?? [],
    resources: (g.resources as LearningGoal["resources"]) ?? [],
    ...(g.targetDate != null && { targetDate: g.targetDate }),
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  }));

  const interests: Interest[] = interestRows.map((i) => ({
    id: toInterestId(i.id),
    name: i.name,
    domainId: toDomainId(i.domainId),
    ...(i.description != null && { description: i.description }),
    createdAt: i.createdAt,
  }));

  return createProfile({
    id: toProfileId(profileRow.id),
    name: profileRow.name,
    settings: (profileRow.settings as Profile["settings"]) ?? {},
    domains,
    skills,
    goals,
    interests,
    createdAt: profileRow.createdAt,
    updatedAt: profileRow.updatedAt,
  });
}
