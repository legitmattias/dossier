import {
  findProjectInProfile,
  updateProjectInProfile,
  toProjectId,
} from "../../domain/index.js";
import type { ProjectStatus, ProjectPriority } from "../../domain/index.js";
import type { UpdateProjectInput, UpdateProjectOutput } from "../dtos/project-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toProjectOutput } from "../helpers/mappers.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateProjectDeps {
  readonly profileRepository: IProfileRepository;
}

export async function updateProject(
  deps: UpdateProjectDeps,
  input: UpdateProjectInput,
): Promise<UpdateProjectOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const projectId = toProjectId(input.projectId);
  const project = findProjectInProfile(profile, projectId);

  const updatedProject = {
    ...project,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.url !== undefined && { url: input.url }),
    ...(input.role !== undefined && { role: input.role }),
    ...(input.status !== undefined && { status: input.status as ProjectStatus }),
    ...(input.priority !== undefined && { priority: input.priority as ProjectPriority }),
    ...(input.featured !== undefined && { featured: input.featured }),
    ...(input.visibility !== undefined && { visibility: input.visibility as "public" | "private" }),
    ...(input.skillIds !== undefined && { skillIds: input.skillIds }),
    ...(input.highlights !== undefined && { highlights: input.highlights }),
    ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
    ...(input.endDate !== undefined && { endDate: new Date(input.endDate) }),
    updatedAt: new Date(),
  };

  const updatedProfile = updateProjectInProfile(profile, projectId, updatedProject);
  await deps.profileRepository.save(updatedProfile);

  return { project: toProjectOutput(updatedProject) };
}
