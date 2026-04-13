import { InvalidIdError } from "../errors/domain-errors.js";

// Branded ID types — zero runtime overhead, compile-time type safety
export type SkillId = string & { readonly __brand: "SkillId" };
export type DomainId = string & { readonly __brand: "DomainId" };
export type CategoryId = string & { readonly __brand: "CategoryId" };
export type GoalId = string & { readonly __brand: "GoalId" };
export type InterestId = string & { readonly __brand: "InterestId" };
export type ProjectId = string & { readonly __brand: "ProjectId" };
export type ProfileId = string & { readonly __brand: "ProfileId" };

function validateId(value: string, typeName: string): void {
  if (value.trim().length === 0) {
    throw new InvalidIdError(typeName, value);
  }
}

export function toSkillId(value: string): SkillId {
  validateId(value, "SkillId");
  return value as SkillId;
}

export function toDomainId(value: string): DomainId {
  validateId(value, "DomainId");
  return value as DomainId;
}

export function toCategoryId(value: string): CategoryId {
  validateId(value, "CategoryId");
  return value as CategoryId;
}

export function toGoalId(value: string): GoalId {
  validateId(value, "GoalId");
  return value as GoalId;
}

export function toInterestId(value: string): InterestId {
  validateId(value, "InterestId");
  return value as InterestId;
}

export function toProjectId(value: string): ProjectId {
  validateId(value, "ProjectId");
  return value as ProjectId;
}

export function toProfileId(value: string): ProfileId {
  validateId(value, "ProfileId");
  return value as ProfileId;
}
