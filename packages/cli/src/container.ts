import {
  application,
  infrastructure,
} from "@dossier/core";

export interface Container {
  readonly profilePath: string;
  readonly profileRepository: application.IProfileRepository;
  readonly idGenerator: application.IIdGenerator;
}

export function createContainer(profilePath?: string): Container {
  const filePath = profilePath ?? infrastructure.getDefaultProfilePath();
  return {
    profilePath: filePath,
    profileRepository: new infrastructure.FileProfileRepository(filePath),
    idGenerator: new infrastructure.UuidIdGenerator(),
  };
}
