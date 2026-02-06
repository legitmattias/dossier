/**
 * Shared test infrastructure for application-layer tests.
 * Provides in-memory implementations of ports and helpers for test setup.
 */

import type { Profile } from "../../domain/index.js";
import {
  addDomainToProfile,
  BUILT_IN_DOMAINS,
  createProfile,
  toProfileId,
} from "../../domain/index.js";
import type { ExportOptions, IExporter } from "../ports/exporter.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

/**
 * In-memory profile repository for tests.
 * Uses structuredClone for proper isolation between load/save.
 */
export class InMemoryProfileRepository implements IProfileRepository {
  private profile: Profile | null = null;

  async load(): Promise<Profile | null> {
    return this.profile ? structuredClone(this.profile) : null;
  }

  async save(profile: Profile): Promise<void> {
    this.profile = structuredClone(profile);
  }

  async exists(): Promise<boolean> {
    return this.profile !== null;
  }

  /** Test helper: get the stored profile without cloning (for assertions). */
  getStoredProfile(): Profile | null {
    return this.profile;
  }
}

/**
 * Deterministic ID generator for tests.
 * Produces "prefix-1", "prefix-2", etc. (or "id-1" without prefix).
 */
export class StubIdGenerator implements IIdGenerator {
  private counter = 0;

  generate(prefix?: string): string {
    this.counter++;
    return `${prefix ?? "id"}-${this.counter}`;
  }

  reset(): void {
    this.counter = 0;
  }
}

/**
 * Stub exporter for tests. Records calls and returns configurable output.
 */
export class StubExporter implements IExporter {
  readonly calls: Array<{ profile: Profile; options?: ExportOptions }> = [];
  output = "stub export output";

  export(profile: Profile, options?: ExportOptions): string {
    this.calls.push({ profile, options });
    return this.output;
  }
}

/**
 * Create a profile pre-loaded with all built-in domains.
 * Useful for tests that need domain/category lookup to succeed.
 */
export function createProfileWithBuiltInDomains(
  name = "Test Profile",
): Profile {
  let profile = createProfile({
    id: toProfileId("test-profile-1"),
    name,
  });

  for (const domain of BUILT_IN_DOMAINS) {
    profile = addDomainToProfile(profile, domain);
  }

  return profile;
}
