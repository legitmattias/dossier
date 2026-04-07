/**
 * IProfileRepository implementation backed by a database (Postgres or SQLite).
 * Loads the full profile into the domain model, lets use cases mutate it,
 * then persists the changes back. This is a "whole-aggregate" pattern —
 * same as FileProfileRepository but with a database backend.
 */
import { eq } from "drizzle-orm";
import type { Profile } from "@dossier/core";
import type { application } from "@dossier/core";

import type { DbConnection, PgDatabase, SqliteDatabase } from "./connection.js";
import * as pgSchema from "./schema.pg.js";
import * as sqliteSchema from "./schema.sqlite.js";
import { loadProfileFromDb } from "./profile-loader.js";

export class DatabaseProfileRepository implements application.IProfileRepository {
  constructor(
    private readonly dbConn: DbConnection,
    private readonly userId: string,
  ) {}

  async load(): Promise<Profile | null> {
    return loadProfileFromDb(this.dbConn, this.userId);
  }

  async save(profile: Profile): Promise<void> {
    if (this.dbConn.dialect === "postgres") {
      await this.savePg(this.dbConn.db as PgDatabase, profile);
    } else {
      await this.saveSqlite(this.dbConn.db as SqliteDatabase, profile);
    }
  }

  async exists(): Promise<boolean> {
    const profile = await this.load();
    return profile !== null;
  }

  private async savePg(db: PgDatabase, profile: Profile): Promise<void> {
    const profileRow = await db.select().from(pgSchema.profiles).where(eq(pgSchema.profiles.userId, this.userId));
    if (!profileRow[0]) return;
    const profileId = profileRow[0].id;

    // Update profile metadata
    await db.update(pgSchema.profiles).set({
      name: profile.name,
      settings: profile.settings,
      updatedAt: new Date(),
    }).where(eq(pgSchema.profiles.id, profileId));

    // Delete all children first (FK-safe order: leaves → parents)
    await db.delete(pgSchema.skills).where(eq(pgSchema.skills.profileId, profileId));
    await db.delete(pgSchema.goals).where(eq(pgSchema.goals.profileId, profileId));
    await db.delete(pgSchema.interests).where(eq(pgSchema.interests.profileId, profileId));
    // Categories reference domains, so delete categories first
    for (const domain of profile.domains) {
      await db.delete(pgSchema.categories).where(eq(pgSchema.categories.domainId, domain.id));
    }
    await db.delete(pgSchema.domains).where(eq(pgSchema.domains.profileId, profileId));

    // Re-insert in parent-first order: domains → categories → skills, goals, interests
    for (const domain of profile.domains) {
      await db.insert(pgSchema.domains).values({
        id: domain.id, profileId, slug: domain.slug, name: domain.name,
        description: domain.description, isBuiltIn: domain.isBuiltIn,
      }).onConflictDoNothing();
      for (const cat of domain.categories) {
        await db.insert(pgSchema.categories).values({
          id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
          description: cat.description,
        }).onConflictDoNothing();
      }
    }

    for (const skill of profile.skills) {
      await db.insert(pgSchema.skills).values({
        id: skill.id, profileId, slug: skill.slug, name: skill.name,
        domainId: skill.domainId, categoryId: skill.categoryId,
        proficiency: skill.proficiency, notes: skill.notes,
        sources: skill.sources, usage: skill.usage,
        createdAt: skill.createdAt, updatedAt: skill.updatedAt,
      });
    }

    for (const goal of profile.goals) {
      await db.insert(pgSchema.goals).values({
        id: goal.id, profileId, name: goal.name, domainId: goal.domainId,
        description: goal.description, priority: goal.priority, status: goal.status,
        progress: goal.progress, resources: goal.resources,
        targetDate: goal.targetDate, createdAt: goal.createdAt, updatedAt: goal.updatedAt,
      });
    }

    for (const interest of profile.interests) {
      await db.insert(pgSchema.interests).values({
        id: interest.id, profileId, name: interest.name, domainId: interest.domainId,
        description: interest.description, createdAt: interest.createdAt,
      });
    }
  }

  private async saveSqlite(db: SqliteDatabase, profile: Profile): Promise<void> {
    const profileRow = await db.select().from(sqliteSchema.profiles).where(eq(sqliteSchema.profiles.userId, this.userId));
    if (!profileRow[0]) return;
    const profileId = profileRow[0].id;
    const now = new Date().toISOString();

    await db.update(sqliteSchema.profiles).set({
      name: profile.name,
      settings: profile.settings,
      updatedAt: now,
    }).where(eq(sqliteSchema.profiles.id, profileId));

    // Delete all children first (FK-safe order: leaves → parents)
    await db.delete(sqliteSchema.skills).where(eq(sqliteSchema.skills.profileId, profileId));
    await db.delete(sqliteSchema.goals).where(eq(sqliteSchema.goals.profileId, profileId));
    await db.delete(sqliteSchema.interests).where(eq(sqliteSchema.interests.profileId, profileId));
    for (const domain of profile.domains) {
      await db.delete(sqliteSchema.categories).where(eq(sqliteSchema.categories.domainId, domain.id));
    }
    await db.delete(sqliteSchema.domains).where(eq(sqliteSchema.domains.profileId, profileId));

    // Re-insert in parent-first order
    for (const domain of profile.domains) {
      await db.insert(sqliteSchema.domains).values({
        id: domain.id, profileId, slug: domain.slug, name: domain.name,
        description: domain.description, isBuiltIn: domain.isBuiltIn,
      }).onConflictDoNothing();
      for (const cat of domain.categories) {
        await db.insert(sqliteSchema.categories).values({
          id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
          description: cat.description,
        }).onConflictDoNothing();
      }
    }

    for (const skill of profile.skills) {
      await db.insert(sqliteSchema.skills).values({
        id: skill.id, profileId, slug: skill.slug, name: skill.name,
        domainId: skill.domainId, categoryId: skill.categoryId,
        proficiency: skill.proficiency, notes: skill.notes,
        sources: skill.sources as unknown as string,
        usage: skill.usage as unknown as string,
        createdAt: skill.createdAt.toISOString(), updatedAt: skill.updatedAt.toISOString(),
      });
    }

    for (const goal of profile.goals) {
      await db.insert(sqliteSchema.goals).values({
        id: goal.id, profileId, name: goal.name, domainId: goal.domainId,
        description: goal.description, priority: goal.priority, status: goal.status,
        progress: goal.progress as unknown as string,
        resources: goal.resources as unknown as string,
        targetDate: goal.targetDate?.toISOString(),
        createdAt: goal.createdAt.toISOString(), updatedAt: goal.updatedAt.toISOString(),
      });
    }

    for (const interest of profile.interests) {
      await db.insert(sqliteSchema.interests).values({
        id: interest.id, profileId, name: interest.name, domainId: interest.domainId,
        description: interest.description, createdAt: interest.createdAt.toISOString(),
      });
    }
  }
}
