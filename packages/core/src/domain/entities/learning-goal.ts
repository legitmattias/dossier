import { InvalidNameError } from "../errors/domain-errors.js";
import type { DomainId, GoalId, ResourceId } from "../value-objects/identifiers.js";

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

export const RESOURCE_TYPES = [
  "article",
  "video",
  "course",
  "book",
  "documentation",
  "other",
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export interface Resource {
  readonly id: ResourceId;
  readonly title: string;
  readonly url?: string;
  readonly type: ResourceType;
  readonly completed: boolean;
}

export interface CreateResourceInput {
  readonly id: ResourceId;
  readonly title: string;
  readonly url?: string;
  readonly type: ResourceType;
  readonly completed?: boolean;
}

export function createResource(input: CreateResourceInput): Readonly<Resource> {
  if (input.title.trim().length === 0) {
    throw new InvalidNameError("Resource", input.title);
  }
  if (!RESOURCE_TYPES.includes(input.type)) {
    throw new InvalidNameError("Resource.type", `${input.type} is not allowed. Allowed: ${RESOURCE_TYPES.join(", ")}`);
  }
  return {
    id: input.id,
    title: input.title.trim(),
    ...(input.url !== undefined && { url: input.url }),
    type: input.type,
    completed: input.completed ?? false,
  };
}

export type UpdateResourceInput = Partial<Pick<Resource, "title" | "url" | "type" | "completed">>;

export function addResourceToGoal(goal: LearningGoal, resource: Resource): Readonly<LearningGoal> {
  if (goal.resources.some((r) => r.id === resource.id)) {
    throw new InvalidNameError("Resource.id", `Resource with id '${resource.id}' already exists on this goal`);
  }
  return {
    ...goal,
    resources: [...goal.resources, resource],
    updatedAt: new Date(),
  };
}

export function removeResourceFromGoal(goal: LearningGoal, resourceId: ResourceId): Readonly<LearningGoal> {
  if (!goal.resources.some((r) => r.id === resourceId)) {
    throw new InvalidNameError("Resource.id", `Resource '${resourceId}' not found on goal`);
  }
  return {
    ...goal,
    resources: goal.resources.filter((r) => r.id !== resourceId),
    updatedAt: new Date(),
  };
}

export function updateResourceInGoal(
  goal: LearningGoal,
  resourceId: ResourceId,
  updates: UpdateResourceInput,
): Readonly<LearningGoal> {
  const existing = goal.resources.find((r) => r.id === resourceId);
  if (!existing) {
    throw new InvalidNameError("Resource.id", `Resource '${resourceId}' not found on goal`);
  }
  if (updates.type !== undefined && !RESOURCE_TYPES.includes(updates.type)) {
    throw new InvalidNameError("Resource.type", `${updates.type} is not allowed. Allowed: ${RESOURCE_TYPES.join(", ")}`);
  }
  const updated: Resource = {
    id: existing.id,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    type: updates.type ?? existing.type,
    completed: updates.completed ?? existing.completed,
    ...(updates.url !== undefined
      ? (updates.url === "" ? {} : { url: updates.url })
      : (existing.url !== undefined && { url: existing.url })),
  };
  if (updated.title.length === 0) {
    throw new InvalidNameError("Resource", updates.title ?? "");
  }
  return {
    ...goal,
    resources: goal.resources.map((r) => (r.id === resourceId ? updated : r)),
    updatedAt: new Date(),
  };
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
