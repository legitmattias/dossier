import { describe, expect, it } from "vitest";

import { createExporter, getSupportedFormats } from "./exporter-factory.js";
import { JsonExporter } from "./json-exporter.js";
import { MarkdownExporter } from "./markdown-exporter.js";
import { PlainTextExporter } from "./plain-text-exporter.js";
import { LlmMdExporter } from "./llm-md-exporter.js";

describe("createExporter", () => {
  it("creates JSON exporter", () => {
    expect(createExporter("json")).toBeInstanceOf(JsonExporter);
  });

  it("creates Markdown exporter", () => {
    expect(createExporter("markdown")).toBeInstanceOf(MarkdownExporter);
  });

  it("creates plain text exporter", () => {
    expect(createExporter("text")).toBeInstanceOf(PlainTextExporter);
  });

  it("creates LLM MD exporter", () => {
    expect(createExporter("llm-md")).toBeInstanceOf(LlmMdExporter);
  });

  it("resolves aliases", () => {
    expect(createExporter("md")).toBeInstanceOf(MarkdownExporter);
    expect(createExporter("txt")).toBeInstanceOf(PlainTextExporter);
    expect(createExporter("plain")).toBeInstanceOf(PlainTextExporter);
  });

  it("is case-insensitive", () => {
    expect(createExporter("JSON")).toBeInstanceOf(JsonExporter);
    expect(createExporter("Markdown")).toBeInstanceOf(MarkdownExporter);
  });

  it("trims whitespace", () => {
    expect(createExporter("  json  ")).toBeInstanceOf(JsonExporter);
  });

  it("throws for unknown format", () => {
    expect(() => createExporter("yaml")).toThrow(/Unknown export format: "yaml"/);
    expect(() => createExporter("yaml")).toThrow(/Supported formats:/);
  });
});

describe("getSupportedFormats", () => {
  it("includes canonical formats and aliases", () => {
    const formats = getSupportedFormats();
    expect(formats).toContain("json");
    expect(formats).toContain("markdown");
    expect(formats).toContain("text");
    expect(formats).toContain("llm-md");
    expect(formats).toContain("md");
    expect(formats).toContain("txt");
  });
});
