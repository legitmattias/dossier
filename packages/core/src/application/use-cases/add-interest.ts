import {
  addInterestToProfile,
  createInterest,
  findDomainInProfile,
  toDomainId,
  toInterestId,
} from "../../domain/index.js";
import type { AddInterestInput, AddInterestOutput } from "../dtos/interest-dtos.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toInterestOutput } from "../helpers/mappers.js";
import type { IIdGenerator } from "../ports/id-generator.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface AddInterestDeps {
  readonly profileRepository: IProfileRepository;
  readonly idGenerator: IIdGenerator;
}

export async function addInterest(
  deps: AddInterestDeps,
  input: AddInterestInput,
): Promise<AddInterestOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) {
    throw new ProfileNotFoundError();
  }

  // Validate domain exists if provided
  const domainId = input.domainId ? toDomainId(input.domainId) : undefined;
  if (domainId) {
    findDomainInProfile(profile, domainId);
  }

  const interestId = toInterestId(deps.idGenerator.generate("interest"));

  const interest = createInterest({
    id: interestId,
    name: input.name,
    domainId,
    description: input.description,
    visibility: input.visibility as "public" | "private" | undefined,
  });

  const updatedProfile = addInterestToProfile(profile, interest);
  await deps.profileRepository.save(updatedProfile);

  return { interest: toInterestOutput(interest) };
}
