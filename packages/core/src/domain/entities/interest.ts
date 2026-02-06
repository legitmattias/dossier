import { InvalidNameError } from "../errors/domain-errors.js";
import type { DomainId, InterestId } from "../value-objects/identifiers.js";

export interface Interest {
  readonly id: InterestId;
  readonly name: string;
  readonly domainId: DomainId;
  readonly description?: string;
  readonly createdAt: Date;
}

export interface CreateInterestInput {
  readonly id: InterestId;
  readonly name: string;
  readonly domainId: DomainId;
  readonly description?: string;
  readonly createdAt?: Date;
}

export function createInterest(input: CreateInterestInput): Readonly<Interest> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Interest", input.name);
  }

  return {
    id: input.id,
    name: input.name.trim(),
    domainId: input.domainId,
    ...(input.description !== undefined && { description: input.description }),
    createdAt: input.createdAt ?? new Date(),
  };
}
