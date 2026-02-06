import type { Profile } from "../../domain/index.js";
import { toDomainId } from "../../domain/index.js";
import type { ExportProfileInput, ExportProfileOutput } from "../dtos/export-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import type { IExporter } from "../ports/exporter.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface ExportProfileDeps {
  readonly profileRepository: IProfileRepository;
  readonly exporter: IExporter;
}

export async function exportProfile(
  deps: ExportProfileDeps,
  input: ExportProfileInput = {},
): Promise<ExportProfileOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  // Filter profile data based on input
  let filteredProfile: Profile = profile;

  if (input.domainIds && input.domainIds.length > 0) {
    const domainIdSet = new Set(input.domainIds.map((id) => toDomainId(id)));
    filteredProfile = {
      ...filteredProfile,
      domains: filteredProfile.domains.filter((d) => domainIdSet.has(d.id)),
      skills: filteredProfile.skills.filter((s) => domainIdSet.has(s.domainId)),
      goals: filteredProfile.goals.filter((g) => domainIdSet.has(g.domainId)),
      interests: filteredProfile.interests.filter((i) => domainIdSet.has(i.domainId)),
    };
  }

  if (input.includeSkills === false) {
    filteredProfile = { ...filteredProfile, skills: [] };
  }
  if (input.includeGoals === false) {
    filteredProfile = { ...filteredProfile, goals: [] };
  }
  if (input.includeInterests === false) {
    filteredProfile = { ...filteredProfile, interests: [] };
  }

  const content = deps.exporter.export(filteredProfile, {
    domainIds: input.domainIds,
    includeSkills: input.includeSkills,
    includeGoals: input.includeGoals,
    includeInterests: input.includeInterests,
  });

  return { content };
}
