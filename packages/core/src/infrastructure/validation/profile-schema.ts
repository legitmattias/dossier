import { z } from "zod";

import type { Category } from "../../domain/entities/category.js";
import type { Domain } from "../../domain/entities/domain-entity.js";
import type { Interest } from "../../domain/entities/interest.js";
import type {
  GoalStatus,
  LearningGoal,
  Priority,
  Progress,
  Resource,
} from "../../domain/entities/learning-goal.js";
import type { Profile, ProfileSettings } from "../../domain/entities/profile.js";
import type { Skill, SkillSource, SkillUsage } from "../../domain/entities/skill.js";
import { PROFICIENCY_LEVELS } from "../../domain/value-objects/proficiency.js";

// --- Sub-schemas ---

const skillSourceSchema = z.object({
  type: z.literal(["self-reported", "assessed", "inferred"]),
  detail: z.string().optional(),
  date: z.coerce.date(),
});

const skillUsageSchema = z.object({
  context: z.string(),
  lastUsed: z.coerce.date(),
  frequency: z.literal(["daily", "weekly", "monthly", "rarely"]).optional(),
});

const skillSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  domainId: z.string().min(1),
  categoryId: z.string().min(1),
  proficiency: z.literal([...PROFICIENCY_LEVELS]),
  sources: z.array(skillSourceSchema),
  usage: z.array(skillUsageSchema),
  notes: z.string().optional(),
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
  priority: z.literal(["low", "medium", "high"]),
  status: z.literal(["active", "paused", "completed", "abandoned"]),
  progress: z.array(progressSchema),
  resources: z.array(resourceSchema),
  targetDate: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
});

const domainSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categories: z.array(categorySchema),
  isBuiltIn: z.boolean(),
});

const interestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domainId: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.coerce.date(),
});

const profileSettingsSchema = z.object({
  defaultDomainId: z.string().min(1).optional(),
});

const profileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  settings: profileSettingsSchema,
  domains: z.array(domainSchema),
  skills: z.array(skillSchema),
  goals: z.array(learningGoalSchema),
  interests: z.array(interestSchema),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Parse and validate raw JSON data into a Profile.
 * Zod coerces ISO date strings into Date objects.
 * Branded types are compile-time only, so casting after Zod validation is safe.
 */
export function parseProfile(json: unknown): Profile {
  return profileSchema.parse(json) as unknown as Profile;
}

// --- Serialization helpers ---

function serializeDate(date: Date): string {
  return date.toISOString();
}

function serializeSkillSource(source: SkillSource): object {
  return {
    type: source.type,
    ...(source.detail !== undefined && { detail: source.detail }),
    date: serializeDate(source.date),
  };
}

function serializeSkillUsage(usage: SkillUsage): object {
  return {
    context: usage.context,
    lastUsed: serializeDate(usage.lastUsed),
    ...(usage.frequency !== undefined && { frequency: usage.frequency }),
  };
}

function serializeSkill(skill: Skill): object {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    domainId: skill.domainId,
    categoryId: skill.categoryId,
    proficiency: skill.proficiency,
    sources: skill.sources.map(serializeSkillSource),
    usage: skill.usage.map(serializeSkillUsage),
    ...(skill.notes !== undefined && { notes: skill.notes }),
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
    priority: goal.priority,
    status: goal.status,
    progress: goal.progress.map(serializeProgress),
    resources: goal.resources.map(serializeResource),
    ...(goal.targetDate !== undefined && { targetDate: serializeDate(goal.targetDate) }),
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
  };
}

function serializeInterest(interest: Interest): object {
  return {
    id: interest.id,
    name: interest.name,
    domainId: interest.domainId,
    ...(interest.description !== undefined && { description: interest.description }),
    createdAt: serializeDate(interest.createdAt),
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
    settings: serializeSettings(profile.settings),
    domains: profile.domains.map(serializeDomain),
    skills: profile.skills.map(serializeSkill),
    goals: profile.goals.map(serializeGoal),
    interests: profile.interests.map(serializeInterest),
    createdAt: serializeDate(profile.createdAt),
    updatedAt: serializeDate(profile.updatedAt),
  };
}
