import { describe, expect, it } from "vitest";
import { InvalidSlugError } from "../errors/domain-errors.js";
import { createSlug } from "./slug.js";

describe("createSlug", () => {
  it("creates a slug from a valid lowercase string", () => {
    expect(createSlug("typescript")).toBe("typescript");
  });

  it("creates a slug with hyphens", () => {
    expect(createSlug("machine-learning")).toBe("machine-learning");
  });

  it("normalizes uppercase to lowercase", () => {
    expect(createSlug("TypeScript")).toBe("typescript");
  });

  it("allows numeric segments", () => {
    expect(createSlug("es2024")).toBe("es2024");
  });

  it("allows numeric-only segments separated by hyphens", () => {
    expect(createSlug("v1-2-3")).toBe("v1-2-3");
  });

  it("trims whitespace before validation", () => {
    expect(createSlug("  typescript  ")).toBe("typescript");
  });

  // Domain-extensible examples
  it("works for music domain slugs", () => {
    expect(createSlug("acoustic-guitar")).toBe("acoustic-guitar");
  });

  it("works for language domain slugs", () => {
    expect(createSlug("mandarin-chinese")).toBe("mandarin-chinese");
  });

  describe("invalid slugs", () => {
    it("throws for empty string", () => {
      expect(() => createSlug("")).toThrow(InvalidSlugError);
    });

    it("throws for whitespace-only", () => {
      expect(() => createSlug("   ")).toThrow(InvalidSlugError);
    });

    it("throws for strings with spaces", () => {
      expect(() => createSlug("machine learning")).toThrow(InvalidSlugError);
    });

    it("throws for leading hyphen", () => {
      expect(() => createSlug("-typescript")).toThrow(InvalidSlugError);
    });

    it("throws for trailing hyphen", () => {
      expect(() => createSlug("typescript-")).toThrow(InvalidSlugError);
    });

    it("throws for consecutive hyphens", () => {
      expect(() => createSlug("type--script")).toThrow(InvalidSlugError);
    });

    it("throws for special characters", () => {
      expect(() => createSlug("c++")).toThrow(InvalidSlugError);
      expect(() => createSlug("c#")).toThrow(InvalidSlugError);
      expect(() => createSlug("node.js")).toThrow(InvalidSlugError);
    });

    it("throws for underscores", () => {
      expect(() => createSlug("snake_case")).toThrow(InvalidSlugError);
    });
  });
});
