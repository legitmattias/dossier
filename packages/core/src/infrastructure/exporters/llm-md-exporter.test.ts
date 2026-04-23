import { describe, expect, it } from "vitest";

import {
  addDomainToProfile,
  addGoalToProfile,
  addProjectToProfile,
  addSkillToProfile,
  BUILT_IN_DOMAINS,
  createDomain,
  createLearningGoal,
  createProfile,
  createProject,
  createSkill,
  createSlug,
  LANGUAGES,
  toDomainId,
  toGoalId,
  toProfileId,
  toProjectId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import { LlmMdExporter } from "./llm-md-exporter.js";
import { createExportTestProfile, createExportTestProfileWithCompletedGoal } from "./test-helpers.js";

describe("LlmMdExporter", () => {
  const exporter = new LlmMdExporter();

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

  it("includes compact guidance section", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## Guidance");
    expect(output).toContain("**Key strengths (advanced/expert):** TypeScript.");
    expect(output).toContain("**Currently learning:** Learn Rust (high).");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    expect(output).toContain("# Dossier Profile: Empty");
    expect(output).toContain("_Profile last updated:");
    expect(output.endsWith("\n")).toBe(true);
  });

  it("shows featured projects section", () => {
    let profile = createExportTestProfile();
    const project = createProject({
      id: toProjectId("project-1"),
      slug: createSlug(slugify("My App")),
      name: "My App",
      description: "A cool app",
      featured: true,
    });
    profile = addProjectToProfile(profile, project);

    const output = exporter.export(profile);
    expect(output).toContain("## Featured Projects");
    expect(output).toContain("**My App**");
    expect(output).toContain("A cool app");
  });

  it("shows active non-featured projects section", () => {
    let profile = createExportTestProfile();
    const project = createProject({
      id: toProjectId("project-2"),
      slug: createSlug(slugify("Side Project")),
      name: "Side Project",
    });
    profile = addProjectToProfile(profile, project);

    const output = exporter.export(profile);
    expect(output).toContain("## Active Projects");
  });

  it("ends with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
  });

  it("renders domain proficiency labels instead of raw proficiency", () => {
    const languagesDomain = LANGUAGES;
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, languagesDomain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("Swedish"),
      name: "Swedish",
      domainId: languagesDomain.id,
      categoryId: languagesDomain.categories[0]!.id,
      proficiency: "expert",
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    // Languages domain maps expert -> "native"
    expect(output).toContain("Swedish (native)");
    expect(output).not.toContain("Swedish (expert)");
  });

  it("respects skill-level proficiencyLabel override", () => {
    const languagesDomain = LANGUAGES;
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, languagesDomain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("Norwegian"),
      name: "Norwegian",
      domainId: languagesDomain.id,
      categoryId: languagesDomain.categories[0]!.id,
      proficiency: "advanced",
      proficiencyLabel: "near-native",
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    // Skill-level override should take precedence over domain label ("fluent")
    expect(output).toContain("Norwegian (near-native)");
    expect(output).not.toContain("Norwegian (fluent)");
  });

  it("hides skills in private domains from export", () => {
    const privateDomain = createDomain({
      id: toDomainId("private-domain"),
      slug: slugify("Secret Skills"),
      name: "Secret Skills",
      visibility: "private",
      categories: [{ id: "cat-1" as any, slug: "general" as any, name: "General", createdAt: new Date(), updatedAt: new Date() }],
    });
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, privateDomain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("Hidden Skill"),
      name: "Hidden Skill",
      domainId: privateDomain.id,
      categoryId: "cat-1" as any,
      proficiency: "advanced",
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    expect(output).not.toContain("Hidden Skill");
    expect(output).not.toContain("Secret Skills");
  });

  it("featured skills section uses domain labels", () => {
    const languagesDomain = LANGUAGES;
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, languagesDomain);
    const skill = createSkill({
      id: toSkillId("s1"),
      slug: slugify("English"),
      name: "English",
      domainId: languagesDomain.id,
      categoryId: languagesDomain.categories[0]!.id,
      proficiency: "expert",
      featured: true,
    });
    profile = addSkillToProfile(profile, skill);

    const output = exporter.export(profile);
    expect(output).toContain("## Key Skills");
    expect(output).toContain("**English** (native)");
    expect(output).not.toContain("**English** (expert)");
  });
});
