import {
  findGoalInProfile,
  toGoalId,
  toResourceId,
  updateGoalInProfile,
  updateResourceInGoal,
} from "../../domain/index.js";
import type { ResourceType } from "../../domain/index.js";
import type { UpdateResourceInput, UpdateResourceOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput, toResourceOutput } from "../helpers/mappers.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateResourceDeps {
  readonly profileRepository: IProfileRepository;
}

export async function updateResource(
  deps: UpdateResourceDeps,
  input: UpdateResourceInput,
): Promise<UpdateResourceOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const goalId = toGoalId(input.goalId);
  const resourceId = toResourceId(input.resourceId);
  const goal = findGoalInProfile(profile, goalId);

  const updatedGoal = updateResourceInGoal(goal, resourceId, {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.url !== undefined && { url: input.url }),
    ...(input.type !== undefined && { type: input.type as ResourceType }),
    ...(input.completed !== undefined && { completed: input.completed }),
  });

  const updatedResource = updatedGoal.resources.find((r) => r.id === resourceId)!;

  const updatedProfile = updateGoalInProfile(profile, goalId, updatedGoal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(updatedGoal), resource: toResourceOutput(updatedResource) };
}
