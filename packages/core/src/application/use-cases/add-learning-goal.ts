import {
  addGoalToProfile,
  createLearningGoal,
  findDomainInProfile,
  toDomainId,
  toGoalId,
} from "../../domain/index.js";
import type { AddGoalInput, AddGoalOutput } from "../dtos/goal-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import { validatePriority } from "../helpers/validation.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddLearningGoalDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function addLearningGoal(
  deps: AddLearningGoalDeps,
  input: AddGoalInput,
): Promise<AddGoalOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const domainId = toDomainId(input.domainId);
  // Validate domain exists in profile
  findDomainInProfile(profile, domainId);

  const priority = input.priority !== undefined
    ? validatePriority(input.priority)
    : undefined;

  const targetDate = input.targetDate !== undefined
    ? (input.targetDate instanceof Date ? input.targetDate : new Date(input.targetDate))
    : undefined;

  const goalId = toGoalId(deps.idGenerator.generate("goal"));

  const goal = createLearningGoal({
    id: goalId,
    name: input.name,
    domainId,
    description: input.description,
    motivation: input.motivation,
    priority,
    resources: input.resources,
    targetDate,
    visibility: input.visibility as "public" | "private" | undefined,
    featured: input.featured,
  });

  const updatedProfile = addGoalToProfile(profile, goal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(goal) };
}
