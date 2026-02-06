import { createSlug } from "../../domain/index.js";
import type { Slug } from "../../domain/index.js";

/**
 * Transform an arbitrary name into a valid Slug.
 * - Lowercases
 * - Replaces spaces and special characters with hyphens
 * - Collapses consecutive hyphens
 * - Strips leading/trailing hyphens
 * - Passes result to createSlug() for branding + validation
 *
 * Examples:
 *   "TypeScript 5.x" → "typescript-5-x"
 *   "C#"             → "c-sharp"
 *   "Machine Learning" → "machine-learning"
 */
export function slugify(name: string): Slug {
  const slug = name
    .toLowerCase()
    .replace(/[#]/g, "-sharp")
    .replace(/[+]/g, "-plus")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

  return createSlug(slug);
}
