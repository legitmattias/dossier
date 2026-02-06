import {
  findSkillInProfile,
  removeSkillFromProfile,
  toSkillId,
} from "../../domain/index.js";
import type { RemoveSkillInput, RemoveSkillOutput } from "../dtos/skill-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveSkillDeps {
  readonly profileRepository: IProfileRepository;
}

export async function removeSkill(
  deps: RemoveSkillDeps,
  input: RemoveSkillInput,
): Promise<RemoveSkillOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const skillId = toSkillId(input.skillId);
  // Verify skill exists (throws SkillNotFoundError if not)
  findSkillInProfile(profile, skillId);

  const updatedProfile = removeSkillFromProfile(profile, skillId);
  await deps.profileRepository.save(updatedProfile);

  return { removed: true };
}
