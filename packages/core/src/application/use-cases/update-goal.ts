import {
  findGoalInProfile,
  updateGoalInProfile,
  toGoalId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toGoalOutput } from "../helpers/mappers.js";
import type { GoalOutput } from "../dtos/goal-dtos.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateGoalDeps {
  readonly profileRepository: IProfileRepository;
}

export interface UpdateGoalInput {
  readonly goalId: string;
  readonly name?: string;
  readonly description?: string;
  readonly motivation?: string;
  readonly notes?: string;
  readonly priority?: string;
  readonly status?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
}

export interface UpdateGoalOutput {
  readonly goal: GoalOutput;
}

export async function updateGoal(
  deps: UpdateGoalDeps,
  input: UpdateGoalInput,
): Promise<UpdateGoalOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const goalId = toGoalId(input.goalId);
  const goal = findGoalInProfile(profile, goalId);

  const updatedGoal = {
    ...goal,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.motivation !== undefined && { motivation: input.motivation }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.priority !== undefined && { priority: input.priority as typeof goal.priority }),
    ...(input.status !== undefined && { status: input.status as typeof goal.status }),
    ...(input.visibility !== undefined && { visibility: input.visibility as typeof goal.visibility }),
    ...(input.featured !== undefined && { featured: input.featured }),
    updatedAt: new Date(),
  };

  const updatedProfile = updateGoalInProfile(profile, goalId, updatedGoal);
  await deps.profileRepository.save(updatedProfile);

  return { goal: toGoalOutput(updatedGoal) };
}
