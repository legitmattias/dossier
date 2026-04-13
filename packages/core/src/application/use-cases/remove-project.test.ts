import { beforeEach, describe, expect, it } from "vitest";
import { ProjectNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addProject } from "./add-project.js";
import { removeProject } from "./remove-project.js";

describe("removeProject", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
    });
  });

  it("removes the project and returns confirmation", async () => {
    const result = await removeProject({ profileRepository: repo }, {
      projectId: "project-1",
    });

    expect(result.removed).toBe(true);
  });

  it("persists the removal in the repository", async () => {
    await removeProject({ profileRepository: repo }, { projectId: "project-1" });

    const stored = await repo.load();
    expect(stored!.projects).toHaveLength(0);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      removeProject({ profileRepository: emptyRepo }, { projectId: "project-1" }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ProjectNotFoundError for nonexistent project", async () => {
    await expect(
      removeProject({ profileRepository: repo }, { projectId: "nonexistent" }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
