import { beforeEach, describe, expect, it } from "vitest";
import { DomainNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addDomain } from "./add-domain.js";
import { updateDomain } from "./update-domain.js";

describe("updateDomain", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;
  let customDomainId: string;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed a custom domain for update tests
    const result = await addDomain(
      { profileRepository: repo, idGenerator: idGen },
      { name: "Music", description: "Musical skills" },
    );
    customDomainId = result.domain.id;
  });

  it("updates domain name", async () => {
    const result = await updateDomain({ profileRepository: repo }, {
      domainId: customDomainId,
      name: "Music Production",
    });

    expect(result.domain.name).toBe("Music Production");
    expect(result.domain.id).toBe(customDomainId);
  });

  it("updates domain visibility", async () => {
    const result = await updateDomain({ profileRepository: repo }, {
      domainId: customDomainId,
      visibility: "private",
    });

    expect(result.domain.visibility).toBe("private");
  });

  it("updates domain proficiencyLabels", async () => {
    const labels = {
      novice: "beginner",
      familiar: "intermediate",
      proficient: "skilled",
      advanced: "virtuoso",
      expert: "master",
    };

    const result = await updateDomain({ profileRepository: repo }, {
      domainId: customDomainId,
      proficiencyLabels: labels,
    });

    expect(result.domain.proficiencyLabels).toEqual(labels);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      updateDomain({ profileRepository: emptyRepo }, {
        domainId: customDomainId,
        name: "New Name",
      }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws DomainNotFoundError for nonexistent domain", async () => {
    await expect(
      updateDomain({ profileRepository: repo }, {
        domainId: "nonexistent-domain",
        name: "New Name",
      }),
    ).rejects.toThrow(DomainNotFoundError);
  });

  it("preserves other domain fields when updating one field", async () => {
    // First set proficiencyLabels
    await updateDomain({ profileRepository: repo }, {
      domainId: customDomainId,
      proficiencyLabels: { novice: "beginner", expert: "master" },
    });

    // Then update only the name
    const result = await updateDomain({ profileRepository: repo }, {
      domainId: customDomainId,
      name: "Music Theory",
    });

    expect(result.domain.name).toBe("Music Theory");
    expect(result.domain.proficiencyLabels).toEqual({ novice: "beginner", expert: "master" });
    expect(result.domain.visibility).toBe("public");
  });
});
