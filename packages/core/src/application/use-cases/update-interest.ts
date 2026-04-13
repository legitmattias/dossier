import {
  findInterestInProfile,
  toInterestId,
} from "../../domain/index.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { toInterestOutput } from "../helpers/mappers.js";
import type { InterestOutput } from "../dtos/interest-dtos.js";
import type { IProfileRepository } from "../ports/profile-repository.js";

export interface UpdateInterestDeps {
  readonly profileRepository: IProfileRepository;
}

export interface UpdateInterestInput {
  readonly interestId: string;
  readonly name?: string;
  readonly description?: string;
}

export interface UpdateInterestOutput {
  readonly interest: InterestOutput;
}

export async function updateInterest(
  deps: UpdateInterestDeps,
  input: UpdateInterestInput,
): Promise<UpdateInterestOutput> {
  const profile = await deps.profileRepository.load();
  if (!profile) throw new ProfileNotFoundError();

  const interestId = toInterestId(input.interestId);
  const interest = findInterestInProfile(profile, interestId);

  const updatedInterest = {
    ...interest,
    ...(input.name !== undefined && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
  };

  const updatedProfile = {
    ...profile,
    interests: profile.interests.map((i) => i.id === interestId ? updatedInterest : i),
    updatedAt: new Date(),
  };
  await deps.profileRepository.save(updatedProfile);

  return { interest: toInterestOutput(updatedInterest) };
}
