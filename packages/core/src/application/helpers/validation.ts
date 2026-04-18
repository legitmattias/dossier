import {
  isProficiency,
  PROFICIENCY_LEVELS,
  type GoalStatus,
  type Priority,
  type Proficiency,
} from "../../domain/index.js";
import { InvalidInputError } from "../errors/application-errors.js";

const VALID_PRIORITIES = ["low", "medium", "high"] as const;
const VALID_GOAL_STATUSES = ["active", "paused", "completed", "abandoned"] as const;

/**
 * Validate and convert a string to a Proficiency level.
 * Throws InvalidInputError if the value is not valid.
 */
export function validateProficiency(value: string): Proficiency {
  if (!isProficiency(value)) {
    throw new InvalidInputError(
      `Invalid proficiency: "${value}". Must be one of: ${PROFICIENCY_LEVELS.join(", ")}.`,
    );
  }
  return value;
}

/**
 * Validate and convert a string to a Priority level.
 * Throws InvalidInputError if the value is not valid.
 */
export function validatePriority(value: string): Priority {
  if (!VALID_PRIORITIES.includes(value as Priority)) {
    throw new InvalidInputError(
      `Invalid priority: "${value}". Must be one of: low, medium, high.`,
    );
  }
  return value as Priority;
}

/**
 * Validate and convert a string to a GoalStatus.
 * Throws InvalidInputError if the value is not valid.
 */
export function validateGoalStatus(value: string): GoalStatus {
  if (!VALID_GOAL_STATUSES.includes(value as GoalStatus)) {
    throw new InvalidInputError(
      `Invalid goal status: "${value}". Must be one of: ${VALID_GOAL_STATUSES.join(", ")}.`,
    );
  }
  return value as GoalStatus;
}
