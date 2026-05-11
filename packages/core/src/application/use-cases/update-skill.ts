import {
  findSkillInProfile,
  toDomainId,
  toCategoryId,
  toSkillId,
  updateSkill as domainUpdateSkill,
  updateSkillInProfile,
} from "../../domain/index.js";
import type { UpdateSkillInput, UpdateSkillOutput } from "../dtos/skill-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toSkillOutput } from "../helpers/mappers.js";
import { validateProficiency } from "../helpers/validation.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateSkillDeps {
  readonly profileRepository: IProfileRepository;
}

export async function updateSkill(
  deps: UpdateSkillDeps,
  input: UpdateSkillInput,
): Promise<UpdateSkillOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const skillId = toSkillId(input.skillId);
  const skill = findSkillInProfile(profile, skillId);

  const proficiency = input.proficiency !== undefined
    ? validateProficiency(input.proficiency)
    : undefined;

  const updatedSkill = domainUpdateSkill(skill, {
    name: input.name,
    description: input.description,
    domainId: input.domainId ? toDomainId(input.domainId) : undefined,
    categoryId: input.categoryId ? toCategoryId(input.categoryId) : undefined,
    proficiency,
    proficiencyLabel: input.proficiencyLabel,
    notes: input.notes,
    visibility: input.visibility as "public" | "private" | undefined,
    featured: input.featured,
    addSources: input.addSources,
    privateFields: input.privateFields,
  });

  const updatedProfile = updateSkillInProfile(profile, skillId, updatedSkill);
  await deps.profileRepository.save(updatedProfile);

  return { skill: toSkillOutput(updatedSkill) };
}
