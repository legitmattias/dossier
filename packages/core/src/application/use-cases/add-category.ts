import {
  addCategoryToDomain,
  createCategory,
  toCategoryId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { resolveDomainInProfile } from "../helpers/resolve.js";
import { slugify } from "../helpers/slugify.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddCategoryDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export interface AddCategoryInput {
  readonly domainId: string;
  readonly name: string;
  readonly description?: string;
}

export interface AddCategoryOutput {
  readonly category: { readonly id: string; readonly slug: string; readonly name: string };
}

export async function addCategory(
  deps: AddCategoryDeps,
  input: AddCategoryInput,
): Promise<AddCategoryOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const domain = resolveDomainInProfile(profile, input.domainId);
  const categoryId = toCategoryId(deps.idGenerator.generate("category"));
  const slug = slugify(input.name);
  const category = createCategory({ id: categoryId, slug, name: input.name, description: input.description });
  const updatedDomain = addCategoryToDomain(domain, category);

  const updatedProfile = {
    ...profile,
    domains: profile.domains.map((d) => d.id === domain.id ? updatedDomain : d),
    updatedAt: new Date(),
  };
  await deps.profileRepository.save(updatedProfile);

  return { category: { id: categoryId, slug: category.slug, name: category.name } };
}
