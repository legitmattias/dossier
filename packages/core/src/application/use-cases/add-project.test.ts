import { beforeEach, describe, expect, it } from "vitest";
import { InvalidSlugError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addProject } from "./add-project.js";

describe("addProject", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());
  });

  it("adds a project and returns the DTO", async () => {
    const result = await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
    });

    expect(result.project.id).toBe("project-1");
    expect(result.project.slug).toBe("dossier");
    expect(result.project.name).toBe("Dossier");
    expect(result.project.status).toBe("active");
    expect(result.project.priority).toBe("medium");
    expect(result.project.featured).toBe(false);
    expect(result.project.createdAt).toBeDefined();
    expect(result.project.updatedAt).toBeDefined();
  });

  it("persists the project in the repository", async () => {
    await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
    });

    const stored = await repo.load();
    expect(stored!.projects).toHaveLength(1);
    expect(stored!.projects[0].name).toBe("Dossier");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      addProject({ profileRepository: emptyRepo, idGenerator: idGen }, {
        name: "Dossier",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws InvalidSlugError for empty name", async () => {
    await expect(
      addProject({ profileRepository: repo, idGenerator: idGen }, {
        name: "",
      }),
    ).rejects.toThrow(InvalidSlugError);
  });

  it("works with optional fields", async () => {
    const result = await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Dossier",
      url: "https://github.com/example/dossier",
      description: "A personal knowledge profile tool",
      role: "Lead Developer",
      highlights: ["Built CLI", "Designed architecture"],
    });

    expect(result.project.url).toBe("https://github.com/example/dossier");
    expect(result.project.description).toBe("A personal knowledge profile tool");
    expect(result.project.role).toBe("Lead Developer");
    expect(result.project.highlights).toEqual(["Built CLI", "Designed architecture"]);
  });

  // Domain extensibility: non-dev project
  it("works for a non-software-development project", async () => {
    const result = await addProject({ profileRepository: repo, idGenerator: idGen }, {
      name: "Language Exchange Blog",
      description: "A blog about language learning experiences",
      role: "Author",
    });

    expect(result.project.name).toBe("Language Exchange Blog");
    expect(result.project.slug).toBe("language-exchange-blog");
    expect(result.project.description).toBe("A blog about language learning experiences");
  });
});
