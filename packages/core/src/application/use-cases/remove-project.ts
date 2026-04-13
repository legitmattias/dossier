import {
  removeProjectFromProfile,
  toProjectId,
} from "../../domain/index.js";
import type { RemoveProjectInput, RemoveProjectOutput } from "../dtos/project-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveProjectDeps {
  readonly profileRepository: IProfileRepository;
}

export async function removeProject(
  deps: RemoveProjectDeps,
  input: RemoveProjectInput,
): Promise<RemoveProjectOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const projectId = toProjectId(input.projectId);
  const updatedProfile = removeProjectFromProfile(profile, projectId);
  await deps.profileRepository.save(updatedProfile);

  return { removed: true };
}
