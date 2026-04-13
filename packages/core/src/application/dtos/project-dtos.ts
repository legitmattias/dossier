import type { ProjectStatus, ProjectPriority } from "../../domain/index.js";

// --- Input DTOs ---

export interface AddProjectInput {
  readonly name: string;
  readonly description?: string;
  readonly url?: string;
  readonly role?: string;
  readonly status?: string;
  readonly priority?: string;
  readonly featured?: boolean;
  readonly visibility?: string;
  readonly skillIds?: readonly string[];
  readonly highlights?: readonly string[];
  readonly startDate?: string | Date;
  readonly endDate?: string | Date;
}

export interface UpdateProjectInput {
  readonly projectId: string;
  readonly name?: string;
  readonly description?: string;
  readonly url?: string;
  readonly role?: string;
  readonly status?: string;
  readonly priority?: string;
  readonly featured?: boolean;
  readonly visibility?: string;
  readonly skillIds?: readonly string[];
  readonly highlights?: readonly string[];
  readonly startDate?: string | Date;
  readonly endDate?: string | Date;
}

export interface RemoveProjectInput {
  readonly projectId: string;
}

export interface ListProjectsInput {
  readonly status?: string;
  readonly featured?: boolean;
}

// --- Output DTOs ---

export interface ProjectOutput {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description?: string;
  readonly url?: string;
  readonly role?: string;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly featured: boolean;
  readonly visibility: string;
  readonly skillIds: readonly string[];
  readonly highlights: readonly string[];
  readonly startDate?: string;
  readonly endDate?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AddProjectOutput {
  readonly project: ProjectOutput;
}

export interface UpdateProjectOutput {
  readonly project: ProjectOutput;
}

export interface RemoveProjectOutput {
  readonly removed: true;
}

export interface ListProjectsOutput {
  readonly projects: readonly ProjectOutput[];
}
