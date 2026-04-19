/**
 * DossierOperations — the interface between MCP tools and Dossier's backend.
 * Two implementations: LocalOperations (file mode) and RemoteOperations (API mode).
 */
import type { Profile, Domain } from "@dossier/core";
import type { application } from "@dossier/core";

export interface DossierOperations {
  // Profile reads
  getProfile(): Promise<Profile | null>;
  getDomains(): Promise<Domain[]>;

  // Skills
  addSkill(input: application.AddSkillInput): Promise<application.AddSkillOutput>;
  listSkills(input?: application.ListSkillsInput): Promise<application.ListSkillsOutput>;
  updateSkill(input: application.UpdateSkillInput): Promise<application.UpdateSkillOutput>;
  removeSkill(input: application.RemoveSkillInput): Promise<application.RemoveSkillOutput>;

  // Goals
  addGoal(input: application.AddGoalInput): Promise<application.AddGoalOutput>;
  listGoals(input?: { status?: string }): Promise<{ goals: readonly application.GoalOutput[] }>;
  updateGoalProgress(input: application.UpdateGoalProgressInput): Promise<application.UpdateGoalProgressOutput>;
  completeGoal(input: application.CompleteGoalInput): Promise<application.CompleteGoalOutput>;

  // Interests
  addInterest(input: application.AddInterestInput): Promise<application.AddInterestOutput>;
  listInterests(): Promise<{ interests: readonly application.InterestOutput[] }>;
  updateInterest(input: application.UpdateInterestInput): Promise<application.UpdateInterestOutput>;
  removeInterest(input: application.RemoveInterestInput): Promise<application.RemoveInterestOutput>;
  promoteInterest(input: application.PromoteInterestInput): Promise<application.PromoteInterestOutput>;

  // Projects
  addProject(input: application.AddProjectInput): Promise<application.AddProjectOutput>;
  listProjects(input?: application.ListProjectsInput): Promise<application.ListProjectsOutput>;
  updateProject(input: application.UpdateProjectInput): Promise<application.UpdateProjectOutput>;
  removeProject(input: application.RemoveProjectInput): Promise<application.RemoveProjectOutput>;

  // Goals (additional)
  updateGoal(input: application.UpdateGoalInput): Promise<application.UpdateGoalOutput>;
  removeGoal(input: application.RemoveGoalInput): Promise<void>;

  // Domains & Categories
  addDomain(input: application.AddDomainInput): Promise<application.AddDomainOutput>;
  updateDomain(input: application.UpdateDomainInput): Promise<application.UpdateDomainOutput>;
  addCategory(input: application.AddCategoryInput): Promise<application.AddCategoryOutput>;
  removeDomain(input: application.RemoveDomainInput): Promise<void>;
  removeCategory(input: application.RemoveCategoryInput): Promise<void>;

  // Search
  searchProfile(input: application.SearchProfileInput): Promise<application.SearchProfileOutput>;

  // Export
  exportProfile(format: string): Promise<string>;

  // Feedback (remote only — local mode throws)
  submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackOutput>;
}

export interface SubmitFeedbackInput {
  readonly category: "bug" | "friction" | "suggestion" | "missing-feature" | "other";
  readonly severity?: "low" | "medium" | "high" | "critical";
  readonly message: string;
  readonly reproduction?: string;
  readonly confirmed: true;
}

export interface SubmitFeedbackOutput {
  readonly id: string;
  readonly status: string;
  readonly acknowledged: boolean;
}
