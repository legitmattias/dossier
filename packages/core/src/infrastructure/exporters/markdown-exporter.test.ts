import { describe, expect, it } from "vitest";

import { createProfile, toProfileId } from "../../domain/index.js";
import { MarkdownExporter } from "./markdown-exporter.js";
import { createExportTestProfile } from "./test-helpers.js";

describe("MarkdownExporter", () => {
  const exporter = new MarkdownExporter();

  it("starts with profile name as h1", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.startsWith("# Test User\n")).toBe(true);
  });

  it("groups content by domain", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("## Software Development");
  });

  it("renders skills as a table", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("| Skill | Proficiency | Notes |");
    expect(output).toContain("| TypeScript | proficient |");
  });

  it("renders goals with status and progress", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("**Learn Rust**");
    expect(output).toContain("active");
    expect(output).toContain("high priority");
  });

  it("renders interests as bullet list", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("- Machine Learning");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    expect(output).toBe("# Empty\n");
  });

  it("ends with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
  });
});
