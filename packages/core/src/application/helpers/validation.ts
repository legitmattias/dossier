import {
  isProficiency,
  type Priority,
  type Proficiency,
} from "../../domain/index.js";
import { InvalidInputError } from "../errors/application-errors.js";

const VALID_PRIORITIES = ["low", "medium", "high"] as const;

/**
 * Validate and convert a string to a Proficiency level.
 * Throws InvalidInputError if the value is not valid.
 */
export function validateProficiency(value: string): Proficiency {
  if (!isProficiency(value)) {
    throw new InvalidInputError(
      `Invalid proficiency: "${value}". Must be one of: learning, familiar, proficient, expert.`,
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
