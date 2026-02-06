import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

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
import { FileProfileRepository } from "./file-profile-repository.js";

let tempDir: string;
let filePath: string;
let repo: FileProfileRepository;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "dossier-test-"));
  filePath = join(tempDir, "profile.json");
  repo = new FileProfileRepository(filePath);
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

function createMinimalProfile() {
  return createProfile({
    id: toProfileId("test-profile"),
    name: "Test User",
  });
}

function createFullTestProfile() {
  const domain = BUILT_IN_DOMAINS[0]!;
  let profile = createProfile({
    id: toProfileId("full-profile"),
    name: "Full User",
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
    sources: [{ type: "self-reported", date: new Date("2024-01-15") }],
    usage: [{ context: "work", lastUsed: new Date("2024-06-01"), frequency: "daily" }],
    notes: "Primary language",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-06-01"),
  });
  profile = addSkillToProfile(profile, skill);

  const goal = createLearningGoal({
    id: toGoalId("goal-1"),
    name: "Learn Rust",
    domainId: domain.id,
    description: "Systems programming",
    priority: "high",
    targetDate: new Date("2025-12-31"),
    resources: [
      { title: "The Rust Book", url: "https://doc.rust-lang.org/book/", type: "book", completed: false },
    ],
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

describe("FileProfileRepository", () => {
  describe("load", () => {
    it("returns null when file does not exist", async () => {
      const result = await repo.load();
      expect(result).toBeNull();
    });

    it("loads and parses a valid profile", async () => {
      const profile = createMinimalProfile();
      await repo.save(profile);

      const loaded = await repo.load();
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(profile.id);
      expect(loaded!.name).toBe(profile.name);
      expect(loaded!.createdAt).toBeInstanceOf(Date);
    });

    it("throws on corrupt JSON", async () => {
      await writeFile(filePath, "not valid json{{{", "utf-8");
      await expect(repo.load()).rejects.toThrow();
    });

    it("throws on invalid profile structure", async () => {
      await writeFile(filePath, JSON.stringify({ invalid: true }), "utf-8");
      await expect(repo.load()).rejects.toThrow();
    });
  });

  describe("save", () => {
    it("creates parent directories if needed", async () => {
      const nestedPath = join(tempDir, "nested", "deep", "profile.json");
      const nestedRepo = new FileProfileRepository(nestedPath);

      const profile = createMinimalProfile();
      await nestedRepo.save(profile);

      const content = await readFile(nestedPath, "utf-8");
      expect(content).toBeTruthy();
    });

    it("writes pretty-printed JSON with trailing newline", async () => {
      const profile = createMinimalProfile();
      await repo.save(profile);

      const content = await readFile(filePath, "utf-8");
      expect(content.endsWith("\n")).toBe(true);
      expect(content).toContain("\n  ");
    });

    it("overwrites existing file", async () => {
      const profile1 = createProfile({
        id: toProfileId("first"),
        name: "First",
      });
      await repo.save(profile1);

      const profile2 = createProfile({
        id: toProfileId("second"),
        name: "Second",
      });
      await repo.save(profile2);

      const loaded = await repo.load();
      expect(loaded!.name).toBe("Second");
    });
  });

  describe("exists", () => {
    it("returns false when file does not exist", async () => {
      expect(await repo.exists()).toBe(false);
    });

    it("returns true after save", async () => {
      await repo.save(createMinimalProfile());
      expect(await repo.exists()).toBe(true);
    });
  });

  describe("round-trip", () => {
    it("round-trips a full profile with all entity types", async () => {
      const original = createFullTestProfile();
      await repo.save(original);
      const loaded = await repo.load();

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(original.id);
      expect(loaded!.name).toBe(original.name);
      expect(loaded!.settings.defaultDomainId).toBe(original.settings.defaultDomainId);

      // Dates round-trip correctly
      expect(loaded!.createdAt.getTime()).toBe(original.createdAt.getTime());
      expect(loaded!.updatedAt.getTime()).toBe(original.updatedAt.getTime());

      // Domains
      expect(loaded!.domains).toHaveLength(original.domains.length);
      expect(loaded!.domains[0]!.categories).toHaveLength(
        original.domains[0]!.categories.length,
      );

      // Skills
      expect(loaded!.skills).toHaveLength(1);
      expect(loaded!.skills[0]!.proficiency).toBe("proficient");
      expect(loaded!.skills[0]!.notes).toBe("Primary language");
      expect(loaded!.skills[0]!.sources[0]!.date).toBeInstanceOf(Date);
      expect(loaded!.skills[0]!.usage[0]!.lastUsed).toBeInstanceOf(Date);

      // Goals
      expect(loaded!.goals).toHaveLength(1);
      expect(loaded!.goals[0]!.priority).toBe("high");
      expect(loaded!.goals[0]!.targetDate).toBeInstanceOf(Date);
      expect(loaded!.goals[0]!.resources).toHaveLength(1);

      // Interests
      expect(loaded!.interests).toHaveLength(1);
      expect(loaded!.interests[0]!.createdAt).toBeInstanceOf(Date);
    });
  });
});
