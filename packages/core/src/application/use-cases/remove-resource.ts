import {
  findGoalInProfile,
  removeResourceFromGoal,
  toGoalId,
  toResourceId,
  updateGoalInProfile,
} from "../../domain/index.js";
import type { RemoveResourceInput, RemoveResourceOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveResourceDeps {
  readonly profileRepository: IProfileRepository;
}

export async function removeResource(
  deps: RemoveResourceDeps,
  input: RemoveResourceInput,
): Promise<RemoveResourceOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const goalId = toGoalId(input.goalId);
  const resourceId = toResourceId(input.resourceId);
  const goal = findGoalInProfile(profile, goalId);

  const updatedGoal = removeResourceFromGoal(goal, resourceId);
  const updatedProfile = updateGoalInProfile(profile, goalId, updatedGoal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(updatedGoal), removed: true };
}
