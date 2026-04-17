import { InvalidNameError } from "../errors/domain-errors.js";
import type { DomainId, InterestId } from "../value-objects/identifiers.js";

export interface Interest {
  readonly id: InterestId;
  readonly name: string;
  readonly domainId?: DomainId;
  readonly description?: string;
  readonly notes?: string;
  readonly visibility: "public" | "private";
  readonly featured: boolean;
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
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createInterest(input: CreateInterestInput): Readonly<Interest> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Interest", input.name);
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
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}
