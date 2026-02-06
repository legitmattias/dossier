import { beforeEach, describe, expect, it } from "vitest";
import { GoalNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addLearningGoal } from "./add-learning-goal.js";
import { updateGoalProgress } from "./update-goal-progress.js";

describe("updateGoalProgress", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
    });
  });

  it("updates progress and returns the DTO", async () => {
    const result = await updateGoalProgress({ profileRepository: repo }, {
      goalId: "goal-1",
      percentage: 30,
      note: "Finished first chapter",
    });

    expect(result.goal.progress).toHaveLength(1);
    expect(result.goal.progress[0].percentage).toBe(30);
    expect(result.goal.progress[0].note).toBe("Finished first chapter");
  });

  it("appends to existing progress entries", async () => {
    await updateGoalProgress({ profileRepository: repo }, {
      goalId: "goal-1",
      percentage: 30,
    });

    const result = await updateGoalProgress({ profileRepository: repo }, {
      goalId: "goal-1",
      percentage: 60,
      note: "Halfway done",
    });

    expect(result.goal.progress).toHaveLength(2);
    expect(result.goal.progress[0].percentage).toBe(30);
    expect(result.goal.progress[1].percentage).toBe(60);
  });

  it("clamps percentage to 0-100 range", async () => {
    const result = await updateGoalProgress({ profileRepository: repo }, {
      goalId: "goal-1",
      percentage: 150,
    });

    expect(result.goal.progress[0].percentage).toBe(100);
  });

  it("persists changes in the repository", async () => {
    await updateGoalProgress({ profileRepository: repo }, {
      goalId: "goal-1",
      percentage: 50,
    });

    const stored = await repo.load();
    expect(stored!.goals[0].progress).toHaveLength(1);
    expect(stored!.goals[0].progress[0].percentage).toBe(50);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      updateGoalProgress({ profileRepository: emptyRepo }, {
        goalId: "goal-1",
        percentage: 50,
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws GoalNotFoundError for nonexistent goal", async () => {
    await expect(
      updateGoalProgress({ profileRepository: repo }, {
        goalId: "nonexistent",
        percentage: 50,
      }),
    ).rejects.toThrow(GoalNotFoundError);
  });
});
