import { InvalidSlugError } from "../errors/domain-errors.js";

export type Slug = string & { readonly __brand: "Slug" };

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Creates a Slug from a string value.
 * Normalizes to lowercase before validation.
 * Valid slugs: lowercase alphanumeric segments separated by single hyphens.
 * Examples: "typescript", "c-sharp", "machine-learning"
 */
export function createSlug(value: string): Slug {
  const normalized = value.toLowerCase().trim();
  if (!SLUG_PATTERN.test(normalized)) {
    throw new InvalidSlugError(value);
  }
  return normalized as Slug;
}
