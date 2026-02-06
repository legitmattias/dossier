import { beforeEach, describe, expect, it } from "vitest";
import { DomainNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addLearningGoal } from "./add-learning-goal.js";

describe("addLearningGoal", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());
  });

  it("adds a goal and returns the DTO", async () => {
    const result = await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
      description: "Systems programming language",
      priority: "high",
    });

    expect(result.goal.id).toBe("goal-1");
    expect(result.goal.name).toBe("Learn Rust");
    expect(result.goal.domainId).toBe("builtin-domain-software-development");
    expect(result.goal.description).toBe("Systems programming language");
    expect(result.goal.priority).toBe("high");
    expect(result.goal.status).toBe("active");
    expect(result.goal.progress).toHaveLength(0);
  });

  it("persists the goal in the repository", async () => {
    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
    });

    const stored = await repo.load();
    expect(stored!.goals).toHaveLength(1);
    expect(stored!.goals[0].name).toBe("Learn Rust");
  });

  it("uses default priority when not specified", async () => {
    const result = await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Go",
      domainId: "builtin-domain-software-development",
    });

    expect(result.goal.priority).toBe("medium");
  });

  it("accepts targetDate as string", async () => {
    const result = await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn French",
      domainId: "builtin-domain-languages",
      targetDate: "2026-06-01T00:00:00.000Z",
    });

    expect(result.goal.targetDate).toBe("2026-06-01T00:00:00.000Z");
  });

  it("accepts targetDate as Date", async () => {
    const date = new Date("2026-06-01T00:00:00.000Z");
    const result = await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn French",
      domainId: "builtin-domain-languages",
      targetDate: date,
    });

    expect(result.goal.targetDate).toBe("2026-06-01T00:00:00.000Z");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      addLearningGoal({ profileRepository: emptyRepo, idGenerator: idGen }, {
        name: "Learn Rust",
        domainId: "builtin-domain-software-development",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws DomainNotFoundError for nonexistent domain", async () => {
    await expect(
      addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
        name: "Learn Rust",
        domainId: "nonexistent-domain",
      }),
    ).rejects.toThrow(DomainNotFoundError);
  });

  it("throws InvalidInputError for invalid priority", async () => {
    await expect(
      addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
        name: "Learn Rust",
        domainId: "builtin-domain-software-development",
        priority: "urgent",
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  // Domain extensibility: non-dev domain
  it("works with the languages domain", async () => {
    const result = await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Improve spoken Mandarin",
      domainId: "builtin-domain-languages",
      priority: "high",
    });

    expect(result.goal.name).toBe("Improve spoken Mandarin");
    expect(result.goal.domainId).toBe("builtin-domain-languages");
  });
});
