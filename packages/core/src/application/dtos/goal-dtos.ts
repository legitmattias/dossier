import type { GoalStatus, Progress, ResourceType } from "../../domain/index.js";

// --- Input DTOs ---

export interface ResourceInput {
  readonly title: string;
  readonly url?: string;
  readonly type: string;
  readonly completed?: boolean;
}

export interface AddResourceInput {
  readonly goalId: string;
  readonly title: string;
  readonly url?: string;
  readonly type: string;
  readonly completed?: boolean;
}

export interface UpdateResourceInput {
  readonly goalId: string;
  readonly resourceId: string;
  readonly title?: string;
  readonly url?: string;
  readonly type?: string;
  readonly completed?: boolean;
}

export interface RemoveResourceInput {
  readonly goalId: string;
  readonly resourceId: string;
}

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
  readonly resources?: readonly ResourceInput[];
  readonly targetDate?: string | Date;
  readonly privateFields?: readonly string[];
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

export interface ResourceOutput {
  readonly id: string;
  readonly title: string;
  readonly url?: string;
  readonly type: ResourceType;
  readonly completed: boolean;
}

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
  readonly resources: readonly ResourceOutput[];
  readonly targetDate?: string;
  readonly privateFields: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AddResourceOutput {
  readonly goal: GoalOutput;
  readonly resource: ResourceOutput;
}

export interface UpdateResourceOutput {
  readonly goal: GoalOutput;
  readonly resource: ResourceOutput;
}

export interface RemoveResourceOutput {
  readonly goal: GoalOutput;
  readonly removed: true;
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
