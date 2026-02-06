/**
 * Port for generating unique IDs.
 * Use cases convert the returned string to the appropriate branded type.
 */
export interface IIdGenerator {
  /** Generate a unique ID, optionally prefixed (e.g. "skill", "goal"). */
  generate(prefix?: string): string;
}
