import { describe, expect, it } from "vitest";

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
  toCategoryId,
  toDomainId,
  toGoalId,
  toInterestId,
  toProfileId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import { parseProfile, serializeProfile } from "./profile-schema.js";

function createFullProfile() {
  const domain = BUILT_IN_DOMAINS[0]!;
  let profile = createProfile({
    id: toProfileId("test-profile-1"),
    name: "Test User",
    settings: { defaultDomainId: domain.id },
  });
  profile = addDomainToProfile(profile, domain);

  const skill = createSkill({
    id: toSkillId("skill-1"),
    slug: slugify("TypeScript"),
    name: "TypeScript",
    domainId: domain.id,
    categoryId: domain.categories[0]!.id,
    proficiency: "proficient",
    sources: [
      { type: "self-reported", detail: "Primary language", date: new Date("2026-01-15") },
    ],
    usage: [
      { context: "work", lastUsed: new Date("2026-06-01"), frequency: "daily" },
    ],
    notes: "Main language",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-06-01"),
  });
  profile = addSkillToProfile(profile, skill);

  const goal = createLearningGoal({
    id: toGoalId("goal-1"),
    name: "Learn Rust",
    domainId: domain.id,
    description: "Systems programming",
    priority: "high",
    resources: [
      { title: "The Rust Book", url: "https://doc.rust-lang.org/book/", type: "book", completed: false },
    ],
    targetDate: new Date("2026-12-31"),
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
  });
  profile = addGoalToProfile(profile, goal);

  const interest = createInterest({
    id: toInterestId("interest-1"),
    name: "Machine Learning",
    domainId: domain.id,
    description: "Neural networks and deep learning",
    createdAt: new Date("2026-02-01"),
  });
  profile = addInterestToProfile(profile, interest);

  return profile;
}

