import { InvalidNameError } from "../errors/domain-errors.js";
import type { DomainId, InterestId } from "../value-objects/identifiers.js";

// Interest has no per-field private overrides — entity-level visibility is sufficient.
// The constant exists for schema uniformity (and so the array is always empty).
export const INTEREST_PRIVATE_ELIGIBLE_FIELDS = [] as const;
export type InterestPrivateField = (typeof INTEREST_PRIVATE_ELIGIBLE_FIELDS)[number];

export interface Interest {
  readonly id: InterestId;
  readonly name: string;
  readonly domainId?: DomainId;
  readonly description?: string;
  readonly notes?: string;
  readonly visibility: "public" | "private";
  readonly featured: boolean;
  readonly privateFields: readonly InterestPrivateField[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateInterestInput {
  readonly id: InterestId;
  readonly name: string;
  readonly domainId?: DomainId;
  readonly description?: string;
  readonly notes?: string;
  readonly visibility?: "public" | "private";
  readonly featured?: boolean;
  readonly privateFields?: readonly string[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createInterest(input: CreateInterestInput): Readonly<Interest> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Interest", input.name);
  }

  if (input.privateFields && input.privateFields.length > 0) {
    throw new InvalidNameError("Interest.privateFields", "Interest has no per-field private overrides");
  }

  const now = new Date();
  const createdAt = input.createdAt ?? now;
  return {
    id: input.id,
    name: input.name.trim(),
    ...(input.domainId !== undefined && { domainId: input.domainId }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.notes !== undefined && { notes: input.notes }),
    visibility: input.visibility ?? "public",
    featured: input.featured ?? false,
    privateFields: [],
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}
