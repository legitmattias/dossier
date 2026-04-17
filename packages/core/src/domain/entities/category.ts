import { InvalidNameError } from "../errors/domain-errors.js";
import type { CategoryId } from "../value-objects/identifiers.js";
import type { Slug } from "../value-objects/slug.js";

export interface Category {
  readonly id: CategoryId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCategoryInput {
  readonly id: CategoryId;
  readonly slug: Slug;
  readonly name: string;
  readonly description?: string;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createCategory(input: CreateCategoryInput): Readonly<Category> {
  if (input.name.trim().length === 0) {
    throw new InvalidNameError("Category", input.name);
  }

  const now = new Date();
  const createdAt = input.createdAt ?? now;
  return {
    id: input.id,
    slug: input.slug,
    name: input.name.trim(),
    ...(input.description !== undefined && { description: input.description }),
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
  };
}
