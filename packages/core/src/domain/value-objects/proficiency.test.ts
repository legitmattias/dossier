import { describe, expect, it } from "vitest";
import {
  type Proficiency,
  PROFICIENCY_LEVELS,
  compareProficiency,
  isProficiency,
} from "./proficiency.js";

describe("PROFICIENCY_LEVELS", () => {
  it("has five levels in order", () => {
    expect(PROFICIENCY_LEVELS).toEqual(["novice", "familiar", "proficient", "advanced", "expert"]);
  });
});

describe("isProficiency", () => {
  it("returns true for valid proficiency levels", () => {
    for (const level of PROFICIENCY_LEVELS) {
      expect(isProficiency(level)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isProficiency("beginner")).toBe(false);
    expect(isProficiency("learning")).toBe(false);
    expect(isProficiency("master")).toBe(false);
    expect(isProficiency("")).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(isProficiency(42)).toBe(false);
    expect(isProficiency(null)).toBe(false);
    expect(isProficiency(undefined)).toBe(false);
    expect(isProficiency(true)).toBe(false);
  });
});

describe("compareProficiency", () => {
  it("returns 0 for equal levels", () => {
    for (const level of PROFICIENCY_LEVELS) {
      expect(compareProficiency(level, level)).toBe(0);
    }
  });

  it("returns negative when first is lower than second", () => {
    expect(compareProficiency("novice", "expert")).toBeLessThan(0);
    expect(compareProficiency("familiar", "proficient")).toBeLessThan(0);
    expect(compareProficiency("proficient", "advanced")).toBeLessThan(0);
  });

  it("returns positive when first is higher than second", () => {
    expect(compareProficiency("expert", "novice")).toBeGreaterThan(0);
    expect(compareProficiency("advanced", "proficient")).toBeGreaterThan(0);
  });

  it("maintains transitivity", () => {
    const levels: Proficiency[] = [...PROFICIENCY_LEVELS];
    for (let i = 0; i < levels.length; i++) {
      for (let j = i + 1; j < levels.length; j++) {
        expect(compareProficiency(levels[i]!, levels[j]!)).toBeLessThan(0);
        expect(compareProficiency(levels[j]!, levels[i]!)).toBeGreaterThan(0);
      }
    }
  });
});
