export interface ExportProfileInput {
  readonly domainIds?: readonly string[];
  readonly includeSkills?: boolean;
  readonly includeGoals?: boolean;
  readonly includeInterests?: boolean;
}

export interface ExportProfileOutput {
  readonly content: string;
}
