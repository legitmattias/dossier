import { createCategory } from "./entities/category.js";
import { createDomain } from "./entities/domain-entity.js";
import type { Domain } from "./entities/domain-entity.js";
import { toCategoryId, toDomainId } from "./value-objects/identifiers.js";
import { createSlug } from "./value-objects/slug.js";

/**
 * Built-in domains with deterministic IDs.
 * ID format: "builtin-domain-{slug}" / "builtin-category-{domain-slug}-{category-slug}"
 * These are stable and can be referenced across installations.
 */

export const SOFTWARE_DEVELOPMENT: Readonly<Domain> = createDomain({
  id: toDomainId("builtin-domain-software-development"),
  slug: createSlug("software-development"),
  name: "Software Development",
  description: "Programming languages, frameworks, tools, and practices",
  isBuiltIn: true,
  categories: [
    createCategory({
      id: toCategoryId("builtin-category-software-development-languages"),
      slug: createSlug("languages"),
      name: "Programming Languages",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-frameworks"),
      slug: createSlug("frameworks"),
      name: "Frameworks & Libraries",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-databases"),
      slug: createSlug("databases"),
      name: "Databases",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-devops"),
      slug: createSlug("devops"),
      name: "DevOps & Infrastructure",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-testing"),
      slug: createSlug("testing"),
      name: "Testing",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-architecture"),
      slug: createSlug("architecture"),
      name: "Architecture & Design",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-tools"),
      slug: createSlug("tools"),
      name: "Tools & Editors",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-platforms"),
      slug: createSlug("platforms"),
      name: "Platforms & Services",
    }),
    createCategory({
      id: toCategoryId("builtin-category-software-development-practices"),
      slug: createSlug("practices"),
      name: "Practices & Methodologies",
    }),
  ],
});

export const LANGUAGES: Readonly<Domain> = createDomain({
  id: toDomainId("builtin-domain-languages"),
  slug: createSlug("languages"),
  name: "Languages",
  description: "Human/natural languages and communication skills",
  isBuiltIn: true,
  proficiencyLabels: {
    novice: "beginner",
    familiar: "elementary",
    proficient: "intermediate",
    advanced: "fluent",
    expert: "native",
  },
  categories: [
    createCategory({
      id: toCategoryId("builtin-category-languages-spoken"),
      slug: createSlug("spoken"),
      name: "Spoken Languages",
    }),
    createCategory({
      id: toCategoryId("builtin-category-languages-written"),
      slug: createSlug("written"),
      name: "Written & Literary",
    }),
    createCategory({
      id: toCategoryId("builtin-category-languages-sign"),
      slug: createSlug("sign"),
      name: "Sign Languages",
    }),
  ],
});

export const PROFESSIONAL: Readonly<Domain> = createDomain({
  id: toDomainId("builtin-domain-professional"),
  slug: createSlug("professional"),
  name: "Professional",
  description: "Business, management, and professional development skills",
  isBuiltIn: true,
  categories: [
    createCategory({
      id: toCategoryId("builtin-category-professional-leadership"),
      slug: createSlug("leadership"),
      name: "Leadership & Management",
    }),
    createCategory({
      id: toCategoryId("builtin-category-professional-communication"),
      slug: createSlug("communication"),
      name: "Communication",
    }),
    createCategory({
      id: toCategoryId("builtin-category-professional-strategy"),
      slug: createSlug("strategy"),
      name: "Strategy & Planning",
    }),
    createCategory({
      id: toCategoryId("builtin-category-professional-finance"),
      slug: createSlug("finance"),
      name: "Finance & Business",
    }),
  ],
});

export const BUILT_IN_DOMAINS: readonly Readonly<Domain>[] = [
  SOFTWARE_DEVELOPMENT,
  LANGUAGES,
  PROFESSIONAL,
];
