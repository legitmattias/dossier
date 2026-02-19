import type { Profile } from "../../domain/index.js";

export interface ExportOptions {
  /** Filter export to specific domain IDs. */
  readonly domainIds?: readonly string[];
  /** Include skills in export. Default: true. */
  readonly includeSkills?: boolean;
  /** Include learning goals in export. Default: true. */
  readonly includeGoals?: boolean;
  /** Include interests in export. Default: true. */
  readonly includeInterests?: boolean;
  /** Exclude completed goals from export. Default: false. */
  readonly excludeCompleted?: boolean;
}

/**
 * Port for exporting a profile to a string format.
 * Implementations decide the output format (Markdown, JSON, YAML, etc.).
 */
export interface IExporter {
  /** Export the profile to a string. */
  export(profile: Profile, options?: ExportOptions): string;
}
