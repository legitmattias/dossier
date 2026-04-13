/**
 * IProfileRepository implementation backed by PostgreSQL via Drizzle ORM.
 * Uses the "whole-aggregate" pattern: loads full profile, lets use cases
 * mutate it, then persists changes back with delete-and-reinsert.
 */
import { eq } from "drizzle-orm";
import type { Profile } from "@dossier/core";
import type { application } from "@dossier/core";

import type { Database } from "./connection.js";
import * as schema from "./schema.js";
import { loadProfileFromDb } from "./profile-loader.js";

export class DatabaseProfileRepository implements application.IProfileRepository {
  constructor(
    private readonly db: Database,
    private readonly userId: string,
  ) {}

  async load(): Promise<Profile | null> {
    return loadProfileFromDb(this.db, this.userId);
  }

  async save(profile: Profile): Promise<void> {
    const profileRow = await this.db.select().from(schema.profiles).where(eq(schema.profiles.userId, this.userId));
    if (!profileRow[0]) return;
    const profileId = profileRow[0].id;

    await this.db.transaction(async (tx) => {
      // Update profile metadata
      await tx.update(schema.profiles).set({
        name: profile.name,
        bio: profile.bio ?? null,
        preferredLanguage: profile.preferredLanguage ?? null,
        customInstructions: profile.customInstructions ?? null,
        settings: profile.settings,
        updatedAt: new Date(),
      }).where(eq(schema.profiles.id, profileId));

      // Delete all children first (FK-safe order: leaves → parents)
      await tx.delete(schema.projects).where(eq(schema.projects.profileId, profileId));
      await tx.delete(schema.skills).where(eq(schema.skills.profileId, profileId));
      await tx.delete(schema.goals).where(eq(schema.goals.profileId, profileId));
      await tx.delete(schema.interests).where(eq(schema.interests.profileId, profileId));
      for (const domain of profile.domains) {
        await tx.delete(schema.categories).where(eq(schema.categories.domainId, domain.id));
      }
      await tx.delete(schema.domains).where(eq(schema.domains.profileId, profileId));

      // Re-insert in parent-first order: domains → categories → skills, goals, interests
      for (const domain of profile.domains) {
        await tx.insert(schema.domains).values({
          id: domain.id, profileId, slug: domain.slug, name: domain.name,
          description: domain.description, isBuiltIn: domain.isBuiltIn,
        }).onConflictDoNothing();
        for (const cat of domain.categories) {
          await tx.insert(schema.categories).values({
            id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
            description: cat.description,
          }).onConflictDoNothing();
        }
      }

      for (const skill of profile.skills) {
        await tx.insert(schema.skills).values({
          id: skill.id, profileId, slug: skill.slug, name: skill.name,
          domainId: skill.domainId, categoryId: skill.categoryId,
          proficiency: skill.proficiency, notes: skill.notes,
          sources: skill.sources, usage: skill.usage, visibility: skill.visibility,
          createdAt: skill.createdAt, updatedAt: skill.updatedAt,
        });
      }

      for (const goal of profile.goals) {
        await tx.insert(schema.goals).values({
          id: goal.id, profileId, name: goal.name, domainId: goal.domainId,
          description: goal.description, motivation: goal.motivation,
          priority: goal.priority, status: goal.status, visibility: goal.visibility,
          progress: goal.progress, resources: goal.resources,
          targetDate: goal.targetDate, createdAt: goal.createdAt, updatedAt: goal.updatedAt,
        });
      }

      for (const interest of profile.interests) {
        await tx.insert(schema.interests).values({
          id: interest.id, profileId, name: interest.name, domainId: interest.domainId,
          description: interest.description, visibility: interest.visibility, createdAt: interest.createdAt,
        });
      }

      for (const project of profile.projects) {
        await tx.insert(schema.projects).values({
          id: project.id, profileId, slug: project.slug, name: project.name,
          description: project.description, url: project.url, role: project.role, notes: project.notes,
          status: project.status, priority: project.priority, featured: project.featured, visibility: project.visibility,
          skillIds: project.skillIds, highlights: project.highlights,
          startDate: project.startDate, endDate: project.endDate,
          createdAt: project.createdAt, updatedAt: project.updatedAt,
        });
      }
    });
  }

  async exists(): Promise<boolean> {
    const profile = await this.load();
    return profile !== null;
  }
}
