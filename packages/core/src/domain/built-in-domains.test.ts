import { describe, expect, it } from "vitest";
import {
  BUILT_IN_DOMAINS,
  LANGUAGES,
  PROFESSIONAL,
  SOFTWARE_DEVELOPMENT,
} from "./built-in-domains.js";
import { findCategoryInDomain } from "./entities/domain-entity.js";
import { toCategoryId } from "./value-objects/identifiers.js";

describe("built-in domains", () => {
  it("exports 3 built-in domains", () => {
    expect(BUILT_IN_DOMAINS).toHaveLength(3);
  });

  it("all domains are marked as built-in", () => {
    for (const domain of BUILT_IN_DOMAINS) {
      expect(domain.isBuiltIn).toBe(true);
    }
  });

  it("all domains have deterministic IDs", () => {
    expect(SOFTWARE_DEVELOPMENT.id).toBe("builtin-domain-software-development");
    expect(LANGUAGES.id).toBe("builtin-domain-languages");
    expect(PROFESSIONAL.id).toBe("builtin-domain-professional");
  });
});

describe("SOFTWARE_DEVELOPMENT", () => {
  it("has 9 categories", () => {
    expect(SOFTWARE_DEVELOPMENT.categories).toHaveLength(9);
  });

  it("has deterministic category IDs", () => {
    const cat = findCategoryInDomain(
      SOFTWARE_DEVELOPMENT,
      toCategoryId("builtin-category-software-development-languages"),
    );
    expect(cat.name).toBe("Programming Languages");
  });

  it("covers key development areas", () => {
    const names = SOFTWARE_DEVELOPMENT.categories.map((c) => c.slug);
    expect(names).toContain("languages");
    expect(names).toContain("frameworks");
    expect(names).toContain("databases");
    expect(names).toContain("devops");
    expect(names).toContain("testing");
    expect(names).toContain("architecture");
  });
});

describe("LANGUAGES", () => {
  it("has 3 categories", () => {
    expect(LANGUAGES.categories).toHaveLength(3);
  });

  it("includes spoken, written, and sign", () => {
    const slugs = LANGUAGES.categories.map((c) => c.slug);
    expect(slugs).toContain("spoken");
    expect(slugs).toContain("written");
    expect(slugs).toContain("sign");
  });
});

describe("PROFESSIONAL", () => {
  it("has 4 categories", () => {
    expect(PROFESSIONAL.categories).toHaveLength(4);
  });

  it("includes leadership and communication", () => {
    const slugs = PROFESSIONAL.categories.map((c) => c.slug);
    expect(slugs).toContain("leadership");
    expect(slugs).toContain("communication");
  });
});
