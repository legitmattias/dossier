import type { GoalStatus, Progress, Resource } from "../../domain/index.js";

// --- Input DTOs ---

export interface AddGoalInput {
  readonly name: string;
  readonly domainId: string;
  readonly description?: string;
  readonly motivation?: string;
  readonly notes?: string;
  readonly priority?: string;
  readonly status?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
  readonly resources?: readonly Resource[];
  readonly targetDate?: string | Date;
}

export interface UpdateGoalProgressInput {
  readonly goalId: string;
  readonly percentage: number;
  readonly note?: string;
}

export interface CompleteGoalInput {
  readonly goalId: string;
  readonly categoryId: string;
  readonly proficiency?: string;
}

export interface DemoteGoalInput {
  readonly goalId: string;
}

// --- Output DTOs ---

export interface GoalOutput {
  readonly id: string;
  readonly name: string;
  readonly domainId: string;
  readonly description?: string;
  readonly motivation?: string;
  readonly notes?: string;
  readonly priority: string;
  readonly visibility: string;
  readonly featured: boolean;
  readonly status: GoalStatus;
  readonly progress: readonly Progress[];
  readonly resources: readonly Resource[];
  readonly targetDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AddGoalOutput {
  readonly goal: GoalOutput;
}

export interface UpdateGoalProgressOutput {
  readonly goal: GoalOutput;
}

export interface CompleteGoalOutput {
  readonly goal: GoalOutput;
  readonly skill: import("./skill-dtos.js").SkillOutput;
}

export interface DemoteGoalOutput {
  readonly interest: import("./interest-dtos.js").InterestOutput;
}
