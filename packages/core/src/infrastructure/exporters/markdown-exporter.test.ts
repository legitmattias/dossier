import { describe, expect, it } from "vitest";

import { createProfile, toProfileId } from "../../domain/index.js";
import { MarkdownExporter } from "./markdown-exporter.js";
import { createExportTestProfile, createExportTestProfileWithCompletedGoal } from "./test-helpers.js";

describe("MarkdownExporter", () => {
  const exporter = new MarkdownExporter();

  it("starts with Dossier Profile heading and last-updated line", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.startsWith("# Test User — Dossier Profile\n")).toBe(true);
    expect(output).toContain("_Profile last updated:");
  });

  it("groups content by domain", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## Software Development");
  });

  it("renders skills grouped by category", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("#### Programming Languages");
    expect(output).toContain("| Skill | Proficiency | Updated | Description |");
    expect(output).toContain("| TypeScript | advanced |");
  });

  it("renders goals with status and progress", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("**Learn Rust**");
    expect(output).toContain("active");
    expect(output).toContain("high priority");
  });

  it("separates completed goals into their own section", () => {
    const profile = createExportTestProfileWithCompletedGoal();
    const output = exporter.export(profile);
    expect(output).toContain("### Learning Goals");
    expect(output).toContain("**Learn Rust**");
    expect(output).toContain("### Completed Goals");
    expect(output).toContain("~~Learn Python~~");
  });

  it("renders interests as bullet list", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("- Machine Learning");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    expect(output).toContain("# Empty — Dossier Profile");
    expect(output).toContain("_Profile last updated:");
    expect(output.endsWith("\n")).toBe(true);
  });

  it("ends with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
  });
});
