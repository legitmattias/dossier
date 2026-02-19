import { describe, expect, it } from "vitest";

import { createProfile, toProfileId } from "../../domain/index.js";
import { PlainTextExporter } from "./plain-text-exporter.js";
import { createExportTestProfile, createExportTestProfileWithCompletedGoal } from "./test-helpers.js";

describe("PlainTextExporter", () => {
  const exporter = new PlainTextExporter();

  it("starts with Dossier Profile: name", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.startsWith("Dossier Profile: Test User\n")).toBe(true);
  });

  it("shows domain name as section header", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("\nSoftware Development\n");
  });

  it("lists skills with proficiency", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("    TypeScript (proficient)");
  });

  it("lists goals with status and priority", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("    Learn Rust [active, high]");
  });

  it("separates completed goals into their own section", () => {
    const profile = createExportTestProfileWithCompletedGoal();
    const output = exporter.export(profile);
    expect(output).toContain("  Learning Goals:");
    expect(output).toContain("    Learn Rust [active, high]");
    expect(output).toContain("  Completed Goals:");
    expect(output).toContain("    Learn Python");
  });

  it("lists interests", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output).toContain("    Machine Learning");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    expect(output).toBe("Dossier Profile: Empty\n");
  });

  it("uses correct indentation", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    // Domain at 0 indent, section labels at 2, items at 4
    expect(output).toContain("  Skills:");
    expect(output).toContain("    TypeScript");
  });
});
