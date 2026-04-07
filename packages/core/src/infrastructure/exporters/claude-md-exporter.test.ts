import { describe, expect, it } from "vitest";

import {
  addDomainToProfile,
  addGoalToProfile,
  addSkillToProfile,
  BUILT_IN_DOMAINS,
  createLearningGoal,
  createProfile,
  createSkill,
  toGoalId,
  toProfileId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import { ClaudeMdExporter } from "./claude-md-exporter.js";
import { createExportTestProfile, createExportTestProfileWithCompletedGoal } from "./test-helpers.js";

describe("ClaudeMdExporter", () => {
  const exporter = new ClaudeMdExporter();

  it("starts with Dossier Profile heading", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.startsWith("# Dossier Profile: Test User\n")).toBe(true);
  });

  it("groups skills by domain and category", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("### Software Development");
    expect(output).toContain("**Programming Languages:**");
    expect(output).toContain("TypeScript (advanced)");
  });

  it("shows category name for skills", () => {
    const domain = BUILT_IN_DOMAINS[0]!;
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, domain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("Rust"),
      name: "Rust",
      domainId: domain.id,
      categoryId: domain.categories[0]!.id,
      proficiency: "novice",
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    expect(output).toContain("**Programming Languages:**");
    expect(output).toContain("Rust (novice)");
  });

  it("shows freshness hints for skills with usage", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    // The test profile has usage data, so should show freshness
    expect(output).toMatch(/\[last used:.*\]/);
  });

  it("shows active goals as Currently Learning", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## Currently Learning");
    expect(output).toContain("**Learn Rust**");
    expect(output).toContain("high priority");
  });

  it("shows paused goals in Paused section", () => {
    const domain = BUILT_IN_DOMAINS[0]!;
    let profile = createExportTestProfile();
    const pausedGoal = createLearningGoal({
      id: toGoalId("goal-paused"),
      name: "Learn Go",
      domainId: domain.id,
      priority: "low",
      status: "paused",
    });
    profile = addGoalToProfile(profile, pausedGoal);

    const output = exporter.export(profile);
    expect(output).toContain("## Paused");
    expect(output).toContain("Learn Go — paused");
  });

  it("shows completed goals in Completed Learning section", () => {
    const profile = createExportTestProfileWithCompletedGoal();
    const output = exporter.export(profile);
    expect(output).toContain("## Completed Learning");
    expect(output).toContain("~~Learn Python~~");
  });

  it("shows interests as On My Radar", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## On My Radar");
    expect(output).toContain("- Machine Learning");
  });

  it("includes guidance section for strong skills", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## When suggesting solutions:");
    expect(output).toContain("Prefer TypeScript — this is a strength");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    expect(output).toBe("# Dossier Profile: Empty\n");
  });

  it("ends with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
  });
});
