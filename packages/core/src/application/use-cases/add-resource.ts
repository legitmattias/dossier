import {
  addResourceToGoal,
  createResource,
  findGoalInProfile,
  toGoalId,
  toResourceId,
  updateGoalInProfile,
} from "../../domain/index.js";
import type { ResourceType } from "../../domain/index.js";
import type { AddResourceInput, AddResourceOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput, toResourceOutput } from "../helpers/mappers.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddResourceDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function addResource(
  deps: AddResourceDeps,
  input: AddResourceInput,
): Promise<AddResourceOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const goalId = toGoalId(input.goalId);
  const goal = findGoalInProfile(profile, goalId);

  const resource = createResource({
    id: toResourceId(deps.idGenerator.generate("resource")),
    title: input.title,
    url: input.url,
    type: input.type as ResourceType,
    completed: input.completed,
  });

  const updatedGoal = addResourceToGoal(goal, resource);
  const updatedProfile = updateGoalInProfile(profile, goalId, updatedGoal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(updatedGoal), resource: toResourceOutput(resource) };
}
