/**
 * Shared test helpers and factory functions for domain tests.
 */

import { createCategory } from "../entities/category.js";
import { createDomain } from "../entities/domain-entity.js";
import type { Domain } from "../entities/domain-entity.js";
import { createInterest } from "../entities/interest.js";
import type { Interest } from "../entities/interest.js";
import { createLearningGoal } from "../entities/learning-goal.js";
import type { LearningGoal } from "../entities/learning-goal.js";
import { createProfile } from "../entities/profile.js";
import type { Profile } from "../entities/profile.js";
import { createSkill } from "../entities/skill.js";
import type { Skill } from "../entities/skill.js";
import {
  toCategoryId,
  toDomainId,
  toGoalId,
  toInterestId,
  toProfileId,
  toSkillId,
} from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";

let counter = 0;

/** Generate a unique suffix for IDs */
function nextId(): string {
  return String(++counter);
}

/** Reset the ID counter (call in beforeEach if needed) */
export function resetFixtureCounter(): void {
  counter = 0;
}

export function createTestProfile(overrides?: Partial<Parameters<typeof createProfile>[0]>): Profile {
  return createProfile({
    id: toProfileId(`test-profile-${nextId()}`),
    name: "Test Profile",
    ...overrides,
  });
}

export function createTestDomain(overrides?: Partial<Parameters<typeof createDomain>[0]>): Domain {
  const id = nextId();
  return createDomain({
    id: toDomainId(`test-domain-${id}`),
    slug: createSlug(`test-domain-${id}`),
    name: `Test Domain ${id}`,
    ...overrides,
  });
}

export function createTestSkill(overrides?: Partial<Parameters<typeof createSkill>[0]>): Skill {
  const id = nextId();
  return createSkill({
    id: toSkillId(`test-skill-${id}`),
    slug: createSlug(`test-skill-${id}`),
    name: `Test Skill ${id}`,
    domainId: toDomainId("test-domain-1"),
    categoryId: toCategoryId("test-category-1"),
    proficiency: "familiar",
    ...overrides,
  });
}

export function createTestGoal(
  overrides?: Partial<Parameters<typeof createLearningGoal>[0]>,
): LearningGoal {
  const id = nextId();
  return createLearningGoal({
    id: toGoalId(`test-goal-${id}`),
    name: `Test Goal ${id}`,
    domainId: toDomainId("test-domain-1"),
    ...overrides,
  });
}

export function createTestInterest(
  overrides?: Partial<Parameters<typeof createInterest>[0]>,
): Interest {
  const id = nextId();
  return createInterest({
    id: toInterestId(`test-interest-${id}`),
    name: `Test Interest ${id}`,
    domainId: toDomainId("test-domain-1"),
    ...overrides,
  });
}

export function createTestCategory(
  overrides?: Partial<Parameters<typeof createCategory>[0]>,
) {
  const id = nextId();
  return createCategory({
    id: toCategoryId(`test-category-${id}`),
    slug: createSlug(`test-category-${id}`),
    name: `Test Category ${id}`,
    ...overrides,
  });
}
