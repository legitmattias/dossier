import { beforeEach, describe, expect, it } from "vitest";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addProject } from "./add-project.js";
import { listProjects } from "./list-projects.js";

describe("listProjects", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed 3 projects: one featured+active, one active, one completed
    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
      status: "active",
      featured: true,
    });
    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Side Project",
      status: "active",
    });
    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Old Project",
      status: "completed",
    });
  });

  it("returns all projects when no filters applied", async () => {
    const result = await listProjects({ profileRepository: repo });
    expect(result.projects).toHaveLength(3);
  });

  it("filters by status", async () => {
    const result = await listProjects({ profileRepository: repo }, {
      status: "active",
    });

    expect(result.projects).toHaveLength(2);
    expect(result.projects.every((p) => p.status === "active")).toBe(true);
  });

  it("filters by featured", async () => {
    const result = await listProjects({ profileRepository: repo }, {
      featured: true,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Dossier");
  });

  it("combines status and featured filters", async () => {
    const result = await listProjects({ profileRepository: repo }, {
      status: "active",
      featured: true,
    });

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].name).toBe("Dossier");
  });

  it("returns empty array when no projects match", async () => {
    const result = await listProjects({ profileRepository: repo }, {
      status: "paused",
    });

    expect(result.projects).toHaveLength(0);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      listProjects({ profileRepository: emptyRepo }),
    ).rejects.toThrow(ProfileNotFoundError);
  });
});
