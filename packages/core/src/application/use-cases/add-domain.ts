import {
  addDomainToProfile,
  createDomain,
  toDomainId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { slugify } from "../helpers/slugify.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddDomainDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export interface AddDomainInput {
  readonly name: string;
  readonly description?: string;
}

export interface AddDomainOutput {
  readonly domain: { readonly id: string; readonly slug: string; readonly name: string };
}

export async function addDomain(
  deps: AddDomainDeps,
  input: AddDomainInput,
): Promise<AddDomainOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const id = toDomainId(deps.idGenerator.generate("domain"));
  const slug = slugify(input.name);
  const domain = createDomain({ id, slug, name: input.name, description: input.description });
  const updated = addDomainToProfile(profile, domain);
  await deps.profileRepository.save(updated);

  return { domain: { id: domain.id, slug: domain.slug, name: domain.name } };
}
