/**
 * RemoteOperations — API-backed storage mode.
 * Each operation calls the Dossier REST API via HTTP.
 * Used for multi-device cloud mode (MCP server connects to deployed API).
 */
import { getVersionInfo, infrastructure } from "@dossier/core";
import type { Profile, Domain } from "@dossier/core";
import type { application } from "@dossier/core";
import type { DossierOperations, SubmitFeedbackInput, SubmitFeedbackOutput } from "./operations.js";

export class RemoteOperations implements DossierOperations {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  private async api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
    const { method = "GET", body } = options;
    const headers: Record<string, string> = { Authorization: `Bearer ${this.apiKey}` };
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => res.statusText);
      throw new Error(`API ${method} ${path} failed (${res.status}): ${err}`);
    }

    const ct = res.headers.get("content-type") ?? "";
    return ct.includes("json") ? res.json() as Promise<T> : res.text() as unknown as T;
  }

  // Profile
  async getProfile(): Promise<Profile | null> {
    try {
      const json = await this.api<unknown>("/profile");
      return infrastructure.parseProfile(json);
    } catch {
      return null;
    }
  }

  async getDomains(): Promise<Domain[]> {
    const { domains } = await this.api<{ domains: Domain[] }>("/profile/domains");
    return domains;
  }

  // Skills
  async addSkill(input: application.AddSkillInput) {
    return this.api<application.AddSkillOutput>("/profile/skills", { method: "POST", body: input });
  }

  async listSkills(input?: application.ListSkillsInput) {
    const params = new URLSearchParams();
    if (input?.domainId) params.set("domainId", input.domainId);
    if (input?.categoryId) params.set("categoryId", input.categoryId);
    if (input?.proficiency) params.set("proficiency", input.proficiency);
    const query = params.toString();
    return this.api<application.ListSkillsOutput>(`/profile/skills${query ? `?${query}` : ""}`);
  }

  async updateSkill(input: application.UpdateSkillInput) {
    const { skillId, ...body } = input;
    return this.api<application.UpdateSkillOutput>(`/profile/skills/${skillId}`, { method: "PUT", body });
  }

  async removeSkill(input: application.RemoveSkillInput) {
    return this.api<application.RemoveSkillOutput>(`/profile/skills/${input.skillId}`, { method: "DELETE" });
  }

  // Goals
  async addGoal(input: application.AddGoalInput) {
    return this.api<application.AddGoalOutput>("/profile/goals", { method: "POST", body: input });
  }

  async listGoals(input?: { status?: string }) {
    const query = input?.status ? `?status=${input.status}` : "";
    return this.api<{ goals: readonly application.GoalOutput[] }>(`/profile/goals${query}`);
  }

  async updateGoalProgress(input: application.UpdateGoalProgressInput) {
    const { goalId, ...body } = input;
    return this.api<application.UpdateGoalProgressOutput>(`/profile/goals/${goalId}/progress`, { method: "PUT", body });
  }

  async completeGoal(input: application.CompleteGoalInput) {
    const { goalId, ...body } = input;
    return this.api<application.CompleteGoalOutput>(`/profile/goals/${goalId}/complete`, { method: "POST", body });
  }

  async demoteGoal(input: application.DemoteGoalInput) {
    return this.api<application.DemoteGoalOutput>(`/profile/goals/${input.goalId}/demote`, { method: "POST" });
  }

  async updateGoal(input: application.UpdateGoalInput) {
    const { goalId, ...body } = input;
    return this.api<application.UpdateGoalOutput>(`/profile/goals/${goalId}`, { method: "PUT", body });
  }

  async removeGoal(input: application.RemoveGoalInput) {
    await this.api<void>(`/profile/goals/${input.goalId}`, { method: "DELETE" });
  }

  // Interests
  async addInterest(input: application.AddInterestInput) {
    return this.api<application.AddInterestOutput>("/profile/interests", { method: "POST", body: input });
  }

  async listInterests() {
    return this.api<{ interests: readonly application.InterestOutput[] }>("/profile/interests");
  }

  async updateInterest(input: application.UpdateInterestInput) {
    const { interestId, ...body } = input;
    return this.api<application.UpdateInterestOutput>(`/profile/interests/${interestId}`, { method: "PUT", body });
  }

  async removeInterest(input: application.RemoveInterestInput) {
    return this.api<application.RemoveInterestOutput>(`/profile/interests/${input.interestId}`, { method: "DELETE" });
  }

  async promoteInterest(input: application.PromoteInterestInput) {
    const { interestId, ...body } = input;
    return this.api<application.PromoteInterestOutput>(`/profile/interests/${interestId}/promote`, { method: "POST", body });
  }

  // Projects
  async addProject(input: application.AddProjectInput) {
    return this.api<application.AddProjectOutput>("/profile/projects", { method: "POST", body: input });
  }

  async listProjects(input?: application.ListProjectsInput) {
    const params = new URLSearchParams();
    if (input?.status) params.set("status", input.status);
    if (input?.featured !== undefined) params.set("featured", String(input.featured));
    const query = params.toString();
    return this.api<application.ListProjectsOutput>(`/profile/projects${query ? `?${query}` : ""}`);
  }

  async updateProject(input: application.UpdateProjectInput) {
    const { projectId, ...body } = input;
    return this.api<application.UpdateProjectOutput>(`/profile/projects/${projectId}`, { method: "PUT", body });
  }

  async removeProject(input: application.RemoveProjectInput) {
    return this.api<application.RemoveProjectOutput>(`/profile/projects/${input.projectId}`, { method: "DELETE" });
  }

  // Search
  async searchProfile(input: application.SearchProfileInput) {
    const params = new URLSearchParams({ q: input.query });
    return this.api<application.SearchProfileOutput>(`/profile/search?${params}`);
  }

  // Domains & Categories
  async addDomain(input: application.AddDomainInput) {
    return this.api<application.AddDomainOutput>("/profile/domains", { method: "POST", body: input });
  }

  async updateDomain(input: application.UpdateDomainInput) {
    const { domainId, ...body } = input;
    return this.api<application.UpdateDomainOutput>(`/profile/domains/${domainId}`, { method: "PUT", body });
  }

  async addCategory(input: application.AddCategoryInput) {
    const { domainId, ...body } = input;
    return this.api<application.AddCategoryOutput>(`/profile/domains/${domainId}/categories`, { method: "POST", body });
  }

  async removeDomain(input: application.RemoveDomainInput) {
    await this.api<void>(`/profile/domains/${input.domainId}`, { method: "DELETE" });
  }

  async removeCategory(input: application.RemoveCategoryInput) {
    await this.api<void>(`/profile/domains/${input.domainId}/categories/${input.categoryId}`, { method: "DELETE" });
  }

  // Export
  async exportProfile(format: string): Promise<string> {
    return this.api<string>(`/profile/export?format=${format}`);
  }

  // Feedback
  async submitFeedback(input: SubmitFeedbackInput): Promise<SubmitFeedbackOutput> {
    const info = getVersionInfo();
    return this.api<SubmitFeedbackOutput>("/feedback", {
      method: "POST",
      body: {
        ...input,
        clientName: "dossier-mcp",
        clientVersion: info.version,
        clientSha: info.commitSha,
      },
    });
  }
}
