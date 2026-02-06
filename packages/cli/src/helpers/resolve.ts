import type {
  Profile,
  Domain,
  DomainId,
  CategoryId,
  SkillId,
  GoalId,
  InterestId,
} from "@dossier/core";

export class ResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveError";
  }
}

export function resolveDomainId(profile: Profile, input: string): DomainId {
  const lower = input.toLowerCase();
  const domain = profile.domains.find(
    (d) => d.slug === lower || d.name.toLowerCase() === lower,
  );
  if (!domain) {
    const available = profile.domains.map((d) => d.slug).join(", ");
    throw new ResolveError(
      `Domain '${input}' not found. Available: ${available}`,
    );
  }
  return domain.id;
}

export function resolveDomain(profile: Profile, input: string): Readonly<Domain> {
  const lower = input.toLowerCase();
  const domain = profile.domains.find(
    (d) => d.slug === lower || d.name.toLowerCase() === lower,
  );
  if (!domain) {
    const available = profile.domains.map((d) => d.slug).join(", ");
    throw new ResolveError(
      `Domain '${input}' not found. Available: ${available}`,
    );
  }
  return domain;
}

export function resolveCategoryId(domain: Domain, input: string): CategoryId {
  const lower = input.toLowerCase();
  const category = domain.categories.find(
    (c) => c.slug === lower || c.name.toLowerCase() === lower,
  );
  if (!category) {
    const available = domain.categories.map((c) => c.slug).join(", ");
    throw new ResolveError(
      `Category '${input}' not found in domain '${domain.name}'. Available: ${available}`,
    );
  }
  return category.id;
}

export function resolveSkillId(profile: Profile, name: string): SkillId {
  const lower = name.toLowerCase();
  const skill = profile.skills.find(
    (s) => s.name.toLowerCase() === lower || s.slug === lower,
  );
  if (!skill) {
    throw new ResolveError(`Skill '${name}' not found.`);
  }
  return skill.id;
}

export function resolveGoalId(profile: Profile, name: string): GoalId {
  const lower = name.toLowerCase();
  const goal = profile.goals.find(
    (g) => g.name.toLowerCase() === lower,
  );
  if (!goal) {
    throw new ResolveError(`Goal '${name}' not found.`);
  }
  return goal.id;
}

export function resolveInterestId(profile: Profile, name: string): InterestId {
  const lower = name.toLowerCase();
  const interest = profile.interests.find(
    (i) => i.name.toLowerCase() === lower,
  );
  if (!interest) {
    throw new ResolveError(`Interest '${name}' not found.`);
  }
  return interest.id;
}
