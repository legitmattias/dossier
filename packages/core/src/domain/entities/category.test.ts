import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toCategoryId } from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createCategory } from "./category.js";

describe("createCategory", () => {
  it("creates a category with required fields", () => {
    const category = createCategory({
      id: toCategoryId("cat-1"),
      slug: createSlug("frameworks"),
      name: "Frameworks",
    });

    expect(category.id).toBe("cat-1");
    expect(category.slug).toBe("frameworks");
    expect(category.name).toBe("Frameworks");
    expect(category.description).toBeUndefined();
  });

  it("creates a category with description", () => {
    const category = createCategory({
      id: toCategoryId("cat-2"),
      slug: createSlug("string-instruments"),
      name: "String Instruments",
      description: "Instruments played by plucking or bowing strings",
    });

    expect(category.description).toBe("Instruments played by plucking or bowing strings");
  });

  it("trims the name", () => {
    const category = createCategory({
      id: toCategoryId("cat-3"),
      slug: createSlug("languages"),
      name: "  Programming Languages  ",
    });

    expect(category.name).toBe("Programming Languages");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() =>
      createCategory({
        id: toCategoryId("cat-4"),
        slug: createSlug("empty"),
        name: "",
      }),
    ).toThrow(InvalidNameError);
  });

  it("throws InvalidNameError for whitespace-only name", () => {
    expect(() =>
      createCategory({
        id: toCategoryId("cat-5"),
        slug: createSlug("blank"),
        name: "   ",
      }),
    ).toThrow(InvalidNameError);
  });
});
