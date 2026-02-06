import { beforeEach, describe, expect, it } from "vitest";
import { SkillNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addSkill } from "./add-skill.js";
import { updateSkill } from "./update-skill.js";

describe("updateSkill", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed a skill
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "familiar",
    });
  });

  it("updates proficiency and returns the updated DTO", async () => {
    const result = await updateSkill({ profileRepository: repo }, {
      skillId: "skill-1",
      proficiency: "proficient",
    });

    expect(result.skill.proficiency).toBe("proficient");
    expect(result.skill.name).toBe("TypeScript");
  });

  it("updates the name", async () => {
    const result = await updateSkill({ profileRepository: repo }, {
      skillId: "skill-1",
      name: "TypeScript 5",
    });

    expect(result.skill.name).toBe("TypeScript 5");
  });

  it("adds sources and usage", async () => {
    const result = await updateSkill({ profileRepository: repo }, {
      skillId: "skill-1",
      addSources: [{ type: "assessed", detail: "Code review", date: new Date() }],
      addUsage: [{ context: "Backend API", lastUsed: new Date() }],
    });

    expect(result.skill.sources).toHaveLength(1);
    expect(result.skill.usage).toHaveLength(1);
  });

  it("persists changes in the repository", async () => {
    await updateSkill({ profileRepository: repo }, {
      skillId: "skill-1",
      proficiency: "expert",
    });

    const stored = await repo.load();
    expect(stored!.skills[0].proficiency).toBe("expert");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      updateSkill({ profileRepository: emptyRepo }, {
        skillId: "skill-1",
        proficiency: "expert",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws SkillNotFoundError for nonexistent skill", async () => {
    await expect(
      updateSkill({ profileRepository: repo }, {
        skillId: "nonexistent",
        proficiency: "expert",
      }),
    ).rejects.toThrow(SkillNotFoundError);
  });

  it("throws InvalidInputError for invalid proficiency", async () => {
    await expect(
      updateSkill({ profileRepository: repo }, {
        skillId: "skill-1",
        proficiency: "grandmaster",
      }),
    ).rejects.toThrow(InvalidInputError);
  });
});
