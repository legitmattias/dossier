import { beforeEach, describe, expect, it } from "vitest";
import {
  CategoryNotFoundError,
  DomainNotFoundError,
  InvalidSlugError,
} from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addSkill } from "./add-skill.js";

describe("addSkill", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());
  });

  it("adds a skill to the profile and returns the DTO", async () => {
    const result = await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });

    expect(result.skill.id).toBe("skill-1");
    expect(result.skill.slug).toBe("typescript");
    expect(result.skill.name).toBe("TypeScript");
    expect(result.skill.proficiency).toBe("proficient");
    expect(result.skill.domainId).toBe("builtin-domain-software-development");
    expect(result.skill.categoryId).toBe("builtin-category-software-development-languages");
    expect(result.skill.createdAt).toBeDefined();
    expect(result.skill.updatedAt).toBeDefined();
  });

  it("persists the skill in the repository", async () => {
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });

    const stored = await repo.load();
    expect(stored!.skills).toHaveLength(1);
    expect(stored!.skills[0].name).toBe("TypeScript");
  });

  it("includes optional sources and notes", async () => {
    const result = await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "Python",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "familiar",
      sources: [{ type: "self-reported", date: new Date() }],
      notes: "Used for data analysis",
    });

    expect(result.skill.sources).toHaveLength(1);
    expect(result.skill.notes).toBe("Used for data analysis");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      addSkill({ profileRepository: emptyRepo, idGenerator: idGen }, {
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "proficient",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws InvalidInputError for invalid proficiency", async () => {
    await expect(
      addSkill({ profileRepository: repo, idGenerator: idGen }, {
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "wizard",
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  it("throws DomainNotFoundError for nonexistent domain", async () => {
    await expect(
      addSkill({ profileRepository: repo, idGenerator: idGen }, {
        name: "TypeScript",
        domainId: "nonexistent-domain",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "proficient",
      }),
    ).rejects.toThrow(DomainNotFoundError);
  });

  it("throws CategoryNotFoundError for nonexistent category", async () => {
    await expect(
      addSkill({ profileRepository: repo, idGenerator: idGen }, {
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "nonexistent-category",
        proficiency: "proficient",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it("throws InvalidSlugError for empty name", async () => {
    await expect(
      addSkill({ profileRepository: repo, idGenerator: idGen }, {
        name: "",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "proficient",
      }),
    ).rejects.toThrow(InvalidSlugError);
  });

  // Domain extensibility: non-dev domain
  it("works with the languages domain (spoken language skill)", async () => {
    const result = await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "Swedish",
      domainId: "builtin-domain-languages",
      categoryId: "builtin-category-languages-spoken",
      proficiency: "expert",
    });

    expect(result.skill.name).toBe("Swedish");
    expect(result.skill.domainId).toBe("builtin-domain-languages");
  });
});
