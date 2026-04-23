import { beforeEach, describe, expect, it } from "vitest";

import { GoalNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addLearningGoal } from "./add-learning-goal.js";
import { updateGoal } from "./update-goal.js";
import { updateGoalProgress } from "./update-goal-progress.js";
import { demoteGoal } from "./demote-goal.js";

describe("demoteGoal", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
      description: "Systems programming deep dive",
      notes: "Focus on memory model",
      motivation: "Stay relevant",
      priority: "high",
      targetDate: "2027-01-01",
    });
  });

  it("creates an interest with name, domain, description, notes", async () => {
    const result = await demoteGoal({ profileRepository: repo, idGenerator: idGen }, {
      goalId: "goal-1",
    });

    expect(result.interest.name).toBe("Learn Rust");
    expect(result.interest.domainId).toBe("builtin-domain-software-development");
    expect(result.interest.description).toBe("Systems programming deep dive");
    expect(result.interest.notes).toBe("Focus on memory model");
  });

  it("removes the goal from the profile", async () => {
    await demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "goal-1" });

    const profile = await repo.load();
    expect(profile!.goals.find((g) => g.id === "goal-1")).toBeUndefined();
  });

  it("adds the interest to the profile", async () => {
    const result = await demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "goal-1" });

    const profile = await repo.load();
    expect(profile!.interests.find((i) => i.id === result.interest.id)).toBeDefined();
  });

  it("preserves featured flag and visibility", async () => {
    await updateGoal({ profileRepository: repo }, {
      goalId: "goal-1",
      featured: true,
      visibility: "private",
    });

    const result = await demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "goal-1" });

    expect(result.interest.featured).toBe(true);
    expect(result.interest.visibility).toBe("private");
  });

  it("drops priority/status/progress/resources/motivation/targetDate", async () => {
    // Add progress and confirm goal has all these set
    await updateGoalProgress({ profileRepository: repo }, { goalId: "goal-1", percentage: 40 });

    const result = await demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "goal-1" });

    // Interest has no concept of these fields
    expect(result.interest).not.toHaveProperty("priority");
    expect(result.interest).not.toHaveProperty("status");
    expect(result.interest).not.toHaveProperty("progress");
    expect(result.interest).not.toHaveProperty("resources");
    expect(result.interest).not.toHaveProperty("motivation");
    expect(result.interest).not.toHaveProperty("targetDate");
  });

  it("demotes a completed goal too", async () => {
    await updateGoal({ profileRepository: repo }, { goalId: "goal-1", status: "completed" });

    const result = await demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "goal-1" });

    expect(result.interest.name).toBe("Learn Rust");
  });

  it("throws GoalNotFoundError when goal doesn't exist", async () => {
    await expect(
      demoteGoal({ profileRepository: repo, idGenerator: idGen }, { goalId: "nonexistent-goal" }),
    ).rejects.toThrow(GoalNotFoundError);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      demoteGoal({ profileRepository: emptyRepo, idGenerator: idGen }, { goalId: "goal-1" }),
    ).rejects.toThrow(ProfileNotFoundError);
  });
});
