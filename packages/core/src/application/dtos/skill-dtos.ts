import type { SkillSource } from "../../domain/index.js";

// --- Input DTOs (plain strings, no branded types) ---

export interface AddSkillInput {
  readonly name: string;
  readonly description?: string;
  readonly domainId: string;
  readonly categoryId: string;
  readonly proficiency: string;
  readonly proficiencyLabel?: string;
  readonly sources?: readonly SkillSource[];
  readonly notes?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
}

export interface UpdateSkillInput {
  readonly skillId: string;
  readonly name?: string;
  readonly domainId?: string;
  readonly categoryId?: string;
  readonly description?: string;
  readonly proficiency?: string;
  readonly proficiencyLabel?: string;
  readonly notes?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
  readonly addSources?: readonly SkillSource[];
}

export interface RemoveSkillInput {
  readonly skillId: string;
}

export interface ListSkillsInput {
  readonly domainId?: string;
  readonly categoryId?: string;
  readonly proficiency?: string;
}

// --- Output DTOs (plain types, ISO date strings) ---

export interface SkillOutput {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly domainId: string;
  readonly categoryId: string;
  readonly proficiency: string;
  readonly proficiencyLabel?: string;
  readonly sources: readonly SkillSource[];
  readonly notes?: string;
  readonly visibility: string;
  readonly featured: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AddSkillOutput {
  readonly skill: SkillOutput;
}

export interface UpdateSkillOutput {
  readonly skill: SkillOutput;
}

export interface RemoveSkillOutput {
  readonly removed: true;
}

export interface ListSkillsOutput {
  readonly skills: readonly SkillOutput[];
}
