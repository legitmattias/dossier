import {
  addProjectToProfile,
  createProject,
  toProjectId,
  createSlug,
} from "../../domain/index.js";
import type { AddProjectInput, AddProjectOutput } from "../dtos/project-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toProjectOutput } from "../helpers/mappers.js";
import { slugify } from "../helpers/slugify.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddProjectDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function addProject(
  deps: AddProjectDeps,
  input: AddProjectInput,
): Promise<AddProjectOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const projectId = toProjectId(deps.idGenerator.generate("project"));
  const slug = createSlug(slugify(input.name));

  const project = createProject({
    id: projectId,
    slug,
    name: input.name,
    description: input.description,
    url: input.url,
    role: input.role,
    notes: input.notes,
    status: input.status as Parameters<typeof createProject>[0]["status"],
    priority: input.priority as Parameters<typeof createProject>[0]["priority"],
    featured: input.featured,
    visibility: input.visibility as "public" | "private" | undefined,
    skillIds: input.skillIds,
    highlights: input.highlights,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    privateFields: input.privateFields,
  });

  const updatedProfile = addProjectToProfile(profile, project);
  await deps.profileRepository.save(updatedProfile);

  return { project: toProjectOutput(project) };
}
