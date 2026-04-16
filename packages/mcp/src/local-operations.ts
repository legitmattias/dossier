/**
 * LocalOperations — file-based storage mode.
 * Wraps @dossier/core use cases with FileProfileRepository.
 * Used for local/self-hosted MCP (npm install, no API server needed).
 */
import { application, infrastructure } from "@dossier/core";
import type { Profile, Domain } from "@dossier/core";
import type { DossierOperations } from "./operations.js";

export class LocalOperations implements DossierOperations {
  private readonly repo: application.IProfileRepository;
  private readonly idGen: application.IIdGenerator;

  constructor(profilePath: string) {
    this.repo = new infrastructure.FileProfileRepository(profilePath);
    this.idGen = new infrastructure.UuidIdGenerator();
  }

  private get deps() {
    return { profileRepository: this.repo, idGenerator: this.idGen };
  }

  private get readDeps() {
    return { profileRepository: this.repo };
  }

  // Profile
  async getProfile(): Promise<Profile | null> {
    return this.repo.load();
  }

  async getDomains(): Promise<Domain[]> {
    const profile = await this.repo.load();
    return profile ? [...profile.domains] : [];
  }

  // Skills
  async addSkill(input: application.AddSkillInput) {
    return application.addSkill(this.deps, input);
  }

  async listSkills(input?: application.ListSkillsInput) {
    return application.listSkills(this.readDeps, input);
  }

  async updateSkill(input: application.UpdateSkillInput) {
    return application.updateSkill(this.readDeps, input);
  }

  async removeSkill(input: application.RemoveSkillInput) {
    return application.removeSkill(this.readDeps, input);
  }

  // Goals
  async addGoal(input: application.AddGoalInput) {
    return application.addLearningGoal(this.deps, input);
  }

  async listGoals(input?: { status?: string }) {
    const profile = await this.repo.load();
    if (!profile) return { goals: [] };
    let goals = [...profile.goals];
    if (input?.status) {
      goals = goals.filter((g) => g.status === input.status);
    }
    return { goals: goals.map(application.toGoalOutput) };
  }

  async updateGoalProgress(input: application.UpdateGoalProgressInput) {
    return application.updateGoalProgress(this.readDeps, input);
  }

  async completeGoal(input: application.CompleteGoalInput) {
    return application.completeGoal(this.deps, input);
  }

  async updateGoal(input: application.UpdateGoalInput) {
    return application.updateGoal(this.readDeps, input);
  }

  async removeGoal(input: application.RemoveGoalInput) {
    await application.removeGoal(this.readDeps, input);
  }

  // Interests
  async addInterest(input: application.AddInterestInput) {
    return application.addInterest(this.deps, input);
  }

  async listInterests() {
    const profile = await this.repo.load();
    if (!profile) return { interests: [] };
    return { interests: profile.interests.map(application.toInterestOutput) };
  }

  async updateInterest(input: application.UpdateInterestInput) {
    return application.updateInterest(this.readDeps, input);
  }

  async removeInterest(input: application.RemoveInterestInput) {
    return application.removeInterest(this.readDeps, input);
  }

  async promoteInterest(input: application.PromoteInterestInput) {
    return application.promoteInterest(this.deps, input);
  }

  // Projects
  async addProject(input: application.AddProjectInput) {
    return application.addProject(this.deps, input);
  }

  async listProjects(input?: application.ListProjectsInput) {
    return application.listProjects(this.readDeps, input);
  }

  async updateProject(input: application.UpdateProjectInput) {
    return application.updateProject(this.readDeps, input);
  }

  async removeProject(input: application.RemoveProjectInput) {
    return application.removeProject(this.readDeps, input);
  }

  // Search
  async searchProfile(input: application.SearchProfileInput) {
    return application.searchProfile(this.readDeps, input);
  }

  // Domains & Categories
  async addDomain(input: application.AddDomainInput) {
    return application.addDomain(this.deps, input);
  }

  async addCategory(input: application.AddCategoryInput) {
    return application.addCategory(this.deps, input);
  }

  async removeDomain(input: application.RemoveDomainInput) {
    await application.removeDomain(this.readDeps, input);
  }

  async removeCategory(input: application.RemoveCategoryInput) {
    await application.removeCategory(this.readDeps, input);
  }

  // Export
  async exportProfile(format: string): Promise<string> {
    const exporter = infrastructure.createExporter(format);
    const result = await application.exportProfile(
      { profileRepository: this.repo, exporter },
    );
    return result.content;
  }
}
