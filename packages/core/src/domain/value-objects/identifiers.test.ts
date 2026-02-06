import { describe, expect, it } from "vitest";
import { InvalidIdError } from "../errors/domain-errors.js";
import {
  toCategoryId,
  toDomainId,
  toGoalId,
  toInterestId,
  toProfileId,
  toSkillId,
} from "./identifiers.js";

describe("branded ID factories", () => {
  const factories = [
    { name: "toSkillId", fn: toSkillId },
    { name: "toDomainId", fn: toDomainId },
    { name: "toCategoryId", fn: toCategoryId },
    { name: "toGoalId", fn: toGoalId },
    { name: "toInterestId", fn: toInterestId },
    { name: "toProfileId", fn: toProfileId },
  ] as const;

  for (const { name, fn } of factories) {
    describe(name, () => {
      it("returns the value for valid non-empty strings", () => {
        const result = fn("abc-123");
        expect(result).toBe("abc-123");
      });

      it("throws InvalidIdError for empty string", () => {
        expect(() => fn("")).toThrow(InvalidIdError);
      });

      it("throws InvalidIdError for whitespace-only string", () => {
        expect(() => fn("   ")).toThrow(InvalidIdError);
      });

      it("accepts strings with special characters", () => {
        expect(fn("builtin-domain-software-development")).toBe(
          "builtin-domain-software-development",
        );
      });
    });
  }
});
