import { z } from "zod";

import type { Category } from "../../domain/entities/category.js";
import type { Domain } from "../../domain/entities/domain-entity.js";
import type { Interest } from "../../domain/entities/interest.js";
import type { Project } from "../../domain/entities/project.js";
import type {
  GoalStatus,
  LearningGoal,
  Priority,
  Progress,
  Resource,
} from "../../domain/entities/learning-goal.js";
import type { Profile, ProfileSettings } from "../../domain/entities/profile.js";
import type { Skill, SkillSource } from "../../domain/entities/skill.js";
import { PROFICIENCY_LEVELS } from "../../domain/value-objects/proficiency.js";

// --- Sub-schemas ---

const skillSourceSchema = z.object({
  type: z.literal(["self-reported", "assessed", "inferred"]),
  detail: z.string().optional(),
  date: z.coerce.date(),
});

const skillSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  domainId: z.string().min(1),
  categoryId: z.string().min(1),
  proficiency: z.literal([...PROFICIENCY_LEVELS]),
  proficiencyLabel: z.string().nullish().transform((v) => v ?? undefined),
  sources: z.array(skillSourceSchema),
  notes: z.string().optional(),
  visibility: z.literal(["public", "private"]).optional().default("public"),
  featured: z.boolean().optional().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const progressSchema = z.object({
  percentage: z.number().min(0).max(100),
  updatedAt: z.coerce.date(),
  note: z.string().optional(),
});

const resourceSchema = z.object({
  title: z.string(),
  url: z.string().optional(),
  type: z.literal(["article", "video", "course", "book", "documentation", "other"]),
  completed: z.boolean(),
});

const learningGoalSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domainId: z.string().min(1),
  description: z.string().optional(),
  motivation: z.string().optional(),
  notes: z.string().optional(),
  priority: z.literal(["low", "medium", "high"]),
  status: z.literal(["active", "paused", "completed", "abandoned"]),
  progress: z.array(progressSchema),
  resources: z.array(resourceSchema),
  targetDate: z.coerce.date().optional(),
  visibility: z.literal(["public", "private"]).optional().default("public"),
  featured: z.boolean().optional().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.coerce.date().optional().default(() => new Date()),
  updatedAt: z.coerce.date().optional().default(() => new Date()),
});

const domainSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categories: z.array(categorySchema),
  isBuiltIn: z.boolean(),
  visibility: z.literal(["public", "private"]).optional().default("public"),
  proficiencyLabels: z.record(z.string(), z.string()).optional(),
  createdAt: z.coerce.date().optional().default(() => new Date()),
  updatedAt: z.coerce.date().optional().default(() => new Date()),
});

const interestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domainId: z.string().min(1).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  visibility: z.literal(["public", "private"]).optional().default("public"),
  featured: z.boolean().optional().default(false),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional().default(() => new Date()),
});

const projectSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  url: z.string().optional(),
  role: z.string().optional(),
  status: z.literal(["active", "completed", "paused", "ideation"]),
  priority: z.literal(["low", "medium", "high"]),
  featured: z.boolean(),
  skillIds: z.array(z.string()),
  highlights: z.array(z.string()),
  notes: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  visibility: z.literal(["public", "private"]).optional().default("public"),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const profileSettingsSchema = z.object({
  defaultDomainId: z.string().min(1).optional(),
});

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bio: z.string().optional(),
  preferredLanguage: z.string().optional(),
  customInstructions: z.string().optional(),
  settings: profileSettingsSchema,
  domains: z.array(domainSchema),
  skills: z.array(skillSchema),
  goals: z.array(learningGoalSchema),
  interests: z.array(interestSchema),
  projects: z.array(projectSchema).optional().default([]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Migrate raw profile JSON from older formats before validation.
 * - Remaps proficiency "beginner" → "novice" (v1 → v2 change).
 * - Backfills updatedAt for interests (default to createdAt).
 * - Backfills createdAt/updatedAt for domains and categories
 *   (default to the profile's createdAt, falling back to now).
 */
function migrateProfileData(json: unknown): unknown {
  if (typeof json !== "object" || json === null) return json;
  const data = json as Record<string, unknown>;

  if (Array.isArray(data.skills)) {
    data.skills = (data.skills as Record<string, unknown>[]).map((skill) => {
      if (skill.proficiency === "beginner") {
        return { ...skill, proficiency: "novice" };
      }
      return skill;
    });
  }

  const profileFallback = (data.createdAt as string | Date | undefined) ?? new Date().toISOString();

  if (Array.isArray(data.interests)) {
    data.interests = (data.interests as Record<string, unknown>[]).map((interest) => {
      if (interest.updatedAt == null) {
        return { ...interest, updatedAt: interest.createdAt ?? profileFallback };
      }
      return interest;
    });
  }

  if (Array.isArray(data.domains)) {
    data.domains = (data.domains as Record<string, unknown>[]).map((domain) => {
      const next: Record<string, unknown> = { ...domain };
      if (next.createdAt == null) next.createdAt = profileFallback;
      if (next.updatedAt == null) next.updatedAt = next.createdAt ?? profileFallback;
      if (Array.isArray(next.categories)) {
        next.categories = (next.categories as Record<string, unknown>[]).map((cat) => {
          const nextCat: Record<string, unknown> = { ...cat };
          if (nextCat.createdAt == null) nextCat.createdAt = next.createdAt ?? profileFallback;
          if (nextCat.updatedAt == null) nextCat.updatedAt = nextCat.createdAt ?? profileFallback;
          return nextCat;
        });
      }
      return next;
    });
  }

  return data;
}

/**
 * Parse and validate raw JSON data into a Profile.
 * Applies migrations for older profile formats before validation.
 * Zod coerces ISO date strings into Date objects.
 * Branded types are compile-time only, so casting after Zod validation is safe.
 */
export function parseProfile(json: unknown): Profile {
  const migrated = migrateProfileData(json);
  return profileSchema.parse(migrated) as unknown as Profile;
}

// --- Serialization helpers ---

function serializeDate(date: Date | string): string {
  if (typeof date === "string") return date;
  return date.toISOString();
}

function serializeSkillSource(source: SkillSource): object {
  return {
    type: source.type,
    ...(source.detail !== undefined && { detail: source.detail }),
    date: serializeDate(source.date),
  };
}

function serializeSkill(skill: Skill): object {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    ...(skill.description !== undefined && { description: skill.description }),
    domainId: skill.domainId,
    categoryId: skill.categoryId,
    proficiency: skill.proficiency,
    proficiencyLabel: skill.proficiencyLabel ?? null,
    sources: skill.sources.map(serializeSkillSource),
    ...(skill.notes !== undefined && { notes: skill.notes }),
    visibility: skill.visibility,
    featured: skill.featured,
    privateFields: skill.privateFields,
    createdAt: serializeDate(skill.createdAt),
    updatedAt: serializeDate(skill.updatedAt),
  };
}

function serializeProgress(progress: Progress): object {
  return {
    percentage: progress.percentage,
    updatedAt: serializeDate(progress.updatedAt),
    ...(progress.note !== undefined && { note: progress.note }),
  };
}

function serializeResource(resource: Resource): object {
  return {
    title: resource.title,
    ...(resource.url !== undefined && { url: resource.url }),
    type: resource.type,
    completed: resource.completed,
  };
}

function serializeGoal(goal: LearningGoal): object {
  return {
    id: goal.id,
    name: goal.name,
    domainId: goal.domainId,
    ...(goal.description !== undefined && { description: goal.description }),
    ...(goal.motivation !== undefined && { motivation: goal.motivation }),
    ...(goal.notes !== undefined && { notes: goal.notes }),
    priority: goal.priority,
    status: goal.status,
    progress: goal.progress.map(serializeProgress),
    resources: goal.resources.map(serializeResource),
    ...(goal.targetDate !== undefined && { targetDate: serializeDate(goal.targetDate) }),
    visibility: goal.visibility,
    featured: goal.featured,
    privateFields: goal.privateFields,
    createdAt: serializeDate(goal.createdAt),
    updatedAt: serializeDate(goal.updatedAt),
  };
}

function serializeCategory(category: Category): object {
  return {
    id: category.id,
    slug: category.slug,
    name: category.name,
    ...(category.description !== undefined && { description: category.description }),
    createdAt: serializeDate(category.createdAt),
    updatedAt: serializeDate(category.updatedAt),
  };
}

function serializeDomain(domain: Domain): object {
  return {
    id: domain.id,
    slug: domain.slug,
    name: domain.name,
    ...(domain.description !== undefined && { description: domain.description }),
    categories: domain.categories.map(serializeCategory),
    isBuiltIn: domain.isBuiltIn,
    visibility: domain.visibility,
    ...(domain.proficiencyLabels !== undefined && { proficiencyLabels: domain.proficiencyLabels }),
    createdAt: serializeDate(domain.createdAt),
    updatedAt: serializeDate(domain.updatedAt),
  };
}

function serializeInterest(interest: Interest): object {
  return {
    id: interest.id,
    name: interest.name,
    domainId: interest.domainId,
    ...(interest.description !== undefined && { description: interest.description }),
    ...(interest.notes !== undefined && { notes: interest.notes }),
    visibility: interest.visibility,
    featured: interest.featured,
    createdAt: serializeDate(interest.createdAt),
    updatedAt: serializeDate(interest.updatedAt),
  };
}

function serializeProject(project: Project): object {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    ...(project.description !== undefined && { description: project.description }),
    ...(project.url !== undefined && { url: project.url }),
    ...(project.role !== undefined && { role: project.role }),
    status: project.status,
    priority: project.priority,
    featured: project.featured,
    skillIds: project.skillIds,
    highlights: project.highlights,
    ...(project.notes !== undefined && { notes: project.notes }),
    ...(project.startDate !== undefined && { startDate: serializeDate(project.startDate) }),
    ...(project.endDate !== undefined && { endDate: serializeDate(project.endDate) }),
    visibility: project.visibility,
    privateFields: project.privateFields,
    createdAt: serializeDate(project.createdAt),
    updatedAt: serializeDate(project.updatedAt),
  };
}

function serializeSettings(settings: ProfileSettings): object {
  return {
    ...(settings.defaultDomainId !== undefined && {
      defaultDomainId: settings.defaultDomainId,
    }),
  };
}

/**
 * Serialize a Profile to a plain object suitable for JSON.stringify().
 * Converts Date objects to ISO strings.
 */
export function serializeProfile(profile: Profile): object {
  return {
    id: profile.id,
    name: profile.name,
    ...(profile.bio !== undefined && { bio: profile.bio }),
    ...(profile.preferredLanguage !== undefined && { preferredLanguage: profile.preferredLanguage }),
    ...(profile.customInstructions !== undefined && { customInstructions: profile.customInstructions }),
    settings: serializeSettings(profile.settings),
    domains: profile.domains.map(serializeDomain),
    skills: profile.skills.map(serializeSkill),
    goals: profile.goals.map(serializeGoal),
    interests: profile.interests.map(serializeInterest),
    projects: profile.projects.map(serializeProject),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}
