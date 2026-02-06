/**
 * Base class for application-layer errors.
 * Domain errors propagate unchanged; these cover application-specific concerns.
 */
export class ApplicationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}

export class ProfileNotFoundError extends ApplicationError {
  constructor() {
    super("PROFILE_NOT_FOUND", "No profile exists. Create a profile first.");
    this.name = "ProfileNotFoundError";
  }
}

export class InvalidInputError extends ApplicationError {
  constructor(detail: string) {
    super("INVALID_INPUT", detail);
    this.name = "InvalidInputError";
  }
}
