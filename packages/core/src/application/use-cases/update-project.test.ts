import { beforeEach, describe, expect, it } from "vitest";
import { ProjectNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addProject } from "./add-project.js";
import { updateProject } from "./update-project.js";

describe("updateProject", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed a project
    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
      status: "active",
    });
  });

  it("updates project name", async () => {
    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      name: "Dossier v2",
    });

    expect(result.project.name).toBe("Dossier v2");
  });

  it("updates project status", async () => {
    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      status: "completed",
    });

    expect(result.project.status).toBe("completed");
  });

  it("updates featured flag", async () => {
    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      featured: true,
    });

    expect(result.project.featured).toBe(true);
  });

  it("sets priority when provided", async () => {
    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      priority: "high",
    });

    expect(result.project.priority).toBe("high");
  });

  it("clears priority when passed null", async () => {
    await updateProject({ profileRepository: repo }, { projectId: "project-1", priority: "high" });

    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      priority: null,
    });

    expect(result.project.priority).toBeUndefined();
  });

  it("leaves priority unchanged when omitted", async () => {
    await updateProject({ profileRepository: repo }, { projectId: "project-1", priority: "low" });

    const result = await updateProject({ profileRepository: repo }, {
      projectId: "project-1",
      name: "Renamed",
    });

    expect(result.project.priority).toBe("low");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      updateProject({ profileRepository: emptyRepo }, {
        projectId: "project-1",
        name: "Updated",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws ProjectNotFoundError for nonexistent project", async () => {
    await expect(
      updateProject({ profileRepository: repo }, {
        projectId: "nonexistent",
        name: "Updated",
      }),
    ).rejects.toThrow(ProjectNotFoundError);
  });
});
