import { InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId } from "../value-objects/identifiers.js";
import type { Slug } from "../value-objects/slug.js";

export interface Category {
  readonly id: CategoryId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
}

export interface CreateCategoryInput {
  readonly id: CategoryId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
}

export function createCategory(input: CreateCategoryInput): Readonly<Category> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Category", input.name);
  }

  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    ...(input.description !== undefined && { description: input.description }),
  };
}
