import { InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId, DomainId, SkillId } from "../value-objects/identifiers.js";
import type { Proficiency } from "../value-objects/proficiency.js";
import type { Slug } from "../value-objects/slug.js";

export interface SkillSource {
  readonly type: "self-reported" | "assessed" | "inferred";
  readonly detail?: string;
  readonly date: Date;
}

export interface SkillUsage {
  readonly context: string;
  readonly lastUsed: Date;
  readonly frequency?: "daily" | "weekly" | "monthly" | "rarely";
}

export interface Skill {
  readonly id: SkillId;
  readonly slug: Slug;
  readonly name: string;
  readonly domainId: DomainId;
  readonly categoryId: CategoryId;
  readonly proficiency: Proficiency;
  readonly sources: readonly SkillSource[];
  readonly usage: readonly SkillUsage[];
  readonly notes?: string;
  readonly visibility: "public" | "private";
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSkillInput {
  readonly id: SkillId;
  readonly slug: Slug;
  readonly name: string;
  readonly domainId: DomainId;
  readonly categoryId: CategoryId;
  readonly proficiency: Proficiency;
  readonly sources?: readonly SkillSource[];
  readonly usage?: readonly SkillUsage[];
  readonly notes?: string;
  readonly visibility?: "public" | "private";
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createSkill(input: CreateSkillInput): Readonly<Skill> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Skill", input.name);
  }

  const now = new Date();
  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    domainId: input.domainId,
    categoryId: input.categoryId,
    proficiency: input.proficiency,
    sources: input.sources ?? [],
    usage: input.usage ?? [],
    ...(input.notes !== undefined && { notes: input.notes }),
    visibility: input.visibility ?? "public",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export type UpdateSkillInput = Partial<
  Pick<Skill, "name" | "proficiency" | "notes" | "visibility">
> & {
  readonly addSources?: readonly SkillSource[];
  readonly addUsage?: readonly SkillUsage[];
};

export function updateSkill(skill: Skill, updates: UpdateSkillInput): Readonly<Skill> {
  const name = updates.name !== undefined ? updates.name.trim() : skill.name;
  if (name.length === 0) {
    throw new InvalidNameError("Skill", updates.name ?? "");
  }

  return {
    ...skill,
    name,
    proficiency: updates.proficiency ?? skill.proficiency,
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    visibility: updates.visibility ?? skill.visibility,
    sources: updates.addSources
      ? [...skill.sources, ...updates.addSources]
      : skill.sources,
    usage: updates.addUsage ? [...skill.usage, ...updates.addUsage] : skill.usage,
    updatedAt: new Date(),
  };
}

/**
 * Returns a freshness score (0-1) based on the most recent usage date.
 * 1.0 = used today, decays toward 0 over the given halfLifeDays (default 90).
 * Returns 0 if the skill has no usage records.
 */
export function getSkillFreshness(
  skill: Skill,
  now: Date = new Date(),
  halfLifeDays: number = 90,
): number {
  if (skill.usage.length === 0) {
    return 0;
  }

  const mostRecent = skill.usage.reduce((latest, u) =>
    u.lastUsed > latest.lastUsed ? u : latest,
  );

  const daysSinceUse =
    (now.getTime() - mostRecent.lastUsed.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceUse <= 0) return 1;

  // Exponential decay: freshness = 2^(-days / halfLife)
  return Math.pow(2, -daysSinceUse / halfLifeDays);
}
