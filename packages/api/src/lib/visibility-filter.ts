/**
 * Visibility filter used by both the anonymous `/u/:username` route and any
 * authed request whose API key carries `maxVisibility: "public"`. Produces the
 * same view a non-authenticated visitor would see: private entities removed,
 * domain-private cascade applied, `notes` stripped, per-field `privateFields`
 * overrides applied.
 */
import type { Profile } from "@dossier/core";

export function filterProfileToPublic(profile: Profile): Profile {
  const privateDomainIds = new Set<string>(
    profile.domains.filter((d) => d.visibility === "private").map((d) => d.id),
  );

  const isVisible = (entity: { visibility: string; domainId?: string }): boolean => {
    if (entity.visibility === "private") return false;
    if (entity.domainId && privateDomainIds.has(entity.domainId)) return false;
    return true;
  };

  const stripPrivate = <T extends { notes?: unknown; privateFields?: readonly string[] }>(entity: T): T => {
    const overrides = (entity.privateFields ?? []) as readonly string[];
    const { notes: _notes, privateFields: _pf, ...rest } = entity as Record<string, unknown> & T;
    for (const f of overrides) delete (rest as Record<string, unknown>)[f];
    return rest as T;
  };

  return {
    ...profile,
    skills: profile.skills.filter(isVisible).map(stripPrivate),
    goals: profile.goals.filter(isVisible).map(stripPrivate),
    interests: profile.interests.filter(isVisible).map(stripPrivate),
    projects: profile.projects.filter(isVisible).map(stripPrivate),
  };
}
