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
  removeInterest(input: application.RemoveInterestInput): Promise<application.RemoveInterestOutput>;

  // Projects
  addProject(input: application.AddProjectInput): Promise<application.AddProjectOutput>;
  listProjects(input?: application.ListProjectsInput): Promise<application.ListProjectsOutput>;
  updateProject(input: application.UpdateProjectInput): Promise<application.UpdateProjectOutput>;
  removeProject(input: application.RemoveProjectInput): Promise<application.RemoveProjectOutput>;

  // Domains & Categories
  addDomain(input: application.AddDomainInput): Promise<application.AddDomainOutput>;
  addCategory(input: application.AddCategoryInput): Promise<application.AddCategoryOutput>;

  // Export
  exportProfile(format: string): Promise<string>;
}
