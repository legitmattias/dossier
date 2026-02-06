import {
  DomainError,
  DuplicateSkillError,
  DomainNotFoundError,
  CategoryNotFoundError,
  SkillNotFoundError,
  GoalNotFoundError,
  InterestNotFoundError,
  application,
} from "@dossier/core";
import { error } from "./output.js";
import { ResolveError } from "./resolve.js";

// `any` is intentional here: Commander action handlers have varying signatures
// (e.g. (opts), (name, opts), (name, pct, opts)). The generic T preserves the
// original signature at call sites — `any` is encapsulated inside the wrapper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withErrorHandler<T extends (...args: any[]) => Promise<void>>(
  action: T,
): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async (...args: any[]) => {
    try {
      await action(...args);
    } catch (err) {
      if (err instanceof application.ProfileNotFoundError) {
        error("No profile found. Run 'dossier init' first.");
        process.exit(1);
      }

      if (err instanceof application.InvalidInputError) {
        error(err.message);
        process.exit(1);
      }

      if (err instanceof ResolveError) {
        error(err.message);
        process.exit(1);
      }

      if (err instanceof DuplicateSkillError) {
        error(err.message);
        process.exit(1);
      }

      if (err instanceof DomainNotFoundError
        || err instanceof CategoryNotFoundError
        || err instanceof SkillNotFoundError
        || err instanceof GoalNotFoundError
        || err instanceof InterestNotFoundError) {
        error(err.message);
        process.exit(1);
      }

      if (err instanceof DomainError) {
        error(err.message);
        process.exit(1);
      }

      if (err instanceof Error) {
        error(`Unexpected error: ${err.message}`);
        process.exit(1);
      }

      error("An unknown error occurred.");
      process.exit(1);
    }
  }) as T;
}
