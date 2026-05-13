// Errors
export {
  DomainError,
  InvalidIdError,
  InvalidSlugError,
  InvalidNameError,
  DuplicateSkillError,
  DuplicateNameError,
  SkillNotFoundError,
  DomainNotFoundError,
  CategoryNotFoundError,
  GoalNotFoundError,
  InterestNotFoundError,
  ProjectNotFoundError,
} from "./errors/domain-errors.js";

// Value Objects — Identifiers
export type {
  SkillId,
  DomainId,
  CategoryId,
  GoalId,
  InterestId,
  ProjectId,
  ProfileId,
  ResourceId,
} from "./value-objects/identifiers.js";
export {
  toSkillId,
  toDomainId,
  toCategoryId,
  toGoalId,
  toInterestId,
  toProjectId,
  toProfileId,
  toResourceId,
} from "./value-objects/identifiers.js";

// Value Objects — Slug
export type { Slug } from "./value-objects/slug.js";
export { createSlug } from "./value-objects/slug.js";

// Value Objects — Proficiency
export type { Proficiency } from "./value-objects/proficiency.js";
export {
  PROFICIENCY_LEVELS,
  isProficiency,
  compareProficiency,
} from "./value-objects/proficiency.js";

// Entities — Category
export type { Category, CreateCategoryInput } from "./entities/category.js";
export { createCategory } from "./entities/category.js";

// Entities — Interest
export type { Interest, CreateInterestInput, InterestPrivateField } from "./entities/interest.js";
export { createInterest, INTEREST_PRIVATE_ELIGIBLE_FIELDS } from "./entities/interest.js";

// Entities — Project
export type { Project, CreateProjectInput, ProjectStatus, ProjectPriority, ProjectPrivateField } from "./entities/project.js";
export { createProject, PROJECT_PRIVATE_ELIGIBLE_FIELDS } from "./entities/project.js";

// Entities — Domain
export type { Domain, CreateDomainInput, ProficiencyLabels } from "./entities/domain-entity.js";
export {
  createDomain,
  addCategoryToDomain,
  findCategoryInDomain,
} from "./entities/domain-entity.js";

// Entities — Skill
export type {
  Skill,
  SkillSource,
  CreateSkillInput,
  UpdateSkillInput,
  SkillPrivateField,
} from "./entities/skill.js";
export { createSkill, updateSkill, SKILL_PRIVATE_ELIGIBLE_FIELDS } from "./entities/skill.js";

// Entities — Learning Goal
export type {
  LearningGoal,
  Progress,
  Priority,
  GoalStatus,
  Resource,
  ResourceType,
  CreateResourceInput,
  UpdateResourceInput,
  CreateLearningGoalInput,
  GoalPrivateField,
} from "./entities/learning-goal.js";
export {
  createLearningGoal,
  updateGoalProgress,
  completeGoal,
  createResource,
  addResourceToGoal,
  removeResourceFromGoal,
  updateResourceInGoal,
  RESOURCE_TYPES,
  GOAL_PRIVATE_ELIGIBLE_FIELDS,
} from "./entities/learning-goal.js";

// Entities — Profile (aggregate root)
export type {
  Profile,
  ProfileSettings,
  CreateProfileInput,
} from "./entities/profile.js";
export {
  createProfile,
  addDomainToProfile,
  findDomainInProfile,
  removeDomainFromProfile,
  addSkillToProfile,
  findSkillInProfile,
  updateSkillInProfile,
  removeSkillFromProfile,
  addGoalToProfile,
  findGoalInProfile,
  updateGoalInProfile,
  removeGoalFromProfile,
  addInterestToProfile,
  findInterestInProfile,
  updateInterestInProfile,
  removeInterestFromProfile,
  addProjectToProfile,
  findProjectInProfile,
  updateProjectInProfile,
  removeProjectFromProfile,
} from "./entities/profile.js";

// Built-in Domains
export {
  SOFTWARE_DEVELOPMENT,
  LANGUAGES,
  PROFESSIONAL,
  BUILT_IN_DOMAINS,
} from "./built-in-domains.js";
