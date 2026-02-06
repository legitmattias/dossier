import {
  getSkillFreshness,
  isProficiency,
  toCategoryId,
  toDomainId,
} from "../../domain/index.js";
import type { Skill } from "../../domain/index.js";
import type { ListSkillsInput, ListSkillsOutput } from "../dtos/skill-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toSkillOutput } from "../helpers/mappers.js";
import { validateProficiency } from "../helpers/validation.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface ListSkillsDeps {
  readonly profileRepository: IProfileRepository;
}

export async function listSkills(
  deps: ListSkillsDeps,
  input: ListSkillsInput = {},
): Promise<ListSkillsOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  let skills: readonly Skill[] = profile.skills;

  if (input.domainId !== undefined) {
    const domainId = toDomainId(input.domainId);
    skills = skills.filter((s) => s.domainId === domainId);
  }

  if (input.categoryId !== undefined) {
    const categoryId = toCategoryId(input.categoryId);
    skills = skills.filter((s) => s.categoryId === categoryId);
  }

  if (input.proficiency !== undefined) {
    const proficiency = validateProficiency(input.proficiency);
    skills = skills.filter((s) => s.proficiency === proficiency);
  }

  if (input.minFreshness !== undefined) {
    const now = new Date();
    skills = skills.filter(
      (s) => getSkillFreshness(s, now) >= input.minFreshness!,
    );
  }

  return { skills: skills.map(toSkillOutput) };
}
