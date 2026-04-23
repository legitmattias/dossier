import type { IExporter } from "../../application/ports/exporter.js";
import { JsonExporter } from "./json-exporter.js";
import { LlmMdExporter } from "./llm-md-exporter.js";
import { MarkdownExporter } from "./markdown-exporter.js";
import { PlainTextExporter } from "./plain-text-exporter.js";

const ALIASES: ReadonlyMap<string, string> = new Map([
  ["md", "markdown"],
  ["txt", "text"],
  ["plain", "text"],
]);

const FACTORIES: ReadonlyMap<string, () => IExporter> = new Map([
  ["json", () => new JsonExporter()],
  ["markdown", () => new MarkdownExporter()],
  ["text", () => new PlainTextExporter()],
  ["llm-md", () => new LlmMdExporter()],
]);

/**
 * Create an exporter for the given format string.
 * Supports aliases: "md" → "markdown", "txt"/"plain" → "text".
 */
export function createExporter(format: string): IExporter {
  const normalized = format.toLowerCase().trim();
  const resolved = ALIASES.get(normalized) ?? normalized;
  const factory = FACTORIES.get(resolved);

  if (!factory) {
    const supported = getSupportedFormats().join(", ");
    throw new Error(
      `Unknown export format: "${format}". Supported formats: ${supported}`,
    );
  }

  return factory();
}

/**
 * Get all supported format names (canonical + aliases).
 */
export function getSupportedFormats(): readonly string[] {
  return [...FACTORIES.keys(), ...ALIASES.keys()];
}
