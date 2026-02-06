import { beforeEach, describe, expect, it } from "vitest";
import { SkillNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addSkill } from "./add-skill.js";
import { removeSkill } from "./remove-skill.js";

describe("removeSkill", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });
  });

  it("removes the skill and returns confirmation", async () => {
    const result = await removeSkill({ profileRepository: repo }, {
      skillId: "skill-1",
    });

    expect(result.removed).toBe(true);
  });

  it("persists the removal in the repository", async () => {
    await removeSkill({ profileRepository: repo }, { skillId: "skill-1" });

    const stored = await repo.load();
    expect(stored!.skills).toHaveLength(0);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      removeSkill({ profileRepository: emptyRepo }, { skillId: "skill-1" }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws SkillNotFoundError for nonexistent skill", async () => {
    await expect(
      removeSkill({ profileRepository: repo }, { skillId: "nonexistent" }),
    ).rejects.toThrow(SkillNotFoundError);
  });
});
