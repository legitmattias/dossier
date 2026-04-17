import { InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId, DomainId, SkillId } from "../value-objects/identifiers.js";
import type { Proficiency } from "../value-objects/proficiency.js";
import type { Slug } from "../value-objects/slug.js";

export interface SkillSource {
  readonly type: "self-reported" | "assessed" | "inferred";
  readonly detail?: string;
  readonly date: Date;
}

export interface Skill {
  readonly id: SkillId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly domainId: DomainId;
  readonly categoryId: CategoryId;
  readonly proficiency: Proficiency;
  readonly proficiencyLabel?: string;
  readonly sources: readonly SkillSource[];
  readonly notes?: string;
  readonly visibility: "public" | "private";
  readonly featured: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSkillInput {
  readonly id: SkillId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly domainId: DomainId;
  readonly categoryId: CategoryId;
  readonly proficiency: Proficiency;
  readonly proficiencyLabel?: string;
  readonly sources?: readonly SkillSource[];
  readonly notes?: string;
  readonly visibility?: "public" | "private";
  readonly featured?: boolean;
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
    ...(input.description !== undefined && { description: input.description }),
    domainId: input.domainId,
    categoryId: input.categoryId,
    proficiency: input.proficiency,
    ...(input.proficiencyLabel !== undefined && { proficiencyLabel: input.proficiencyLabel }),
    sources: input.sources ?? [],
    ...(input.notes !== undefined && { notes: input.notes }),
    visibility: input.visibility ?? "public",
    featured: input.featured ?? false,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export type UpdateSkillInput = Partial<
  Pick<Skill, "name" | "description" | "domainId" | "categoryId" | "proficiency" | "proficiencyLabel" | "notes" | "visibility" | "featured">
> & {
  readonly addSources?: readonly SkillSource[];
};

export function updateSkill(skill: Skill, updates: UpdateSkillInput): Readonly<Skill> {
  const name = updates.name !== undefined ? updates.name.trim() : skill.name;
  if (name.length === 0) {
    throw new InvalidNameError("Skill", updates.name ?? "");
  }

  return {
    ...skill,
    name,
    ...(updates.description !== undefined ? { description: updates.description } : {}),
    domainId: updates.domainId ?? skill.domainId,
    categoryId: updates.categoryId ?? skill.categoryId,
    proficiency: updates.proficiency ?? skill.proficiency,
    ...(updates.proficiencyLabel !== undefined ? { proficiencyLabel: updates.proficiencyLabel } : {}),
    ...(updates.notes !== undefined ? { notes: updates.notes } : {}),
    visibility: updates.visibility ?? skill.visibility,
    featured: updates.featured ?? skill.featured,
    sources: updates.addSources
      ? [...skill.sources, ...updates.addSources]
      : skill.sources,
    updatedAt: new Date(),
  };
}
