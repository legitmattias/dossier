import { describe, expect, it } from "vitest";
import {
  ApplicationError,
  InvalidInputError,
  ProfileNotFoundError,
} from "./application-errors.js";

describe("ApplicationError", () => {
  it("has a code and message", () => {
    const error = new ApplicationError("TEST_CODE", "Something went wrong");
    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("ApplicationError");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("ProfileNotFoundError", () => {
  it("has the correct code and message", () => {
    const error = new ProfileNotFoundError();
    expect(error.code).toBe("PROFILE_NOT_FOUND");
    expect(error.message).toContain("No profile exists");
    expect(error.name).toBe("ProfileNotFoundError");
    expect(error).toBeInstanceOf(ApplicationError);
  });
});

describe("InvalidInputError", () => {
  it("includes the detail in the message", () => {
    const error = new InvalidInputError("Proficiency must be one of: learning, familiar, proficient, expert");
    expect(error.code).toBe("INVALID_INPUT");
    expect(error.message).toContain("Proficiency must be");
    expect(error.name).toBe("InvalidInputError");
    expect(error).toBeInstanceOf(ApplicationError);
  });
});
