import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toCategoryId, toDomainId, toSkillId } from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createSkill, getSkillFreshness, updateSkill } from "./skill.js";
import type { SkillSource, SkillUsage } from "./skill.js";

const baseInput = {
  id: toSkillId("skill-1"),
  slug: createSlug("typescript"),
  name: "TypeScript",
  domainId: toDomainId("domain-sw"),
  categoryId: toCategoryId("cat-languages"),
  proficiency: "proficient" as const,
} as const;

describe("createSkill", () => {
  it("creates a skill with required fields", () => {
    const skill = createSkill(baseInput);

    expect(skill.id).toBe("skill-1");
    expect(skill.slug).toBe("typescript");
    expect(skill.name).toBe("TypeScript");
    expect(skill.domainId).toBe("domain-sw");
    expect(skill.categoryId).toBe("cat-languages");
    expect(skill.proficiency).toBe("proficient");
    expect(skill.sources).toEqual([]);
    expect(skill.usage).toEqual([]);
    expect(skill.notes).toBeUndefined();
    expect(skill.createdAt).toBeInstanceOf(Date);
    expect(skill.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a skill with all optional fields", () => {
    const source: SkillSource = {
      type: "self-reported",
      detail: "10 years experience",
      date: new Date("2026-01-01"),
    };
    const usage: SkillUsage = {
      context: "Daily development work",
      lastUsed: new Date("2026-06-01"),
      frequency: "daily",
    };

    const skill = createSkill({
      ...baseInput,
      sources: [source],
      usage: [usage],
      notes: "Primary language",
    });

    expect(skill.sources).toHaveLength(1);
    expect(skill.sources[0]!.type).toBe("self-reported");
    expect(skill.usage).toHaveLength(1);
    expect(skill.usage[0]!.frequency).toBe("daily");
    expect(skill.notes).toBe("Primary language");
  });

  it("trims the name", () => {
    const skill = createSkill({ ...baseInput, name: "  TypeScript  " });
    expect(skill.name).toBe("TypeScript");
  });

  // Domain extensibility
  it("works for music domain skills", () => {
    const skill = createSkill({
      id: toSkillId("skill-guitar"),
      slug: createSlug("acoustic-guitar"),
      name: "Acoustic Guitar",
      domainId: toDomainId("domain-music"),
      categoryId: toCategoryId("cat-string-instruments"),
      proficiency: "familiar",
    });

    expect(skill.name).toBe("Acoustic Guitar");
    expect(skill.proficiency).toBe("familiar");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() => createSkill({ ...baseInput, name: "" })).toThrow(InvalidNameError);
  });

  it("throws InvalidNameError for whitespace-only name", () => {
    expect(() => createSkill({ ...baseInput, name: "   " })).toThrow(InvalidNameError);
  });
});

describe("updateSkill", () => {
  const skill = createSkill(baseInput);

  it("updates proficiency", () => {
    const updated = updateSkill(skill, { proficiency: "expert" });
    expect(updated.proficiency).toBe("expert");
    expect(updated.name).toBe("TypeScript"); // unchanged
  });

  it("updates name", () => {
    const updated = updateSkill(skill, { name: "TypeScript 5.x" });
    expect(updated.name).toBe("TypeScript 5.x");
  });

  it("updates notes", () => {
    const updated = updateSkill(skill, { notes: "Learning generics" });
    expect(updated.notes).toBe("Learning generics");
  });

  it("appends new sources", () => {
    const newSource: SkillSource = {
      type: "assessed",
      date: new Date(),
    };
    const updated = updateSkill(skill, { addSources: [newSource] });
    expect(updated.sources).toHaveLength(1);

    const updated2 = updateSkill(updated, {
      addSources: [{ type: "self-reported", date: new Date() }],
    });
    expect(updated2.sources).toHaveLength(2);
  });

  it("appends new usage records", () => {
    const usage: SkillUsage = {
      context: "New project",
      lastUsed: new Date(),
      frequency: "weekly",
    };
    const updated = updateSkill(skill, { addUsage: [usage] });
    expect(updated.usage).toHaveLength(1);
  });

  it("updates the updatedAt timestamp", () => {
    const before = skill.updatedAt;
    const updated = updateSkill(skill, { proficiency: "expert" });
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });

  it("does not mutate the original skill", () => {
    updateSkill(skill, { proficiency: "expert", notes: "changed" });
    expect(skill.proficiency).toBe("proficient");
    expect(skill.notes).toBeUndefined();
  });

  it("throws InvalidNameError for empty name update", () => {
    expect(() => updateSkill(skill, { name: "" })).toThrow(InvalidNameError);
  });
});

describe("getSkillFreshness", () => {
  it("returns 0 for skill with no usage", () => {
    const skill = createSkill(baseInput);
    expect(getSkillFreshness(skill)).toBe(0);
  });

  it("returns 1.0 for skill used today", () => {
    const now = new Date("2026-06-15T12:00:00Z");
    const skill = createSkill({
      ...baseInput,
      usage: [{ context: "work", lastUsed: now }],
    });
    expect(getSkillFreshness(skill, now)).toBe(1);
  });

  it("returns ~0.5 at half-life (90 days)", () => {
    const lastUsed = new Date("2026-01-01");
    const now = new Date("2026-04-01"); // ~90 days later
    const skill = createSkill({
      ...baseInput,
      usage: [{ context: "work", lastUsed }],
    });

    const freshness = getSkillFreshness(skill, now);
    expect(freshness).toBeCloseTo(0.5, 1);
  });

  it("decays over time", () => {
    const lastUsed = new Date("2026-01-01");
    const skill = createSkill({
      ...baseInput,
      usage: [{ context: "work", lastUsed }],
    });

    const fresh30 = getSkillFreshness(skill, new Date("2026-01-31"));
    const fresh90 = getSkillFreshness(skill, new Date("2026-04-01"));
    const fresh180 = getSkillFreshness(skill, new Date("2026-06-30"));

    expect(fresh30).toBeGreaterThan(fresh90);
    expect(fresh90).toBeGreaterThan(fresh180);
    expect(fresh180).toBeGreaterThan(0);
  });

  it("uses the most recent usage date", () => {
    const now = new Date("2026-06-15");
    const skill = createSkill({
      ...baseInput,
      usage: [
        { context: "old project", lastUsed: new Date("2025-01-01") },
        { context: "recent work", lastUsed: new Date("2026-06-14") },
      ],
    });

    const freshness = getSkillFreshness(skill, now);
    // 1 day ago — should be very fresh
    expect(freshness).toBeGreaterThan(0.99);
  });

  it("supports custom half-life", () => {
    const lastUsed = new Date("2026-01-01");
    const now = new Date("2026-01-31"); // 30 days
    const skill = createSkill({
      ...baseInput,
      usage: [{ context: "work", lastUsed }],
    });

    const freshness = getSkillFreshness(skill, now, 30);
    expect(freshness).toBeCloseTo(0.5, 1);
  });
});
