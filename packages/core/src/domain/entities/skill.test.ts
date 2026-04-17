import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toCategoryId, toDomainId, toSkillId } from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createSkill, updateSkill } from "./skill.js";
import type { SkillSource } from "./skill.js";

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

    const skill = createSkill({
      ...baseInput,
      sources: [source],
      notes: "Primary language",
    });

    expect(skill.sources).toHaveLength(1);
    expect(skill.sources[0]!.type).toBe("self-reported");
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
