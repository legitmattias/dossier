import {
  DomainNotFoundError,
  DuplicateSkillError,
  GoalNotFoundError,
  InterestNotFoundError,
  InvalidNameError,
  SkillNotFoundError,
} from "../errors/domain-errors.js";
import type {
  DomainId,
  GoalId,
  InterestId,
  ProfileId,
  SkillId,
} from "../value-objects/identifiers.js";
import type { Domain } from "./domain-entity.js";
import type { Interest } from "./interest.js";
import type { LearningGoal } from "./learning-goal.js";
import type { Skill } from "./skill.js";

export interface ProfileSettings {
  readonly defaultDomainId?: DomainId;
}

export interface Profile {
  readonly id: ProfileId;
  readonly name: string;
  readonly bio?: string;
  readonly preferredLanguage?: string;
  readonly customInstructions?: string;
  readonly settings: ProfileSettings;
  readonly domains: readonly Domain[];
  readonly skills: readonly Skill[];
  readonly goals: readonly LearningGoal[];
  readonly interests: readonly Interest[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateProfileInput {
  readonly id: ProfileId;
  readonly name: string;
  readonly bio?: string;
  readonly preferredLanguage?: string;
  readonly customInstructions?: string;
  readonly settings?: ProfileSettings;
  readonly domains?: readonly Domain[];
  readonly skills?: readonly Skill[];
  readonly goals?: readonly LearningGoal[];
  readonly interests?: readonly Interest[];
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createProfile(input: CreateProfileInput): Readonly<Profile> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Profile", input.name);
  }

  const now = new Date();
  return {
    id: input.id,
    name: input.name.trim(),
    ...(input.bio !== undefined && { bio: input.bio }),
    ...(input.preferredLanguage !== undefined && { preferredLanguage: input.preferredLanguage }),
    ...(input.customInstructions !== undefined && { customInstructions: input.customInstructions }),
    settings: input.settings ?? {},
    domains: input.domains ?? [],
    skills: input.skills ?? [],
    goals: input.goals ?? [],
    interests: input.interests ?? [],
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
}

// --- Domain operations ---

export function addDomainToProfile(profile: Profile, domain: Domain): Readonly<Profile> {
  return {
    ...profile,
    domains: [...profile.domains, domain],
    updatedAt: new Date(),
  };
}

export function findDomainInProfile(profile: Profile, domainId: DomainId): Readonly<Domain> {
  const domain = profile.domains.find((d) => d.id === domainId);
  if (!domain) {
    throw new DomainNotFoundError(domainId);
  }
  return domain;
}

export function removeDomainFromProfile(
  profile: Profile,
  domainId: DomainId,
): Readonly<Profile> {
  const exists = profile.domains.some((d) => d.id === domainId);
  if (!exists) {
    throw new DomainNotFoundError(domainId);
  }

  return {
    ...profile,
    domains: profile.domains.filter((d) => d.id !== domainId),
    // Also remove skills, goals, and interests linked to this domain
    skills: profile.skills.filter((s) => s.domainId !== domainId),
    goals: profile.goals.filter((g) => g.domainId !== domainId),
    interests: profile.interests.filter((i) => i.domainId !== domainId),
    updatedAt: new Date(),
  };
}

// --- Skill operations ---

export function addSkillToProfile(profile: Profile, skill: Skill): Readonly<Profile> {
  const duplicateById = profile.skills.find((s) => s.id === skill.id);
  if (duplicateById) {
    throw new DuplicateSkillError(skill.id);
  }

  const duplicateBySlugAndDomain = profile.skills.find(
    (s) => s.slug === skill.slug && s.domainId === skill.domainId,
  );
  if (duplicateBySlugAndDomain) {
    throw new DuplicateSkillError(skill.name);
  }

  return {
    ...profile,
    skills: [...profile.skills, skill],
    updatedAt: new Date(),
  };
}

export function findSkillInProfile(profile: Profile, skillId: SkillId): Readonly<Skill> {
  const skill = profile.skills.find((s) => s.id === skillId);
  if (!skill) {
    throw new SkillNotFoundError(skillId);
  }
  return skill;
}

export function updateSkillInProfile(
  profile: Profile,
  skillId: SkillId,
  updatedSkill: Skill,
): Readonly<Profile> {
  const index = profile.skills.findIndex((s) => s.id === skillId);
  if (index === -1) {
    throw new SkillNotFoundError(skillId);
  }

  const newSkills = [...profile.skills];
  newSkills[index] = updatedSkill;

  return {
    ...profile,
    skills: newSkills,
    updatedAt: new Date(),
  };
}

export function removeSkillFromProfile(
  profile: Profile,
  skillId: SkillId,
): Readonly<Profile> {
  const exists = profile.skills.some((s) => s.id === skillId);
  if (!exists) {
    throw new SkillNotFoundError(skillId);
  }

  return {
    ...profile,
    skills: profile.skills.filter((s) => s.id !== skillId),
    updatedAt: new Date(),
  };
}

// --- Goal operations ---

export function addGoalToProfile(
  profile: Profile,
  goal: LearningGoal,
): Readonly<Profile> {
  return {
    ...profile,
    goals: [...profile.goals, goal],
    updatedAt: new Date(),
  };
}

export function findGoalInProfile(profile: Profile, goalId: GoalId): Readonly<LearningGoal> {
  const goal = profile.goals.find((g) => g.id === goalId);
  if (!goal) {
    throw new GoalNotFoundError(goalId);
  }
  return goal;
}

export function updateGoalInProfile(
  profile: Profile,
  goalId: GoalId,
  updatedGoal: LearningGoal,
): Readonly<Profile> {
  const index = profile.goals.findIndex((g) => g.id === goalId);
  if (index === -1) {
    throw new GoalNotFoundError(goalId);
  }

  const newGoals = [...profile.goals];
  newGoals[index] = updatedGoal;

  return {
    ...profile,
    goals: newGoals,
    updatedAt: new Date(),
  };
}

export function removeGoalFromProfile(
  profile: Profile,
  goalId: GoalId,
): Readonly<Profile> {
  const exists = profile.goals.some((g) => g.id === goalId);
  if (!exists) {
    throw new GoalNotFoundError(goalId);
  }

  return {
    ...profile,
    goals: profile.goals.filter((g) => g.id !== goalId),
    updatedAt: new Date(),
  };
}

// --- Interest operations ---

export function addInterestToProfile(
  profile: Profile,
  interest: Interest,
): Readonly<Profile> {
  return {
    ...profile,
    interests: [...profile.interests, interest],
    updatedAt: new Date(),
  };
}

export function findInterestInProfile(
  profile: Profile,
  interestId: InterestId,
): Readonly<Interest> {
  const interest = profile.interests.find((i) => i.id === interestId);
  if (!interest) {
    throw new InterestNotFoundError(interestId);
  }
  return interest;
}

export function removeInterestFromProfile(
  profile: Profile,
  interestId: InterestId,
): Readonly<Profile> {
  const exists = profile.interests.some((i) => i.id === interestId);
  if (!exists) {
    throw new InterestNotFoundError(interestId);
  }

  return {
    ...profile,
    interests: profile.interests.filter((i) => i.id !== interestId),
    updatedAt: new Date(),
  };
}
