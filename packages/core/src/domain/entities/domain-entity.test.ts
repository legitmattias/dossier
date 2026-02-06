import { describe, expect, it } from "vitest";
import { CategoryNotFoundError, InvalidNameError } from "../errors/domain-errors.js";
import { toCategoryId, toDomainId } from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createCategory } from "./category.js";
import { addCategoryToDomain, createDomain, findCategoryInDomain } from "./domain-entity.js";

const testCategory = createCategory({
  id: toCategoryId("cat-frameworks"),
  slug: createSlug("frameworks"),
  name: "Frameworks",
});

describe("createDomain", () => {
  it("creates a domain with required fields", () => {
    const domain = createDomain({
      id: toDomainId("domain-1"),
      slug: createSlug("software-development"),
      name: "Software Development",
    });

    expect(domain.id).toBe("domain-1");
    expect(domain.slug).toBe("software-development");
    expect(domain.name).toBe("Software Development");
    expect(domain.categories).toEqual([]);
    expect(domain.isBuiltIn).toBe(false);
    expect(domain.description).toBeUndefined();
  });

  it("creates a domain with all optional fields", () => {
    const domain = createDomain({
      id: toDomainId("domain-2"),
      slug: createSlug("music"),
      name: "Music",
      description: "Musical skills and knowledge",
      categories: [testCategory],
      isBuiltIn: true,
    });

    expect(domain.description).toBe("Musical skills and knowledge");
    expect(domain.categories).toHaveLength(1);
    expect(domain.isBuiltIn).toBe(true);
  });

  it("trims the name", () => {
    const domain = createDomain({
      id: toDomainId("domain-3"),
      slug: createSlug("languages"),
      name: "  Human Languages  ",
    });

    expect(domain.name).toBe("Human Languages");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() =>
      createDomain({
        id: toDomainId("domain-4"),
        slug: createSlug("empty"),
        name: "",
      }),
    ).toThrow(InvalidNameError);
  });
});

describe("addCategoryToDomain", () => {
  it("returns a new domain with the category added", () => {
    const domain = createDomain({
      id: toDomainId("domain-1"),
      slug: createSlug("software-development"),
      name: "Software Development",
    });

    const updated = addCategoryToDomain(domain, testCategory);

    expect(updated.categories).toHaveLength(1);
    expect(updated.categories[0]!.id).toBe("cat-frameworks");
    // Original unchanged
    expect(domain.categories).toHaveLength(0);
  });

  it("preserves existing categories", () => {
    const domain = createDomain({
      id: toDomainId("domain-1"),
      slug: createSlug("music"),
      name: "Music",
      categories: [testCategory],
    });

    const newCategory = createCategory({
      id: toCategoryId("cat-instruments"),
      slug: createSlug("instruments"),
      name: "Instruments",
    });

    const updated = addCategoryToDomain(domain, newCategory);

    expect(updated.categories).toHaveLength(2);
  });
});

describe("findCategoryInDomain", () => {
  const domain = createDomain({
    id: toDomainId("domain-1"),
    slug: createSlug("software-development"),
    name: "Software Development",
    categories: [testCategory],
  });

  it("finds a category by ID", () => {
    const found = findCategoryInDomain(domain, toCategoryId("cat-frameworks"));
    expect(found.name).toBe("Frameworks");
  });

  it("throws CategoryNotFoundError for unknown ID", () => {
    expect(() => findCategoryInDomain(domain, toCategoryId("cat-unknown"))).toThrow(
      CategoryNotFoundError,
    );
  });
});
