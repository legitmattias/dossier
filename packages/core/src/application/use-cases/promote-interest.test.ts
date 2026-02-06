import { beforeEach, describe, expect, it } from "vitest";
import { InterestNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { InvalidInputError, ProfileNotFoundError } from "../errors/application-errors.js";
import { addInterest } from "./add-interest.js";
import { promoteInterest } from "./promote-interest.js";

describe("promoteInterest", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "WebAssembly",
      domainId: "builtin-domain-software-development",
      description: "Low-level web tech",
    });
  });

  it("removes the interest and creates a goal", async () => {
    const result = await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-1",
    });

    expect(result.goal.name).toBe("WebAssembly");
    expect(result.goal.domainId).toBe("builtin-domain-software-development");
    expect(result.goal.status).toBe("active");
    expect(result.goal.priority).toBe("medium"); // default
  });

  it("uses the interest description as goal description when not overridden", async () => {
    const result = await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-1",
    });

    expect(result.goal.description).toBe("Low-level web tech");
  });

  it("allows overriding description", async () => {
    const result = await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-1",
      description: "Deep dive into WebAssembly",
    });

    expect(result.goal.description).toBe("Deep dive into WebAssembly");
  });

  it("accepts priority and targetDate", async () => {
    const result = await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-1",
      priority: "high",
      targetDate: "2026-12-01T00:00:00.000Z",
    });

    expect(result.goal.priority).toBe("high");
    expect(result.goal.targetDate).toBe("2026-12-01T00:00:00.000Z");
  });

  it("persists: interest removed and goal added", async () => {
    await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-1",
    });

    const stored = await repo.load();
    expect(stored!.interests).toHaveLength(0);
    expect(stored!.goals).toHaveLength(1);
    expect(stored!.goals[0].name).toBe("WebAssembly");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      promoteInterest({ profileRepository: emptyRepo, idGenerator: idGen }, {
        interestId: "interest-1",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws InterestNotFoundError for nonexistent interest", async () => {
    await expect(
      promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
        interestId: "nonexistent",
      }),
    ).rejects.toThrow(InterestNotFoundError);
  });

  it("throws InvalidInputError for invalid priority", async () => {
    await expect(
      promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
        interestId: "interest-1",
        priority: "critical",
      }),
    ).rejects.toThrow(InvalidInputError);
  });

  // Domain extensibility: non-dev domain
  it("works with the professional domain", async () => {
    await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "Public Speaking",
      domainId: "builtin-domain-professional",
    });

    const result = await promoteInterest({ profileRepository: repo, idGenerator: idGen }, {
      interestId: "interest-2",
      priority: "high",
    });

    expect(result.goal.name).toBe("Public Speaking");
    expect(result.goal.domainId).toBe("builtin-domain-professional");
  });
});
