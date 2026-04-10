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

import type { DbConnection, PgDatabase, SqliteDatabase } from "./connection.js";
import * as pgSchema from "./schema.pg.js";
import * as sqliteSchema from "./schema.sqlite.js";

/**
 * Load a full Profile for a user. Returns null if user has no profile.
 */
export async function loadProfileFromDb(dbConn: DbConnection, userId: string): Promise<Profile | null> {
  if (dbConn.dialect === "postgres") {
    return loadProfilePg(dbConn.db as PgDatabase, userId);
  }
  return loadProfileSqlite(dbConn.db as SqliteDatabase, userId);
}

async function loadProfilePg(db: PgDatabase, userId: string): Promise<Profile | null> {
  const profileRows = await db.select().from(pgSchema.profiles).where(eq(pgSchema.profiles.userId, userId));
  const profileRow = profileRows[0];
  if (!profileRow) return null;

  const domainRows = await db.select().from(pgSchema.domains).where(eq(pgSchema.domains.profileId, profileRow.id));
  const domainIds = domainRows.map((d) => d.id);
  const categoryRows = domainIds.length > 0
    ? await db.select().from(pgSchema.categories).where(inArray(pgSchema.categories.domainId, domainIds))
    : [];
  const skillRows = await db.select().from(pgSchema.skills).where(eq(pgSchema.skills.profileId, profileRow.id));
  const goalRows = await db.select().from(pgSchema.goals).where(eq(pgSchema.goals.profileId, profileRow.id));
  const interestRows = await db.select().from(pgSchema.interests).where(eq(pgSchema.interests.profileId, profileRow.id));

  return assembleProfile(profileRow, domainRows, categoryRows, skillRows, goalRows, interestRows);
}

async function loadProfileSqlite(db: SqliteDatabase, userId: string): Promise<Profile | null> {
  const profileRows = await db.select().from(sqliteSchema.profiles).where(eq(sqliteSchema.profiles.userId, userId));
  const profileRow = profileRows[0];
  if (!profileRow) return null;

  const domainRows = await db.select().from(sqliteSchema.domains).where(eq(sqliteSchema.domains.profileId, profileRow.id));
  const domainIds = domainRows.map((d) => d.id);
  const categoryRows = domainIds.length > 0
    ? await db.select().from(sqliteSchema.categories).where(inArray(sqliteSchema.categories.domainId, domainIds))
    : [];
  const skillRows = await db.select().from(sqliteSchema.skills).where(eq(sqliteSchema.skills.profileId, profileRow.id));
  const goalRows = await db.select().from(sqliteSchema.goals).where(eq(sqliteSchema.goals.profileId, profileRow.id));
  const interestRows = await db.select().from(sqliteSchema.interests).where(eq(sqliteSchema.interests.profileId, profileRow.id));

  return assembleProfile(profileRow, domainRows, categoryRows, skillRows, goalRows, interestRows);
}

function assembleProfile(
  profileRow: { id: string; name: string; settings: unknown; createdAt: string | Date; updatedAt: string | Date },
  domainRows: Array<{ id: string; slug: string; name: string; description: string | null; isBuiltIn: boolean }>,
  categoryRows: Array<{ id: string; domainId: string; slug: string; name: string; description: string | null }>,
  skillRows: Array<{ id: string; slug: string; name: string; domainId: string; categoryId: string; proficiency: string; notes: string | null; sources: unknown; usage: unknown; createdAt: string | Date; updatedAt: string | Date }>,
  goalRows: Array<{ id: string; name: string; domainId: string; description: string | null; priority: string; status: string; progress: unknown; resources: unknown; targetDate: string | Date | null; createdAt: string | Date; updatedAt: string | Date }>,
  interestRows: Array<{ id: string; name: string; domainId: string; description: string | null; createdAt: string | Date }>,
): Profile {
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
    createdAt: toDate(s.createdAt),
    updatedAt: toDate(s.updatedAt),
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
    ...(g.targetDate != null && { targetDate: toDate(g.targetDate) }),
    createdAt: toDate(g.createdAt),
    updatedAt: toDate(g.updatedAt),
  }));

  const interests: Interest[] = interestRows.map((i) => ({
    id: toInterestId(i.id),
    name: i.name,
    domainId: toDomainId(i.domainId),
    ...(i.description != null && { description: i.description }),
    createdAt: toDate(i.createdAt),
  }));

  return createProfile({
    id: toProfileId(profileRow.id),
    name: profileRow.name,
    settings: (profileRow.settings as Profile["settings"]) ?? {},
    domains,
    skills,
    goals,
    interests,
    createdAt: toDate(profileRow.createdAt),
    updatedAt: toDate(profileRow.updatedAt),
  });
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}
