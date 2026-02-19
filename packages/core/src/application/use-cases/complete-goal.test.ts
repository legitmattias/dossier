import { beforeEach, describe, expect, it } from "vitest";
import { CategoryNotFoundError, GoalNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addLearningGoal } from "./add-learning-goal.js";
import { completeGoal } from "./complete-goal.js";

describe("completeGoal", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn TypeScript",
      domainId: "builtin-domain-software-development",
    });
  });

  it("completes the goal and creates a skill", async () => {
    const result = await completeGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-1",
      categoryId: "builtin-category-software-development-languages",
    });

    // Goal should be completed
    expect(result.goal.status).toBe("completed");
    expect(result.goal.progress.length).toBeGreaterThanOrEqual(1);
    expect(result.goal.progress[result.goal.progress.length - 1].percentage).toBe(100);

    // Skill should be created from goal data
    expect(result.skill.name).toBe("Learn TypeScript");
    expect(result.skill.domainId).toBe("builtin-domain-software-development");
    expect(result.skill.categoryId).toBe("builtin-category-software-development-languages");
    expect(result.skill.proficiency).toBe("beginner"); // default
  });

  it("uses specified proficiency", async () => {
    const result = await completeGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-1",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "familiar",
    });

    expect(result.skill.proficiency).toBe("familiar");
  });

  it("persists both the completed goal and new skill", async () => {
    await completeGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-1",
      categoryId: "builtin-category-software-development-languages",
    });

    const stored = await repo.load();
    expect(stored!.goals[0].status).toBe("completed");
    expect(stored!.skills).toHaveLength(1);
    expect(stored!.skills[0].name).toBe("Learn TypeScript");
  });

  it("includes a self-reported source on the created skill", async () => {
    const result = await completeGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-1",
      categoryId: "builtin-category-software-development-languages",
    });

    expect(result.skill.sources).toHaveLength(1);
    expect(result.skill.sources[0].type).toBe("self-reported");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      completeGoal({ profileRepository: emptyRepo, idGenerator: idGen }, {
        goalId: "goal-1",
        categoryId: "builtin-category-software-development-languages",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws GoalNotFoundError for nonexistent goal", async () => {
    await expect(
      completeGoal({ profileRepository: repo, idGenerator: idGen }, {
        goalId: "nonexistent",
        categoryId: "builtin-category-software-development-languages",
      }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it("throws CategoryNotFoundError for nonexistent category", async () => {
    await expect(
      completeGoal({ profileRepository: repo, idGenerator: idGen }, {
        goalId: "goal-1",
        categoryId: "nonexistent-category",
      }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it("throws InvalidInputError for invalid proficiency", async () => {
    await expect(
      completeGoal({ profileRepository: repo, idGenerator: idGen }, {
        goalId: "goal-1",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "master",
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  // Domain extensibility: non-dev domain
  it("works with the languages domain", async () => {
    // Add a language learning goal
    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Japanese",
      domainId: "builtin-domain-languages",
    });

    const result = await completeGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-2",
      categoryId: "builtin-category-languages-spoken",
      proficiency: "familiar",
    });

    expect(result.skill.name).toBe("Learn Japanese");
    expect(result.skill.domainId).toBe("builtin-domain-languages");
    expect(result.skill.categoryId).toBe("builtin-category-languages-spoken");
  });
});