describe("profile-schema", () => {
  describe("round-trip: serialize → JSON → parse", () => {
    it("round-trips a full profile with all entity types", () => {
      const original = createFullProfile();

      const serialized = serializeProfile(original);
      const json = JSON.stringify(serialized);
      const parsed = parseProfile(JSON.parse(json));

      expect(parsed.id).toBe(original.id);
      expect(parsed.name).toBe(original.name);
      expect(parsed.settings.defaultDomainId).toBe(original.settings.defaultDomainId);
      expect(parsed.createdAt).toBeInstanceOf(Date);
      expect(parsed.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(parsed.updatedAt).toBeInstanceOf(Date);
      expect(parsed.updatedAt.getTime()).toBe(original.updatedAt.getTime());

      // Domains
      expect(parsed.domains).toHaveLength(original.domains.length);
      expect(parsed.domains[0]!.id).toBe(original.domains[0]!.id);
      expect(parsed.domains[0]!.categories).toHaveLength(
        original.domains[0]!.categories.length,
      );

      // Skills
      expect(parsed.skills).toHaveLength(1);
      const parsedSkill = parsed.skills[0]!;
      const originalSkill = original.skills[0]!;
      expect(parsedSkill.id).toBe(originalSkill.id);
      expect(parsedSkill.name).toBe(originalSkill.name);
      expect(parsedSkill.proficiency).toBe(originalSkill.proficiency);
      expect(parsedSkill.notes).toBe(originalSkill.notes);
      expect(parsedSkill.createdAt).toBeInstanceOf(Date);
      expect(parsedSkill.createdAt.getTime()).toBe(originalSkill.createdAt.getTime());
      expect(parsedSkill.sources).toHaveLength(1);
      expect(parsedSkill.sources[0]!.date).toBeInstanceOf(Date);
      expect(parsedSkill.sources[0]!.date.getTime()).toBe(
        originalSkill.sources[0]!.date.getTime(),
      );
      expect(parsedSkill.usage).toHaveLength(1);
      expect(parsedSkill.usage[0]!.lastUsed).toBeInstanceOf(Date);
      expect(parsedSkill.usage[0]!.frequency).toBe("daily");

      // Goals
      expect(parsed.goals).toHaveLength(1);
      const parsedGoal = parsed.goals[0]!;
      const originalGoal = original.goals[0]!;
      expect(parsedGoal.id).toBe(originalGoal.id);
      expect(parsedGoal.name).toBe(originalGoal.name);
      expect(parsedGoal.priority).toBe("high");
      expect(parsedGoal.description).toBe("Systems programming");
      expect(parsedGoal.targetDate).toBeInstanceOf(Date);
      expect(parsedGoal.targetDate!.getTime()).toBe(originalGoal.targetDate!.getTime());
      expect(parsedGoal.resources).toHaveLength(1);
      expect(parsedGoal.resources[0]!.url).toBe("https://doc.rust-lang.org/book/");

      // Interests
      expect(parsed.interests).toHaveLength(1);
      const parsedInterest = parsed.interests[0]!;
      expect(parsedInterest.id).toBe(original.interests[0]!.id);
      expect(parsedInterest.description).toBe("Neural networks and deep learning");
      expect(parsedInterest.createdAt).toBeInstanceOf(Date);
    });

    it("round-trips a minimal profile (no skills, goals, interests)", () => {
      const profile = createProfile({
        id: toProfileId("minimal"),
        name: "Minimal",
      });

      const serialized = serializeProfile(profile);
      const parsed = parseProfile(JSON.parse(JSON.stringify(serialized)));

      expect(parsed.id).toBe("minimal");
      expect(parsed.name).toBe("Minimal");
      expect(parsed.domains).toHaveLength(0);
      expect(parsed.skills).toHaveLength(0);
      expect(parsed.goals).toHaveLength(0);
      expect(parsed.interests).toHaveLength(0);
    });

    it("preserves optional fields when present", () => {
      const profile = createFullProfile();
      const serialized = serializeProfile(profile);

      // Verify optional fields are in the serialized output
      const skillObj = (serialized as { skills: Array<Record<string, unknown>> }).skills[0]!;
      expect(skillObj["notes"]).toBe("Main language");

      const goalObj = (serialized as { goals: Array<Record<string, unknown>> }).goals[0]!;
      expect(goalObj["description"]).toBe("Systems programming");
      expect(goalObj["targetDate"]).toBeDefined();
    });

    it("omits optional fields when absent", () => {
      const skill = createSkill({
        id: toSkillId("skill-no-notes"),
        slug: slugify("Go"),
        name: "Go",
        domainId: toDomainId("d1"),
        categoryId: toCategoryId("c1"),
        proficiency: "beginner",
      });

      let profile = createProfile({ id: toProfileId("p"), name: "P" });
      profile = addSkillToProfile(profile, skill);

      const serialized = serializeProfile(profile);
      const skillObj = (serialized as { skills: Array<Record<string, unknown>> }).skills[0]!;
      expect("notes" in skillObj).toBe(false);
    });
  });

  describe("parseProfile validation errors", () => {
    it("throws on empty id", () => {
      const invalid = {
        id: "",
        name: "Test",
        settings: {},
        domains: [],
        skills: [],
        goals: [],
        interests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(() => parseProfile(invalid)).toThrow();
    });

    it("throws on missing required fields", () => {
      expect(() => parseProfile({})).toThrow();
      expect(() => parseProfile({ id: "x" })).toThrow();
    });

    it("throws on invalid proficiency level", () => {
      const invalid = {
        id: "p1",
        name: "Test",
        settings: {},
        domains: [],
        skills: [
          {
            id: "s1",
            slug: "ts",
            name: "TS",
            domainId: "d1",
            categoryId: "c1",
            proficiency: "wizard",
            sources: [],
            usage: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        goals: [],
        interests: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(() => parseProfile(invalid)).toThrow();
    });

    it("throws on invalid date string", () => {
      const invalid = {
        id: "p1",
        name: "Test",
        settings: {},
        domains: [],
        skills: [],
        goals: [],
        interests: [],
        createdAt: "not-a-date",
        updatedAt: new Date().toISOString(),
      };
      expect(() => parseProfile(invalid)).toThrow();
    });
  });

  describe("serializeProfile", () => {
    it("converts all Date fields to ISO strings", () => {
      const profile = createFullProfile();
      const serialized = serializeProfile(profile) as Record<string, unknown>;

      expect(typeof serialized["createdAt"]).toBe("string");
      expect(typeof serialized["updatedAt"]).toBe("string");

      const skill = (serialized["skills"] as Array<Record<string, unknown>>)[0]!;
      expect(typeof skill["createdAt"]).toBe("string");

      const source = (skill["sources"] as Array<Record<string, unknown>>)[0]!;
      expect(typeof source["date"]).toBe("string");

      const usage = (skill["usage"] as Array<Record<string, unknown>>)[0]!;
      expect(typeof usage["lastUsed"]).toBe("string");

      const goal = (serialized["goals"] as Array<Record<string, unknown>>)[0]!;
      expect(typeof goal["createdAt"]).toBe("string");
      expect(typeof goal["targetDate"]).toBe("string");

      const interest = (serialized["interests"] as Array<Record<string, unknown>>)[0]!;
      expect(typeof interest["createdAt"]).toBe("string");
    });
  });
});
