import {
  findInterestInProfile,
  removeInterestFromProfile,
  toInterestId,
} from "../../domain/index.js";
import type { RemoveInterestInput, RemoveInterestOutput } from "../dtos/interest-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveInterestDeps {
  readonly profileRepository: IProfileRepository;
}

export async function removeInterest(
  deps: RemoveInterestDeps,
  input: RemoveInterestInput,
): Promise<RemoveInterestOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  const interestId = toInterestId(input.interestId);
  // Verify interest exists (throws InterestNotFoundError if not)
  findInterestInProfile(profile, interestId);

  const updatedProfile = removeInterestFromProfile(profile, interestId);
  await deps.profileRepository.save(updatedProfile);

  return { removed: true };
}
