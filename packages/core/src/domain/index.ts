// Errors
export {
  DomainError,
  InvalidIdError,
  InvalidSlugError,
  InvalidNameError,
  DuplicateSkillError,
  SkillNotFoundError,
  DomainNotFoundError,
  CategoryNotFoundError,
  GoalNotFoundError,
  InterestNotFoundError,
} from "./errors/domain-errors.js";

// Value Objects — Identifiers
export type {
  SkillId,
  DomainId,
  CategoryId,
  GoalId,
  InterestId,
  ProfileId,
} from "./value-objects/identifiers.js";
export {
  toSkillId,
  toDomainId,
  toCategoryId,
  toGoalId,
  toInterestId,
  toProfileId,
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
export type { Interest, CreateInterestInput } from "./entities/interest.js";
export { createInterest } from "./entities/interest.js";

// Entities — Domain
export type { Domain, CreateDomainInput } from "./entities/domain-entity.js";
export {
  createDomain,
  addCategoryToDomain,
  findCategoryInDomain,
} from "./entities/domain-entity.js";

// Entities — Skill
export type {
  Skill,
  SkillSource,
  SkillUsage,
  CreateSkillInput,
  UpdateSkillInput,
} from "./entities/skill.js";
export { createSkill, updateSkill, getSkillFreshness } from "./entities/skill.js";

// Entities — Learning Goal
export type {
  LearningGoal,
  Progress,
  Priority,
  GoalStatus,
  Resource,
  CreateLearningGoalInput,
} from "./entities/learning-goal.js";
export {
  createLearningGoal,
  updateGoalProgress,
  completeGoal,
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
  removeInterestFromProfile,
} from "./entities/profile.js";

// Built-in Domains
export {
  SOFTWARE_DEVELOPMENT,
  LANGUAGES,
  PROFESSIONAL,
  BUILT_IN_DOMAINS,
} from "./built-in-domains.js";
