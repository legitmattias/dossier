import type { Domain } from "../../domain/entities/domain-entity.js";
import type { Interest } from "../../domain/entities/interest.js";
import type { LearningGoal } from "../../domain/entities/learning-goal.js";
import type { Profile } from "../../domain/entities/profile.js";
import type { Skill } from "../../domain/entities/skill.js";
import type { DomainId } from "../../domain/value-objects/identifiers.js";

export interface DomainGroup {
  readonly domain: Domain;
  readonly skills: readonly Skill[];
  readonly goals: readonly LearningGoal[];
  readonly interests: readonly Interest[];
}

/**
 * Group a profile's entities by domain. Only includes domains that have
 * at least one skill, goal, or interest (or are present in profile.domains).
 */
export function groupByDomain(profile: Profile): readonly DomainGroup[] {
  const domainMap = new Map<string, DomainGroup>();

  for (const domain of profile.domains) {
    domainMap.set(domain.id, { domain, skills: [], goals: [], interests: [] });
  }

  for (const skill of profile.skills) {
    const group = domainMap.get(skill.domainId);
    if (group) {
      domainMap.set(skill.domainId, {
        ...group,
        skills: [...group.skills, skill],
      });
    }
  }

  for (const goal of profile.goals) {
    const group = domainMap.get(goal.domainId);
    if (group) {
      domainMap.set(goal.domainId, {
        ...group,
        goals: [...group.goals, goal],
      });
    }
  }

  for (const interest of profile.interests) {
    const group = domainMap.get(interest.domainId);
    if (group) {
      domainMap.set(interest.domainId, {
        ...group,
        interests: [...group.interests, interest],
      });
    }
  }

  return [...domainMap.values()].filter(
    (g) => g.skills.length > 0 || g.goals.length > 0 || g.interests.length > 0,
  );
}

/**
 * Format a human-readable time-since string from a Date.
 * Examples: "recently", "2 months ago", "1 year ago"
 */
export function formatTimeSince(date: Date, now: Date = new Date()): string {
  const ms = now.getTime() - date.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  if (days < 7) return "recently";
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) === 1 ? "" : "s"} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

/**
 * Get the most recent usage date for a skill, or null if no usage recorded.
 */
export function getLastUsedDate(skill: Skill): Date | null {
  if (skill.usage.length === 0) return null;
  return skill.usage.reduce((latest, u) =>
    u.lastUsed > latest.lastUsed ? u : latest,
  ).lastUsed;
}

/**
 * Get the latest progress percentage for a goal, or 0 if no progress recorded.
 */
export function getLatestProgress(goal: LearningGoal): number {
  if (goal.progress.length === 0) return 0;
  return goal.progress[goal.progress.length - 1]!.percentage;
}
