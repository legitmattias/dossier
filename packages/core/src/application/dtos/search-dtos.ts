// --- Input ---

export interface SearchProfileInput {
  readonly query: string;
}

// --- Output ---

export interface SearchResultItem {
  readonly id: string;
  readonly name: string;
  readonly type: "skill" | "goal" | "interest" | "project";
  readonly description?: string;
  readonly meta?: string;
}

export interface SearchProfileOutput {
  readonly query: string;
  readonly results: {
    readonly skills: readonly SearchResultItem[];
    readonly goals: readonly SearchResultItem[];
    readonly interests: readonly SearchResultItem[];
    readonly projects: readonly SearchResultItem[];
  };
  readonly total: number;
}
