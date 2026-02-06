import type { Profile } from "../../domain/index.js";

/**
 * Repository port for profile persistence.
 * Profile is the aggregate root — all entity access goes through it.
 */
export interface IProfileRepository {
  /** Load the current profile. Returns null if none exists. */
  load(): Promise<Profile | null>;

  /** Persist the profile (create or replace). */
  save(profile: Profile): Promise<void>;

  /** Check if a profile exists. */
  exists(): Promise<boolean>;
}
