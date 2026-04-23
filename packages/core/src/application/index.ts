// Ports
export type { IProfileRepository } from "./ports/profile-repository.js";
export type { IIdGenerator } from "./ports/id-generator.js";
export type { IExporter, ExportOptions } from "./ports/exporter.js";

// Errors
export {
  ApplicationError,
  ProfileNotFoundError,
  InvalidInputError,
} from "./errors/application-errors.js";

// DTOs — Skills
export type {
  AddSkillInput,
  AddSkillOutput,
  UpdateSkillInput,
  UpdateSkillOutput,
  RemoveSkillInput,
  RemoveSkillOutput,
  ListSkillsInput,
  ListSkillsOutput,
  SkillOutput,
} from "./dtos/skill-dtos.js";

// DTOs — Goals
export type {
  AddGoalInput,
  AddGoalOutput,
  UpdateGoalProgressInput,
  UpdateGoalProgressOutput,
  CompleteGoalInput,
  CompleteGoalOutput,
  DemoteGoalInput,
  DemoteGoalOutput,
  GoalOutput,
} from "./dtos/goal-dtos.js";

// DTOs — Interests
export type {
  AddInterestInput,
  AddInterestOutput,
  RemoveInterestInput,
  RemoveInterestOutput,
  PromoteInterestInput,
  PromoteInterestOutput,
  InterestOutput,
} from "./dtos/interest-dtos.js";

// DTOs — Projects
export type {
  AddProjectInput,
  AddProjectOutput,
  UpdateProjectInput,
  UpdateProjectOutput,
  RemoveProjectInput,
  RemoveProjectOutput,
  ListProjectsInput,
  ListProjectsOutput,
  ProjectOutput,
} from "./dtos/project-dtos.js";

// DTOs — Export
export type {
  ExportProfileInput,
  ExportProfileOutput,
} from "./dtos/export-dtos.js";

// Helpers
export { slugify } from "./helpers/slugify.js";
export { toSkillOutput, toGoalOutput, toInterestOutput, toProjectOutput } from "./helpers/mappers.js";
export { validateProficiency, validatePriority, validateGoalStatus } from "./helpers/validation.js";

// Use Cases — Skills
export { addSkill } from "./use-cases/add-skill.js";
export type { AddSkillDeps } from "./use-cases/add-skill.js";
export { updateSkill } from "./use-cases/update-skill.js";
export type { UpdateSkillDeps } from "./use-cases/update-skill.js";
export { removeSkill } from "./use-cases/remove-skill.js";
export type { RemoveSkillDeps } from "./use-cases/remove-skill.js";
export { listSkills } from "./use-cases/list-skills.js";
export type { ListSkillsDeps } from "./use-cases/list-skills.js";

// Use Cases — Goals
export { addLearningGoal } from "./use-cases/add-learning-goal.js";
export type { AddLearningGoalDeps } from "./use-cases/add-learning-goal.js";
export { updateGoalProgress } from "./use-cases/update-goal-progress.js";
export type { UpdateGoalProgressDeps } from "./use-cases/update-goal-progress.js";
export { completeGoal } from "./use-cases/complete-goal.js";
export type { CompleteGoalDeps } from "./use-cases/complete-goal.js";
export { demoteGoal } from "./use-cases/demote-goal.js";
export type { DemoteGoalDeps } from "./use-cases/demote-goal.js";
export { updateGoal } from "./use-cases/update-goal.js";
export type { UpdateGoalDeps, UpdateGoalInput, UpdateGoalOutput } from "./use-cases/update-goal.js";
export { removeGoal } from "./use-cases/remove-goal.js";
export type { RemoveGoalDeps, RemoveGoalInput } from "./use-cases/remove-goal.js";

// Use Cases — Interests
export { addInterest } from "./use-cases/add-interest.js";
export type { AddInterestDeps } from "./use-cases/add-interest.js";
export { removeInterest } from "./use-cases/remove-interest.js";
export type { RemoveInterestDeps } from "./use-cases/remove-interest.js";
export { updateInterest } from "./use-cases/update-interest.js";
export type { UpdateInterestDeps, UpdateInterestInput, UpdateInterestOutput } from "./use-cases/update-interest.js";
export { promoteInterest } from "./use-cases/promote-interest.js";
export type { PromoteInterestDeps } from "./use-cases/promote-interest.js";

// Use Cases — Domains & Categories
export { addDomain } from "./use-cases/add-domain.js";
export type { AddDomainDeps, AddDomainInput, AddDomainOutput } from "./use-cases/add-domain.js";
export { removeDomain } from "./use-cases/remove-domain.js";
export type { RemoveDomainDeps, RemoveDomainInput } from "./use-cases/remove-domain.js";
export { addCategory } from "./use-cases/add-category.js";
export type { AddCategoryDeps, AddCategoryInput, AddCategoryOutput } from "./use-cases/add-category.js";
export { removeCategory } from "./use-cases/remove-category.js";
export type { RemoveCategoryDeps, RemoveCategoryInput } from "./use-cases/remove-category.js";
export { updateDomain } from "./use-cases/update-domain.js";
export type { UpdateDomainDeps, UpdateDomainInput, UpdateDomainOutput } from "./use-cases/update-domain.js";

// Use Cases — Projects
export { addProject } from "./use-cases/add-project.js";
export type { AddProjectDeps } from "./use-cases/add-project.js";
export { updateProject } from "./use-cases/update-project.js";
export type { UpdateProjectDeps } from "./use-cases/update-project.js";
export { removeProject } from "./use-cases/remove-project.js";
export type { RemoveProjectDeps } from "./use-cases/remove-project.js";
export { listProjects } from "./use-cases/list-projects.js";
export type { ListProjectsDeps } from "./use-cases/list-projects.js";

// DTOs — Search
export type {
  SearchProfileInput,
  SearchProfileOutput,
  SearchResultItem,
} from "./dtos/search-dtos.js";

// Use Cases — Search
export { searchProfile } from "./use-cases/search-profile.js";
export type { SearchProfileDeps } from "./use-cases/search-profile.js";

// Helpers — Resolve
export { resolveDomainInProfile, resolveCategoryInDomain } from "./helpers/resolve.js";

// Use Cases — Export
export { exportProfile } from "./use-cases/export-profile.js";
export type { ExportProfileDeps } from "./use-cases/export-profile.js";
