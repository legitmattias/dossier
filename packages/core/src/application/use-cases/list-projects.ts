import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toProjectOutput } from "../helpers/mappers.js";
import type { ListProjectsInput, ListProjectsOutput } from "../dtos/project-dtos.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface ListProjectsDeps {
  readonly profileRepository: IProfileRepository;
}

export async function listProjects(
  deps: ListProjectsDeps,
  input?: ListProjectsInput,
): Promise<ListProjectsOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  let projects = [...profile.projects];
  if (input?.status) {
    projects = projects.filter((p) => p.status === input.status);
  }
  if (input?.featured !== undefined) {
    projects = projects.filter((p) => p.featured === input.featured);
  }

  return { projects: projects.map(toProjectOutput) };
}
