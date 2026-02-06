import { describe, expect, it } from "vitest";

import { createProfile, toProfileId } from "../../domain/index.js";
import { JsonExporter } from "./json-exporter.js";
import { createExportTestProfile } from "./test-helpers.js";

describe("JsonExporter", () => {
  const exporter = new JsonExporter();

  it("exports valid JSON", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(() => JSON.parse(output)).not.toThrow();
  });

  it("exports pretty-printed with trailing newline", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    expect(output.endsWith("\n")).toBe(true);
    expect(output).toContain("\n  ");
  });

  it("includes all profile data", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed["name"]).toBe("Test User");
    expect((parsed["skills"] as unknown[]).length).toBeGreaterThan(0);
    expect((parsed["goals"] as unknown[]).length).toBeGreaterThan(0);
    expect((parsed["interests"] as unknown[]).length).toBeGreaterThan(0);
  });

  it("converts dates to ISO strings", () => {
    const profile = createExportTestProfile();
    const output = exporter.export(profile);
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(typeof parsed["createdAt"]).toBe("string");
    expect(typeof parsed["updatedAt"]).toBe("string");
  });

  it("handles empty profile", () => {
    const profile = createProfile({ id: toProfileId("empty"), name: "Empty" });
    const output = exporter.export(profile);
    const parsed = JSON.parse(output) as Record<string, unknown>;
    expect((parsed["skills"] as unknown[]).length).toBe(0);
  });
});
