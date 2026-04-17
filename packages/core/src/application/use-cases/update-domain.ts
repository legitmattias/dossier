import {
  findDomainInProfile,
  toDomainId,
} from "../../domain/index.js";
import type { Domain } from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateDomainInput {
  readonly domainId: string;
  readonly name?: string;
  readonly description?: string;
  readonly visibility?: string;
  readonly proficiencyLabels?: Record<string, string>;
}

export interface UpdateDomainOutput {
  readonly domain: {
    readonly id: string;
    readonly slug: string;
    readonly name: string;
    readonly description?: string;
    readonly isBuiltIn: boolean;
    readonly visibility: string;
    readonly proficiencyLabels?: Record<string, string>;
  };
}

export interface UpdateDomainDeps {
  readonly profileRepository: IProfileRepository;
}

export async function updateDomain(
  deps: UpdateDomainDeps,
  input: UpdateDomainInput,
): Promise<UpdateDomainOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const domainId = toDomainId(input.domainId);
  const domain = findDomainInProfile(profile, domainId);

  const updatedDomain: Domain = {
    ...domain,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.visibility !== undefined && { visibility: input.visibility as "public" | "private" }),
    ...(input.proficiencyLabels !== undefined && { proficiencyLabels: input.proficiencyLabels }),
    updatedAt: new Date(),
  };

  const updatedProfile = {
    ...profile,
    domains: profile.domains.map((d) => d.id === domainId ? updatedDomain : d),
    updatedAt: new Date(),
  };

  await deps.profileRepository.save(updatedProfile);

  return {
    domain: {
      id: updatedDomain.id,
      slug: updatedDomain.slug,
      name: updatedDomain.name,
      description: updatedDomain.description,
      isBuiltIn: updatedDomain.isBuiltIn,
      visibility: updatedDomain.visibility,
      ...(updatedDomain.proficiencyLabels !== undefined && { proficiencyLabels: updatedDomain.proficiencyLabels as Record<string, string> }),
    },
  };
}
