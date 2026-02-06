import {
  application,
  infrastructure,
} from "@dossier/core";

export interface Container {
  readonly profileRepository: application.IProfileRepository;
  readonly idGenerator: application.IIdGenerator;
}

export function createContainer(profilePath?: string): Container {
  const filePath = profilePath ?? infrastructure.getDefaultProfilePath();
  return {
    profileRepository: new infrastructure.FileProfileRepository(filePath),
    idGenerator: new infrastructure.UuidIdGenerator(),
  };
}
