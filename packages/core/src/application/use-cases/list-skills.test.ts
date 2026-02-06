import { beforeEach, describe, expect, it } from "vitest";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addSkill } from "./add-skill.js";
import { listSkills } from "./list-skills.js";
import { updateSkill } from "./update-skill.js";

describe("listSkills", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed skills across domains and categories
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "React",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-frameworks",
      proficiency: "familiar",
    });
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "Swedish",
      domainId: "builtin-domain-languages",
      categoryId: "builtin-category-languages-spoken",
      proficiency: "expert",
    });
  });

  it("returns all skills when no filters applied", async () => {
    const result = await listSkills({ profileRepository: repo });
    expect(result.skills).toHaveLength(3);
  });

  it("filters by domain", async () => {
    const result = await listSkills({ profileRepository: repo }, {
      domainId: "builtin-domain-software-development",
    });

    expect(result.skills).toHaveLength(2);
    expect(result.skills.every((s) => s.domainId === "builtin-domain-software-development")).toBe(true);
  });

  it("filters by category", async () => {
    const result = await listSkills({ profileRepository: repo }, {
      categoryId: "builtin-category-software-development-languages",
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("TypeScript");
  });

  it("filters by proficiency", async () => {
    const result = await listSkills({ profileRepository: repo }, {
      proficiency: "expert",
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("Swedish");
  });

  it("combines domain and proficiency filters", async () => {
    const result = await listSkills({ profileRepository: repo }, {
      domainId: "builtin-domain-software-development",
      proficiency: "proficient",
    });

    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("TypeScript");
  });

  it("returns empty array when no skills match", async () => {
    const result = await listSkills({ profileRepository: repo }, {
      proficiency: "learning",
    });

    expect(result.skills).toHaveLength(0);
  });

  it("filters by freshness", async () => {
    // Add usage to TypeScript so it has freshness > 0
    await updateSkill({ profileRepository: repo }, {
      skillId: "skill-1",
      addUsage: [{ context: "Work", lastUsed: new Date() }],
    });

    const result = await listSkills({ profileRepository: repo }, {
      minFreshness: 0.5,
    });

    // Only TypeScript has usage, so only it passes the freshness filter
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0].name).toBe("TypeScript");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      listSkills({ profileRepository: emptyRepo }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws InvalidInputError for invalid proficiency filter", async () => {
    await expect(
      listSkills({ profileRepository: repo }, { proficiency: "supreme" }),
    ).rejects.toThrow(InvalidInputError);
  });
});
