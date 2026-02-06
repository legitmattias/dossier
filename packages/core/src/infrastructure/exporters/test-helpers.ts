import {
  addDomainToProfile,
  addGoalToProfile,
  addInterestToProfile,
  addSkillToProfile,
  BUILT_IN_DOMAINS,
  createInterest,
  createLearningGoal,
  createProfile,
  createSkill,
  toGoalId,
  toInterestId,
  toProfileId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import type { Profile } from "../../domain/entities/profile.js";

/**
 * Creates a test profile with one domain, one skill, one goal, and one interest.
 * Shared across exporter tests for consistency.
 */
export function createExportTestProfile(): Profile {
  const domain = BUILT_IN_DOMAINS[0]!; // Software Development
  let profile = createProfile({
    id: toProfileId("test-profile"),
    name: "Test User",
  });
  profile = addDomainToProfile(profile, domain);

  const skill = createSkill({
    id: toSkillId("skill-1"),
    slug: slugify("TypeScript"),
    name: "TypeScript",
    domainId: domain.id,
    categoryId: domain.categories[0]!.id,
    proficiency: "proficient",
    notes: "Primary language",
    usage: [{ context: "work", lastUsed: new Date("2024-06-01"), frequency: "daily" }],
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-06-01"),
  });
  profile = addSkillToProfile(profile, skill);

  const goal = createLearningGoal({
    id: toGoalId("goal-1"),
    name: "Learn Rust",
    domainId: domain.id,
    priority: "high",
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  });
  profile = addGoalToProfile(profile, goal);

  const interest = createInterest({
    id: toInterestId("interest-1"),
    name: "Machine Learning",
    domainId: domain.id,
    createdAt: new Date("2024-02-01"),
  });
  profile = addInterestToProfile(profile, interest);

  return profile;
}
