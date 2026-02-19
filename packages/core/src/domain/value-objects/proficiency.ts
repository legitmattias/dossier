export const PROFICIENCY_LEVELS = ["beginner", "familiar", "proficient", "expert"] as const;

export type Proficiency = (typeof PROFICIENCY_LEVELS)[number];

/**
 * Type guard: checks if a value is a valid Proficiency level.
 */
export function isProficiency(value: unknown): value is Proficiency {
  return typeof value === "string" && PROFICIENCY_LEVELS.includes(value as Proficiency);
}

/**
 * Compares two proficiency levels.
 * Returns negative if a < b, zero if equal, positive if a > b.
 * Ordering: learning < familiar < proficient < expert
 */
export function compareProficiency(a: Proficiency, b: Proficiency): number {
  return PROFICIENCY_LEVELS.indexOf(a) - PROFICIENCY_LEVELS.indexOf(b);
}
