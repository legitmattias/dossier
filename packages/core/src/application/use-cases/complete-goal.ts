import {
  addSkillToProfile,
  completeGoal as domainCompleteGoal,
  createSkill,
  findCategoryInDomain,
  findDomainInProfile,
  findGoalInProfile,
  toCategoryId,
  toDomainId,
  toGoalId,
  toSkillId,
  updateGoalInProfile,
} from "../../domain/index.js";
import type { CompleteGoalInput, CompleteGoalOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import { toSkillOutput } from "../helpers/mappers.js";
import { slugify } from "../helpers/slugify.js";
import { validateProficiency } from "../helpers/validation.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface CompleteGoalDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function completeGoal(
  deps: CompleteGoalDeps,
  input: CompleteGoalInput,
): Promise<CompleteGoalOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const goalId = toGoalId(input.goalId);
  const goal = findGoalInProfile(profile, goalId);

  // Complete the goal via domain function
  const completedGoal = domainCompleteGoal(goal);

  // Create a new skill from the completed goal
  const categoryId = toCategoryId(input.categoryId);
  const domainId = toDomainId(goal.domainId);

  // Validate category exists in the goal's domain
  const domain = findDomainInProfile(profile, domainId);
  findCategoryInDomain(domain, categoryId);

  const proficiency = input.proficiency !== undefined
    ? validateProficiency(input.proficiency)
    : validateProficiency("learning");

  const skillId = toSkillId(deps.idGenerator.generate("skill"));
  const slug = slugify(goal.name);

  const skill = createSkill({
    id: skillId,
    slug,
    name: goal.name,
    domainId,
    categoryId,
    proficiency,
    sources: [{ type: "self-reported", detail: "Completed learning goal", date: new Date() }],
  });

  // Update profile with both changes
  let updatedProfile = updateGoalInProfile(profile, goalId, completedGoal);
  updatedProfile = addSkillToProfile(updatedProfile, skill);
  await deps.profileRepository.save(updatedProfile);

  return {
    goal: toGoalOutput(completedGoal),
    skill: toSkillOutput(skill),
  };
}
