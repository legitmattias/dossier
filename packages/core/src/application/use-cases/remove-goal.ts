import {
  removeGoalFromProfile,
  toGoalId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveGoalDeps {
  readonly profileRepository: IProfileRepository;
}

export interface RemoveGoalInput {
  readonly goalId: string;
}

export async function removeGoal(
  deps: RemoveGoalDeps,
  input: RemoveGoalInput,
): Promise<{ removed: true }> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const goalId = toGoalId(input.goalId);
  const updated = removeGoalFromProfile(profile, goalId);
  await deps.profileRepository.save(updated);

  return { removed: true };
}
