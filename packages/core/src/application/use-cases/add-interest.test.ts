import { beforeEach, describe, expect, it } from "vitest";
import { DomainNotFoundError, InvalidNameError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addInterest } from "./add-interest.js";

describe("addInterest", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());
  });

  it("adds an interest and returns the DTO", async () => {
    const result = await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "WebAssembly",
      domainId: "builtin-domain-software-development",
      description: "Interested in learning Wasm",
    });

    expect(result.interest.id).toBe("interest-1");
    expect(result.interest.name).toBe("WebAssembly");
    expect(result.interest.domainId).toBe("builtin-domain-software-development");
    expect(result.interest.description).toBe("Interested in learning Wasm");
    expect(result.interest.createdAt).toBeDefined();
  });

  it("persists the interest in the repository", async () => {
    await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "WebAssembly",
      domainId: "builtin-domain-software-development",
    });

    const stored = await repo.load();
    expect(stored!.interests).toHaveLength(1);
    expect(stored!.interests[0].name).toBe("WebAssembly");
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      addInterest({ profileRepository: emptyRepo, idGenerator: idGen }, {
        name: "WebAssembly",
        domainId: "builtin-domain-software-development",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws DomainNotFoundError for nonexistent domain", async () => {
    await expect(
      addInterest({ profileRepository: repo, idGenerator: idGen }, {
        name: "WebAssembly",
        domainId: "nonexistent-domain",
      }),
    ).rejects.toThrow(DomainNotFoundError);
  });

  it("throws InvalidNameError for empty name", async () => {
    await expect(
      addInterest({ profileRepository: repo, idGenerator: idGen }, {
        name: "",
        domainId: "builtin-domain-software-development",
      }),
    ).rejects.toThrow(InvalidNameError);
  });

  // Domain extensibility: non-dev domain
  it("works with the professional domain", async () => {
    const result = await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "Public Speaking",
      domainId: "builtin-domain-professional",
      description: "Want to improve presentation skills",
    });

    expect(result.interest.name).toBe("Public Speaking");
    expect(result.interest.domainId).toBe("builtin-domain-professional");
  });
});
