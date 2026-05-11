import { InvalidNameError } from "../errors/domain-errors.js";
import type { ProjectId } from "../value-objects/identifiers.js";
import type { Slug } from "../value-objects/slug.js";

export type ProjectStatus = "active" | "completed" | "paused" | "ideation";
export type ProjectPriority = "low" | "medium" | "high";

export const PROJECT_PRIVATE_ELIGIBLE_FIELDS = [
  "url",
  "role",
  "startDate",
  "endDate",
  "highlights",
  "status",
] as const;
export type ProjectPrivateField = (typeof PROJECT_PRIVATE_ELIGIBLE_FIELDS)[number];

function validateProjectPrivateFields(fields: readonly string[]): readonly ProjectPrivateField[] {
  for (const f of fields) {
    if (!PROJECT_PRIVATE_ELIGIBLE_FIELDS.includes(f as ProjectPrivateField)) {
      throw new InvalidNameError(
        "Project.privateFields",
        `${f} is not allowed. Allowed: ${PROJECT_PRIVATE_ELIGIBLE_FIELDS.join(", ")}`,
      );
    }
  }
  return fields as readonly ProjectPrivateField[];
}

export interface Project {
  readonly id: ProjectId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly url?: string;
  readonly role?: string;
  readonly status: ProjectStatus;
  readonly priority: ProjectPriority;
  readonly featured: boolean;
  readonly skillIds: readonly string[];
  readonly highlights: readonly string[];
  readonly notes?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly visibility: "public" | "private";
  readonly privateFields: readonly ProjectPrivateField[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProjectInput {
  readonly id: ProjectId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly url?: string;
  readonly role?: string;
  readonly status?: ProjectStatus;
  readonly priority?: ProjectPriority;
  readonly featured?: boolean;
  readonly skillIds?: readonly string[];
  readonly highlights?: readonly string[];
  readonly notes?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly visibility?: "public" | "private";
  readonly privateFields?: readonly string[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createProject(input: CreateProjectInput): Readonly<Project> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Project", input.name);
  }

  const now = new Date();
  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.url !== undefined && { url: input.url }),
    ...(input.role !== undefined && { role: input.role }),
    status: input.status ?? "active",
    priority: input.priority ?? "medium",
    featured: input.featured ?? false,
    skillIds: input.skillIds ?? [],
    highlights: input.highlights ?? [],
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.startDate !== undefined && { startDate: input.startDate }),
    ...(input.endDate !== undefined && { endDate: input.endDate }),
    visibility: input.visibility ?? "public",
    privateFields: validateProjectPrivateFields(input.privateFields ?? []),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}
