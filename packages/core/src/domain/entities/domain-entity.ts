import { CategoryNotFoundError, InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId, DomainId } from "../value-objects/identifiers.js";
import type { Proficiency } from "../value-objects/proficiency.js";
import type { Slug } from "../value-objects/slug.js";
import type { Category } from "./category.js";

export type ProficiencyLabels = Readonly<Partial<Record<Proficiency, string>>>;

export interface Domain {
  readonly id: DomainId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly categories: readonly Category[];
  readonly isBuiltIn: boolean;
  readonly visibility: "public" | "private";
  readonly proficiencyLabels?: ProficiencyLabels;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateDomainInput {
  readonly id: DomainId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly categories?: readonly Category[];
  readonly isBuiltIn?: boolean;
  readonly visibility?: "public" | "private";
  readonly proficiencyLabels?: ProficiencyLabels;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createDomain(input: CreateDomainInput): Readonly<Domain> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Domain", input.name);
  }

  const now = new Date();
  const createdAt = input.createdAt ?? now;
  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    ...(input.description !== undefined && { description: input.description }),
    categories: input.categories ?? [],
    isBuiltIn: input.isBuiltIn ?? false,
    visibility: input.visibility ?? "public",
    ...(input.proficiencyLabels !== undefined && { proficiencyLabels: input.proficiencyLabels }),
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
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
