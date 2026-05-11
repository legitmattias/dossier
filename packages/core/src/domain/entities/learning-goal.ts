import { InvalidNameError } from "../errors/domain-errors.js";
import type { DomainId, GoalId } from "../value-objects/identifiers.js";

export type Priority = "low" | "medium" | "high";
export type GoalStatus = "active" | "paused" | "completed" | "abandoned";

export const GOAL_PRIVATE_ELIGIBLE_FIELDS = [
  "motivation",
  "priority",
  "status",
  "targetDate",
  "progress",
  "resources",
] as const;
export type GoalPrivateField = (typeof GOAL_PRIVATE_ELIGIBLE_FIELDS)[number];

function validateGoalPrivateFields(fields: readonly string[]): readonly GoalPrivateField[] {
  for (const f of fields) {
    if (!GOAL_PRIVATE_ELIGIBLE_FIELDS.includes(f as GoalPrivateField)) {
      throw new InvalidNameError(
        "LearningGoal.privateFields",
        `${f} is not allowed. Allowed: ${GOAL_PRIVATE_ELIGIBLE_FIELDS.join(", ")}`,
      );
    }
  }
  return fields as readonly GoalPrivateField[];
}

export interface Progress {
  readonly percentage: number; // 0-100
  readonly updatedAt: Date;
  readonly note?: string;
}

export interface Resource {
  readonly title: string;
  readonly url?: string;
  readonly type: "article" | "video" | "course" | "book" | "documentation" | "other";
  readonly completed: boolean;
}

export interface LearningGoal {
  readonly id: GoalId;
  readonly name: string;
  readonly domainId: DomainId;
  readonly description?: string;
  readonly motivation?: string;
  readonly notes?: string;
  readonly priority: Priority;
  readonly status: GoalStatus;
  readonly progress: readonly Progress[];
  readonly resources: readonly Resource[];
  readonly targetDate?: Date;
  readonly visibility: "public" | "private";
  readonly featured: boolean;
  readonly privateFields: readonly GoalPrivateField[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateLearningGoalInput {
  readonly id: GoalId;
  readonly name: string;
  readonly domainId: DomainId;
  readonly description?: string;
  readonly motivation?: string;
  readonly notes?: string;
  readonly priority?: Priority;
  readonly status?: GoalStatus;
  readonly resources?: readonly Resource[];
  readonly targetDate?: Date;
  readonly visibility?: "public" | "private";
  readonly featured?: boolean;
  readonly privateFields?: readonly string[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createLearningGoal(input: CreateLearningGoalInput): Readonly<LearningGoal> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("LearningGoal", input.name);
  }

  const now = new Date();
  // Default goal privacy: progress history is private unless the user opts in to publishing.
  // Per-update granularity is rarely meant for public consumption.
  const defaultPrivate: readonly GoalPrivateField[] = ["progress"];
  return {
    id: input.id,
    name: input.name.trim(),
    domainId: input.domainId,
    ...(input.description !== undefined && { description: input.description }),
    ...(input.motivation !== undefined && { motivation: input.motivation }),
    ...(input.notes !== undefined && { notes: input.notes }),
    priority: input.priority ?? "medium",
    status: input.status ?? "active",
    progress: [],
    resources: input.resources ?? [],
    ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
    visibility: input.visibility ?? "public",
    featured: input.featured ?? false,
    privateFields: input.privateFields !== undefined
      ? validateGoalPrivateFields(input.privateFields)
      : defaultPrivate,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

export function updateGoalProgress(
  goal: LearningGoal,
  percentage: number,
  note?: string,
): Readonly<LearningGoal> {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const entry: Progress = {
    percentage: clampedPercentage,
    updatedAt: new Date(),
    ...(note !== undefined && { note }),
  };

  return {
    ...goal,
    progress: [...goal.progress, entry],
    updatedAt: new Date(),
  };
}

export function completeGoal(goal: LearningGoal): Readonly<LearningGoal> {
  const now = new Date();
  const completionEntry: Progress = {
    percentage: 100,
    updatedAt: now,
    note: "Goal completed",
  };

  return {
    ...goal,
    status: "completed",
    progress: [...goal.progress, completionEntry],
    updatedAt: now,
  };
}
