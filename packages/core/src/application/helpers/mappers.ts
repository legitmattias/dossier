import type { Interest, LearningGoal, Project, Skill } from "../../domain/index.js";
import type { GoalOutput } from "../dtos/goal-dtos.js";
import type { InterestOutput } from "../dtos/interest-dtos.js";
import type { ProjectOutput } from "../dtos/project-dtos.js";
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
    visibility: skill.visibility,
    featured: skill.featured,
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
    ...(goal.motivation !== undefined && { motivation: goal.motivation }),
    priority: goal.priority,
    visibility: goal.visibility,
    featured: goal.featured,
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
    visibility: interest.visibility,
    featured: interest.featured,
    createdAt: interest.createdAt.toISOString(),
  };
}

/** Map a Project entity to a ProjectOutput DTO. */
export function toProjectOutput(project: Project): ProjectOutput {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    ...(project.description !== undefined && { description: project.description }),
    ...(project.url !== undefined && { url: project.url }),
    ...(project.role !== undefined && { role: project.role }),
    status: project.status,
    priority: project.priority,
    featured: project.featured,
    visibility: project.visibility,
    skillIds: project.skillIds,
    highlights: project.highlights,
    ...(project.notes !== undefined && { notes: project.notes }),
    ...(project.startDate !== undefined && { startDate: project.startDate.toISOString() }),
    ...(project.endDate !== undefined && { endDate: project.endDate.toISOString() }),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
