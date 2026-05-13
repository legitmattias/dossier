import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toDomainId, toGoalId, toResourceId } from "../value-objects/identifiers.js";
import { completeGoal, createLearningGoal, updateGoalProgress } from "./learning-goal.js";
import type { Resource } from "./learning-goal.js";

const baseInput = {
  id: toGoalId("goal-1"),
  name: "Learn Rust",
  domainId: toDomainId("domain-sw"),
} as const;

describe("createLearningGoal", () => {
  it("creates a goal with required fields and defaults", () => {
    const goal = createLearningGoal(baseInput);

    expect(goal.id).toBe("goal-1");
    expect(goal.name).toBe("Learn Rust");
    expect(goal.domainId).toBe("domain-sw");
    expect(goal.priority).toBe("medium");
    expect(goal.status).toBe("active");
    expect(goal.progress).toEqual([]);
    expect(goal.resources).toEqual([]);
    expect(goal.description).toBeUndefined();
    expect(goal.targetDate).toBeUndefined();
    expect(goal.createdAt).toBeInstanceOf(Date);
    expect(goal.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a goal with all optional fields", () => {
    const resource: Resource = {
      id: toResourceId("resource-test-1"),
      title: "The Rust Book",
      url: "https://doc.rust-lang.org/book/",
      type: "documentation",
      completed: false,
    };

    const targetDate = new Date("2025-12-31");
    const goal = createLearningGoal({
      ...baseInput,
      description: "Systems programming with Rust",
      priority: "high",
      status: "active",
      resources: [resource],
      targetDate,
    });

    expect(goal.description).toBe("Systems programming with Rust");
    expect(goal.priority).toBe("high");
    expect(goal.resources).toHaveLength(1);
    expect(goal.resources[0]!.title).toBe("The Rust Book");
    expect(goal.targetDate).toBe(targetDate);
  });

  it("trims the name", () => {
    const goal = createLearningGoal({ ...baseInput, name: "  Learn Rust  " });
    expect(goal.name).toBe("Learn Rust");
  });

  // Domain extensibility
  it("works for language learning goals", () => {
    const goal = createLearningGoal({
      id: toGoalId("goal-lang-1"),
      name: "Reach B2 in French",
      domainId: toDomainId("domain-languages"),
      priority: "high",
      resources: [
        { id: toResourceId("resource-test-2"), title: "Duolingo", type: "course", completed: false },
      ],
    });

    expect(goal.name).toBe("Reach B2 in French");
    expect(goal.domainId).toBe("domain-languages");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() => createLearningGoal({ ...baseInput, name: "" })).toThrow(InvalidNameError);
  });

  it("throws InvalidNameError for whitespace-only name", () => {
    expect(() => createLearningGoal({ ...baseInput, name: "   " })).toThrow(InvalidNameError);
  });
});

describe("updateGoalProgress", () => {
  const goal = createLearningGoal(baseInput);

  it("adds a progress entry", () => {
    const updated = updateGoalProgress(goal, 25, "Finished chapter 1");

    expect(updated.progress).toHaveLength(1);
    expect(updated.progress[0]!.percentage).toBe(25);
    expect(updated.progress[0]!.note).toBe("Finished chapter 1");
    expect(updated.progress[0]!.updatedAt).toBeInstanceOf(Date);
  });

  it("accumulates multiple progress entries", () => {
    const step1 = updateGoalProgress(goal, 25);
    const step2 = updateGoalProgress(step1, 50);
    const step3 = updateGoalProgress(step2, 75);

    expect(step3.progress).toHaveLength(3);
    expect(step3.progress[0]!.percentage).toBe(25);
    expect(step3.progress[2]!.percentage).toBe(75);
  });

  it("clamps percentage to 0-100", () => {
    const over = updateGoalProgress(goal, 150);
    expect(over.progress[0]!.percentage).toBe(100);

    const under = updateGoalProgress(goal, -10);
    expect(under.progress[0]!.percentage).toBe(0);
  });

  it("updates the updatedAt timestamp", () => {
    const updated = updateGoalProgress(goal, 50);
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(goal.updatedAt.getTime());
  });

  it("does not mutate the original goal", () => {
    updateGoalProgress(goal, 50);
    expect(goal.progress).toEqual([]);
  });

  it("omits note when not provided", () => {
    const updated = updateGoalProgress(goal, 25);
    expect(updated.progress[0]!.note).toBeUndefined();
  });
});

describe("completeGoal", () => {
  const goal = createLearningGoal(baseInput);

  it("sets status to completed", () => {
    const completed = completeGoal(goal);
    expect(completed.status).toBe("completed");
  });

  it("adds a 100% progress entry", () => {
    const completed = completeGoal(goal);
    expect(completed.progress).toHaveLength(1);
    expect(completed.progress[0]!.percentage).toBe(100);
    expect(completed.progress[0]!.note).toBe("Goal completed");
  });

  it("preserves existing progress entries", () => {
    const withProgress = updateGoalProgress(goal, 75, "Almost done");
    const completed = completeGoal(withProgress);

    expect(completed.progress).toHaveLength(2);
    expect(completed.progress[0]!.percentage).toBe(75);
    expect(completed.progress[1]!.percentage).toBe(100);
  });

  it("does not mutate the original goal", () => {
    completeGoal(goal);
    expect(goal.status).toBe("active");
    expect(goal.progress).toEqual([]);
  });
});
