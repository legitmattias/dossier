import { describe, expect, it } from "vitest";

import {
  addDomainToProfile,
  addSkillToProfile,
  BUILT_IN_DOMAINS,
  createProfile,
  createSkill,
  toProfileId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import { ClaudeMdExporter } from "./claude-md-exporter.js";
import { createExportTestProfile } from "./test-helpers.js";

describe("ClaudeMdExporter", () => {
  const exporter = new ClaudeMdExporter();

  it("starts with Developer Profile heading", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.startsWith("# Developer Profile: Test User\n")).toBe(true);
  });

  it("groups skills by proficiency tier", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("### Strong (proficient/expert)");
    expect(output).toContain("TypeScript (proficient)");
  });

  it("shows learning skills in Learning tier", () => {
    const domain = BUILT_IN_DOMAINS[0]!;
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, domain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("Rust"),
      name: "Rust",
      domainId: domain.id,
      categoryId: domain.categories[0]!.id,
      proficiency: "learning",
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    expect(output).toContain("### Learning");
    expect(output).toContain("Rust (learning) [no usage recorded]");
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
    expect(output).toBe("# Developer Profile: Empty\n");
  });

  it("ends with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
  });
});
