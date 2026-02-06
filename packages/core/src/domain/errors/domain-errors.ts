/**
 * Base class for all domain errors.
 * Extends Error with an error code for programmatic handling.
 */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

export class InvalidIdError extends DomainError {
  constructor(idType: string, value: string) {
    super("INVALID_ID", `Invalid ${idType}: "${value}". IDs must be non-empty strings.`);
    this.name = "InvalidIdError";
  }
}

export class InvalidSlugError extends DomainError {
  constructor(value: string) {
    super(
      "INVALID_SLUG",
      `Invalid slug: "${value}". Slugs must match ^[a-z0-9]+(-[a-z0-9]+)*$ (lowercase alphanumeric, hyphen-separated).`,
    );
    this.name = "InvalidSlugError";
  }
}

export class InvalidNameError extends DomainError {
  constructor(entityType: string, value: string) {
    super("INVALID_NAME", `Invalid ${entityType} name: "${value}". Names must be non-empty strings.`);
    this.name = "InvalidNameError";
  }
}

export class DuplicateSkillError extends DomainError {
  constructor(skillIdentifier: string) {
    super("DUPLICATE_SKILL", `Skill already exists: "${skillIdentifier}".`);
    this.name = "DuplicateSkillError";
  }
}

export class SkillNotFoundError extends DomainError {
  constructor(skillIdentifier: string) {
    super("SKILL_NOT_FOUND", `Skill not found: "${skillIdentifier}".`);
    this.name = "SkillNotFoundError";
  }
}

export class DomainNotFoundError extends DomainError {
  constructor(domainIdentifier: string) {
    super("DOMAIN_NOT_FOUND", `Domain not found: "${domainIdentifier}".`);
    this.name = "DomainNotFoundError";
  }
}

export class CategoryNotFoundError extends DomainError {
  constructor(categoryIdentifier: string) {
    super("CATEGORY_NOT_FOUND", `Category not found: "${categoryIdentifier}".`);
    this.name = "CategoryNotFoundError";
  }
}

export class GoalNotFoundError extends DomainError {
  constructor(goalIdentifier: string) {
    super("GOAL_NOT_FOUND", `Learning goal not found: "${goalIdentifier}".`);
    this.name = "GoalNotFoundError";
  }
}

export class InterestNotFoundError extends DomainError {
  constructor(interestIdentifier: string) {
    super("INTEREST_NOT_FOUND", `Interest not found: "${interestIdentifier}".`);
    this.name = "InterestNotFoundError";
  }
}
