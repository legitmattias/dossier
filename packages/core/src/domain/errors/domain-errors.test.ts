import { describe, expect, it } from "vitest";
import {
  CategoryNotFoundError,
  DomainError,
  DomainNotFoundError,
  DuplicateSkillError,
  GoalNotFoundError,
  InterestNotFoundError,
  InvalidIdError,
  InvalidNameError,
  InvalidSlugError,
  SkillNotFoundError,
} from "./domain-errors.js";

describe("DomainError", () => {
  it("has code and message", () => {
    const error = new DomainError("TEST_CODE", "test message");
    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("test message");
    expect(error.name).toBe("DomainError");
  });

  it("extends Error", () => {
    const error = new DomainError("TEST", "msg");
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe("InvalidIdError", () => {
  it("formats message with id type and value", () => {
    const error = new InvalidIdError("SkillId", "");
    expect(error.code).toBe("INVALID_ID");
    expect(error.message).toContain("SkillId");
    expect(error.name).toBe("InvalidIdError");
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe("InvalidSlugError", () => {
  it("formats message with invalid value", () => {
    const error = new InvalidSlugError("Bad Slug!");
    expect(error.code).toBe("INVALID_SLUG");
    expect(error.message).toContain("Bad Slug!");
    expect(error.name).toBe("InvalidSlugError");
  });
});

describe("InvalidNameError", () => {
  it("formats message with entity type", () => {
    const error = new InvalidNameError("Category", "");
    expect(error.code).toBe("INVALID_NAME");
    expect(error.message).toContain("Category");
    expect(error.name).toBe("InvalidNameError");
  });
});

describe("DuplicateSkillError", () => {
  it("formats message with skill identifier", () => {
    const error = new DuplicateSkillError("typescript");
    expect(error.code).toBe("DUPLICATE_SKILL");
    expect(error.message).toContain("typescript");
    expect(error.name).toBe("DuplicateSkillError");
  });
});

describe("not-found errors", () => {
  it("SkillNotFoundError", () => {
    const error = new SkillNotFoundError("skill-123");
    expect(error.code).toBe("SKILL_NOT_FOUND");
    expect(error.message).toContain("skill-123");
  });

  it("DomainNotFoundError", () => {
    const error = new DomainNotFoundError("domain-abc");
    expect(error.code).toBe("DOMAIN_NOT_FOUND");
    expect(error.message).toContain("domain-abc");
  });

  it("CategoryNotFoundError", () => {
    const error = new CategoryNotFoundError("cat-1");
    expect(error.code).toBe("CATEGORY_NOT_FOUND");
    expect(error.message).toContain("cat-1");
  });

  it("GoalNotFoundError", () => {
    const error = new GoalNotFoundError("goal-x");
    expect(error.code).toBe("GOAL_NOT_FOUND");
    expect(error.message).toContain("goal-x");
  });

  it("InterestNotFoundError", () => {
    const error = new InterestNotFoundError("interest-y");
    expect(error.code).toBe("INTEREST_NOT_FOUND");
    expect(error.message).toContain("interest-y");
  });

  it("all not-found errors extend DomainError", () => {
    expect(new SkillNotFoundError("x")).toBeInstanceOf(DomainError);
    expect(new DomainNotFoundError("x")).toBeInstanceOf(DomainError);
    expect(new CategoryNotFoundError("x")).toBeInstanceOf(DomainError);
    expect(new GoalNotFoundError("x")).toBeInstanceOf(DomainError);
    expect(new InterestNotFoundError("x")).toBeInstanceOf(DomainError);
  });
});
