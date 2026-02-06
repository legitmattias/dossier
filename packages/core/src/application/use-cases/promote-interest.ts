import {
  addGoalToProfile,
  createLearningGoal,
  findInterestInProfile,
  removeInterestFromProfile,
  toDomainId,
  toGoalId,
  toInterestId,
} from "../../domain/index.js";
import type { PromoteInterestInput, PromoteInterestOutput } from "../dtos/interest-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import { validatePriority } from "../helpers/validation.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface PromoteInterestDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function promoteInterest(
  deps: PromoteInterestDeps,
  input: PromoteInterestInput,
): Promise<PromoteInterestOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const interestId = toInterestId(input.interestId);
  const interest = findInterestInProfile(profile, interestId);

  const priority = input.priority !== undefined
    ? validatePriority(input.priority)
    : undefined;

  const targetDate = input.targetDate !== undefined
    ? (input.targetDate instanceof Date ? input.targetDate : new Date(input.targetDate))
    : undefined;

  const goalId = toGoalId(deps.idGenerator.generate("goal"));
  const domainId = toDomainId(interest.domainId);

  const goal = createLearningGoal({
    id: goalId,
    name: interest.name,
    domainId,
    description: input.description ?? interest.description,
    priority,
    targetDate,
  });

  // Remove interest and add goal
  let updatedProfile = removeInterestFromProfile(profile, interestId);
  updatedProfile = addGoalToProfile(updatedProfile, goal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(goal) };
}
