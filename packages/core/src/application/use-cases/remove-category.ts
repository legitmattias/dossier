import { toCategoryId } from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { resolveDomainInProfile, resolveCategoryInDomain } from "../helpers/resolve.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface RemoveCategoryDeps {
  readonly profileRepository: IProfileRepository;
}

export interface RemoveCategoryInput {
  readonly domainId: string;
  readonly categoryId: string;
}

export async function removeCategory(
  deps: RemoveCategoryDeps,
  input: RemoveCategoryInput,
): Promise<{ removed: true }> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const domain = resolveDomainInProfile(profile, input.domainId);
  const category = resolveCategoryInDomain(domain, input.categoryId);

  const updatedDomain = {
    ...domain,
    categories: domain.categories.filter((c) => c.id !== category.id),
  };

  const updatedProfile = {
    ...profile,
    domains: profile.domains.map((d) => d.id === domain.id ? updatedDomain : d),
    updatedAt: new Date(),
  };
  await deps.profileRepository.save(updatedProfile);

  return { removed: true };
}
