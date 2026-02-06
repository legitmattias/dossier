import { CategoryNotFoundError, InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId, DomainId } from "../value-objects/identifiers.js";
import type { Slug } from "../value-objects/slug.js";
import type { Category } from "./category.js";

export interface Domain {
  readonly id: DomainId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly categories: readonly Category[];
  readonly isBuiltIn: boolean;
}

export interface CreateDomainInput {
  readonly id: DomainId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly categories?: readonly Category[];
  readonly isBuiltIn?: boolean;
}

export function createDomain(input: CreateDomainInput): Readonly<Domain> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Domain", input.name);
  }

  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    ...(input.description !== undefined && { description: input.description }),
    categories: input.categories ?? [],
    isBuiltIn: input.isBuiltIn ?? false,
  };
}

export function addCategoryToDomain(domain: Domain, category: Category): Readonly<Domain> {
  return {
    ...domain,
    categories: [...domain.categories, category],
  };
}

export function findCategoryInDomain(
  domain: Domain,
  categoryId: CategoryId,
): Readonly<Category> {
  const category = domain.categories.find((c) => c.id === categoryId);
  if (!category) {
    throw new CategoryNotFoundError(categoryId);
  }
  return category;
}
