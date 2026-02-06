import {
  addSkillToProfile,
  createSkill,
  findCategoryInDomain,
  findDomainInProfile,
  toCategoryId,
  toDomainId,
  toSkillId,
} from "../../domain/index.js";
import type { AddSkillInput, AddSkillOutput } from "../dtos/skill-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toSkillOutput } from "../helpers/mappers.js";
import { slugify } from "../helpers/slugify.js";
import { validateProficiency } from "../helpers/validation.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddSkillDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function addSkill(
  deps: AddSkillDeps,
  input: AddSkillInput,
): Promise<AddSkillOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const proficiency = validateProficiency(input.proficiency);
  const domainId = toDomainId(input.domainId);
  const categoryId = toCategoryId(input.categoryId);

  // Validate domain and category exist in profile
  const domain = findDomainInProfile(profile, domainId);
  findCategoryInDomain(domain, categoryId);

  const skillId = toSkillId(deps.idGenerator.generate("skill"));
  const slug = slugify(input.name);

  const skill = createSkill({
    id: skillId,
    slug,
    name: input.name,
    domainId,
    categoryId,
    proficiency,
    sources: input.sources,
    usage: input.usage,
    notes: input.notes,
  });

  const updatedProfile = addSkillToProfile(profile, skill);
  await deps.profileRepository.save(updatedProfile);

  return { skill: toSkillOutput(skill) };
}
