// --- Input DTOs ---

export interface AddInterestInput {
  readonly name: string;
  readonly domainId?: string;
  readonly description?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
}

export interface RemoveInterestInput {
  readonly interestId: string;
}

export interface PromoteInterestInput {
  readonly interestId: string;
  readonly priority?: string;
  readonly description?: string;
  readonly targetDate?: string | Date;
}

// --- Output DTOs ---

export interface InterestOutput {
  readonly id: string;
  readonly name: string;
  readonly domainId?: string;
  readonly description?: string;
  readonly visibility: string;
  readonly featured: boolean;
  readonly createdAt: string;
}

export interface AddInterestOutput {
  readonly interest: InterestOutput;
}

export interface RemoveInterestOutput {
  readonly removed: true;
}

export interface PromoteInterestOutput {
  readonly goal: import("./goal-dtos.js").GoalOutput;
}
