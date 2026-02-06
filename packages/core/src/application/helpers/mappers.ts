import type { Interest, LearningGoal, Skill } from "../../domain/index.js";
import type { GoalOutput } from "../dtos/goal-dtos.js";
import type { InterestOutput } from "../dtos/interest-dtos.js";
import type { SkillOutput } from "../dtos/skill-dtos.js";

/** Map a Skill entity to a SkillOutput DTO. */
export function toSkillOutput(skill: Skill): SkillOutput {
  return {
    id: skill.id,
    slug: skill.slug,
    name: skill.name,
    domainId: skill.domainId,
    categoryId: skill.categoryId,
    proficiency: skill.proficiency,
    sources: skill.sources,
    usage: skill.usage,
    ...(skill.notes !== undefined && { notes: skill.notes }),
    createdAt: skill.createdAt.toISOString(),
    updatedAt: skill.updatedAt.toISOString(),
  };
}

/** Map a LearningGoal entity to a GoalOutput DTO. */
export function toGoalOutput(goal: LearningGoal): GoalOutput {
  return {
    id: goal.id,
    name: goal.name,
    domainId: goal.domainId,
    ...(goal.description !== undefined && { description: goal.description }),
    priority: goal.priority,
    status: goal.status,
    progress: goal.progress,
    resources: goal.resources,
    ...(goal.targetDate !== undefined && {
      targetDate: goal.targetDate.toISOString(),
    }),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

/** Map an Interest entity to an InterestOutput DTO. */
export function toInterestOutput(interest: Interest): InterestOutput {
  return {
    id: interest.id,
    name: interest.name,
    domainId: interest.domainId,
    ...(interest.description !== undefined && {
      description: interest.description,
    }),
    createdAt: interest.createdAt.toISOString(),
  };
}
