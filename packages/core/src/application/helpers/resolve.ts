/**
 * Shared helpers for resolving domains and categories by ID, slug, or name.
 * Used by CLI, MCP, and API to avoid duplicating resolution logic.
 */
import type { Profile, Domain, Category } from "../../domain/index.js";
import type { DomainId, CategoryId } from "../../domain/index.js";
import { DomainNotFoundError, CategoryNotFoundError } from "../../domain/index.js";

/**
 * Resolve a domain by ID, slug, or case-insensitive name.
 * Throws DomainNotFoundError if not found.
 */
export function resolveDomainInProfile(profile: Profile, idOrSlugOrName: string): Domain {
  // Try exact ID match
  const byId = profile.domains.find((d) => d.id === idOrSlugOrName);
  if (byId) return byId;

  // Try slug match
  const bySlug = profile.domains.find((d) => d.slug === idOrSlugOrName);
  if (bySlug) return bySlug;

  // Try case-insensitive name match
  const lower = idOrSlugOrName.toLowerCase();
  const byName = profile.domains.find((d) => d.name.toLowerCase() === lower);
  if (byName) return byName;

  throw new DomainNotFoundError(idOrSlugOrName as DomainId);
}

/**
 * Resolve a category within a domain by ID, slug, or case-insensitive name.
 * Throws CategoryNotFoundError if not found.
 */
export function resolveCategoryInDomain(domain: Domain, idOrSlugOrName: string): Category {
  const byId = domain.categories.find((c) => c.id === idOrSlugOrName);
  if (byId) return byId;

  const bySlug = domain.categories.find((c) => c.slug === idOrSlugOrName);
  if (bySlug) return bySlug;

  const lower = idOrSlugOrName.toLowerCase();
  const byName = domain.categories.find((c) => c.name.toLowerCase() === lower);
  if (byName) return byName;

  throw new CategoryNotFoundError(idOrSlugOrName as CategoryId);
}
