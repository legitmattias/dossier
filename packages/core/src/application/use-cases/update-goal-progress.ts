import {
  findGoalInProfile,
  toGoalId,
  updateGoalInProfile,
  updateGoalProgress as domainUpdateGoalProgress,
} from "../../domain/index.js";
import type { UpdateGoalProgressInput, UpdateGoalProgressOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateGoalProgressDeps {
  readonly profileRepository: IProfileRepository;
}

export async function updateGoalProgress(
  deps: UpdateGoalProgressDeps,
  input: UpdateGoalProgressInput,
): Promise<UpdateGoalProgressOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const goalId = toGoalId(input.goalId);
  const goal = findGoalInProfile(profile, goalId);

  const updatedGoal = domainUpdateGoalProgress(goal, input.percentage, input.note);

  const updatedProfile = updateGoalInProfile(profile, goalId, updatedGoal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(updatedGoal) };
}
