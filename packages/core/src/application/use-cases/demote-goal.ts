import {
  addInterestToProfile,
  createInterest,
  findGoalInProfile,
  removeGoalFromProfile,
  toGoalId,
  toInterestId,
} from "../../domain/index.js";
import type { DemoteGoalInput, DemoteGoalOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toInterestOutput } from "../helpers/mappers.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface DemoteGoalDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

/**
 * Demote a LearningGoal to an Interest.
 * Preserves: name, domainId, description, notes, visibility, featured.
 * Drops: priority, status, progress, resources, motivation, targetDate.
 */
export async function demoteGoal(
  deps: DemoteGoalDeps,
  input: DemoteGoalInput,
): Promise<DemoteGoalOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const goalId = toGoalId(input.goalId);
  const goal = findGoalInProfile(profile, goalId);

  const interestId = toInterestId(deps.idGenerator.generate("interest"));
  const interest = createInterest({
    id: interestId,
    name: goal.name,
    domainId: goal.domainId,
    description: goal.description,
    notes: goal.notes,
    visibility: goal.visibility,
    featured: goal.featured,
  });

  let updatedProfile = removeGoalFromProfile(profile, goalId);
  updatedProfile = addInterestToProfile(updatedProfile, interest);
  await deps.profileRepository.save(updatedProfile);

  return { interest: toInterestOutput(interest) };
}
