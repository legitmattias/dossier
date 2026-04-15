import { beforeEach, describe, expect, it } from "vitest";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addSkill } from "./add-skill.js";
import { addLearningGoal } from "./add-learning-goal.js";
import { addInterest } from "./add-interest.js";
import { addProject } from "./add-project.js";
import { searchProfile } from "./search-profile.js";

describe("searchProfile", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    const deps = { profileRepository: repo, idGenerator: idGen };
    await addSkill(deps, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });
    await addSkill(deps, {
      name: "JavaScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "advanced",
    });
    await addLearningGoal(deps, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
    });
    await addInterest(deps, {
      name: "Type Theory",
      domainId: "builtin-domain-software-development",
    });
    await addProject(deps, { name: "TypeScript Compiler Plugin" });
  });

  it("finds skills by partial name match", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "type" });
    expect(result.results.skills).toHaveLength(1);
    expect(result.results.skills[0].name).toBe("TypeScript");
  });

  it("is case-insensitive", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "typescript" });
    expect(result.results.skills).toHaveLength(1);
    expect(result.results.skills[0].name).toBe("TypeScript");
  });

  it("searches across all entity types", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "type" });
    expect(result.results.skills.length).toBeGreaterThan(0);
    expect(result.results.interests.length).toBeGreaterThan(0);
    expect(result.results.projects.length).toBeGreaterThan(0);
    expect(result.total).toBe(3);
  });

  it("returns empty results when nothing matches", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "xyznonexistent" });
    expect(result.total).toBe(0);
    expect(result.results.skills).toHaveLength(0);
    expect(result.results.goals).toHaveLength(0);
  });

  it("returns correct total count", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "Script" });
    expect(result.total).toBe(3);
  });

  it("includes IDs and type for follow-up operations", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "TypeScript" });
    for (const skill of result.results.skills) {
      expect(skill.id).toBeDefined();
      expect(skill.type).toBe("skill");
    }
  });

  it("includes meta information", async () => {
    const result = await searchProfile({ profileRepository: repo }, { query: "Rust" });
    expect(result.results.goals[0].meta).toContain("active");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      searchProfile({ profileRepository: emptyRepo }, { query: "test" }),
    ).rejects.toThrow(ProfileNotFoundError);
  });
});
