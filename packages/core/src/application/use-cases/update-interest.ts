import {
  findInterestInProfile,
  toInterestId,
  updateInterestInProfile,
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
  readonly notes?: string;
  readonly visibility?: string;
  readonly featured?: boolean;
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
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.visibility !== undefined && { visibility: input.visibility as "public" | "private" }),
    ...(input.featured !== undefined && { featured: input.featured }),
    updatedAt: new Date(),
  };

  const updatedProfile = updateInterestInProfile(profile, interestId, updatedInterest);
  await deps.profileRepository.save(updatedProfile);

  return { interest: toInterestOutput(updatedInterest) };
}
