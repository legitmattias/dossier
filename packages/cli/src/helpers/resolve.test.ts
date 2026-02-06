import { describe, expect, it } from "vitest";
import {
  createProfile,
  createSkill,
  createLearningGoal,
  createInterest,
  toProfileId,
  toSkillId,
  toGoalId,
  toInterestId,
  toDomainId,
  toCategoryId,
  BUILT_IN_DOMAINS,
} from "@dossier/core";
import type { Profile } from "@dossier/core";
import { createSlug } from "@dossier/core";
import {
  resolveDomainId,
  resolveDomain,
  resolveCategoryId,
  resolveSkillId,
  resolveGoalId,
  resolveInterestId,
  ResolveError,
} from "./resolve.js";

function makeProfile(): Profile {
  return createProfile({
    id: toProfileId("test-profile"),
    name: "Test",
    domains: [...BUILT_IN_DOMAINS],
    skills: [
      createSkill({
        id: toSkillId("skill-1"),
        slug: createSlug("typescript"),
        name: "TypeScript",
        domainId: toDomainId("builtin-domain-software-development"),
        categoryId: toCategoryId("builtin-category-software-development-languages"),
        proficiency: "proficient",
      }),
    ],
    goals: [
      createLearningGoal({
        id: toGoalId("goal-1"),
        name: "Learn Rust",
        domainId: toDomainId("builtin-domain-software-development"),
      }),
    ],
    interests: [
      createInterest({
        id: toInterestId("interest-1"),
        name: "WebAssembly",
        domainId: toDomainId("builtin-domain-software-development"),
      }),
    ],
  });
}

describe("resolveDomainId", () => {
  const profile = makeProfile();

  it("resolves by slug", () => {
    expect(resolveDomainId(profile, "software-development"))
      .toBe("builtin-domain-software-development");
  });

  it("resolves by name (case-insensitive)", () => {
    expect(resolveDomainId(profile, "Software Development"))
      .toBe("builtin-domain-software-development");
  });

  it("resolves by name (lowercase)", () => {
    expect(resolveDomainId(profile, "professional"))
      .toBe("builtin-domain-professional");
  });

  it("throws ResolveError for unknown domain", () => {
    expect(() => resolveDomainId(profile, "nonexistent"))
      .toThrow(ResolveError);
  });

  it("includes available domains in error message", () => {
    expect(() => resolveDomainId(profile, "nonexistent"))
      .toThrow(/Available:/);
  });
});

describe("resolveDomain", () => {
  const profile = makeProfile();

  it("returns the full domain object", () => {
    const domain = resolveDomain(profile, "software-development");
    expect(domain.name).toBe("Software Development");
    expect(domain.categories.length).toBeGreaterThan(0);
  });
});

describe("resolveCategoryId", () => {
  const profile = makeProfile();
  const domain = resolveDomain(profile, "software-development");

  it("resolves by slug", () => {
    expect(resolveCategoryId(domain, "languages"))
      .toBe("builtin-category-software-development-languages");
  });

  it("resolves by name (case-insensitive)", () => {
    expect(resolveCategoryId(domain, "Programming Languages"))
      .toBe("builtin-category-software-development-languages");
  });

  it("throws ResolveError for unknown category", () => {
    expect(() => resolveCategoryId(domain, "nonexistent"))
      .toThrow(ResolveError);
  });

  it("includes available categories in error message", () => {
    expect(() => resolveCategoryId(domain, "nonexistent"))
      .toThrow(/Available:/);
  });
});

describe("resolveSkillId", () => {
  const profile = makeProfile();

  it("resolves by name (case-insensitive)", () => {
    expect(resolveSkillId(profile, "typescript")).toBe("skill-1");
  });

  it("resolves by exact name", () => {
    expect(resolveSkillId(profile, "TypeScript")).toBe("skill-1");
  });

  it("resolves by slug", () => {
    expect(resolveSkillId(profile, "typescript")).toBe("skill-1");
  });

  it("throws ResolveError for unknown skill", () => {
    expect(() => resolveSkillId(profile, "nonexistent"))
      .toThrow(ResolveError);
  });
});

describe("resolveGoalId", () => {
  const profile = makeProfile();

  it("resolves by name (case-insensitive)", () => {
    expect(resolveGoalId(profile, "learn rust")).toBe("goal-1");
  });

  it("throws ResolveError for unknown goal", () => {
    expect(() => resolveGoalId(profile, "nonexistent"))
      .toThrow(ResolveError);
  });
});

describe("resolveInterestId", () => {
  const profile = makeProfile();

  it("resolves by name (case-insensitive)", () => {
    expect(resolveInterestId(profile, "webassembly")).toBe("interest-1");
  });

  it("throws ResolveError for unknown interest", () => {
    expect(() => resolveInterestId(profile, "nonexistent"))
      .toThrow(ResolveError);
  });
});
