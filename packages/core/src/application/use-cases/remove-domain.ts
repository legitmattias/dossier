import {
  removeDomainFromProfile,
  toDomainId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { resolveDomainInProfile } from "../helpers/resolve.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveDomainDeps {
  readonly profileRepository: IProfileRepository;
}

export interface RemoveDomainInput {
  readonly domainId: string;
}

export async function removeDomain(
  deps: RemoveDomainDeps,
  input: RemoveDomainInput,
): Promise<{ removed: true }> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const domain = resolveDomainInProfile(profile, input.domainId);
  const updated = removeDomainFromProfile(profile, domain.id);
  await deps.profileRepository.save(updated);

  return { removed: true };
}
