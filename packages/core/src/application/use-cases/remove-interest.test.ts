import { beforeEach, describe, expect, it } from "vitest";
import { InterestNotFoundError } from "../../domain/index.js";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addInterest } from "./add-interest.js";
import { removeInterest } from "./remove-interest.js";

describe("removeInterest", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    await repo.save(createProfileWithBuiltInDomains());

    await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "WebAssembly",
      domainId: "builtin-domain-software-development",
    });
  });

  it("removes the interest and returns confirmation", async () => {
    const result = await removeInterest({ profileRepository: repo }, {
      interestId: "interest-1",
    });

    expect(result.removed).toBe(true);
  });

  it("persists the removal in the repository", async () => {
    await removeInterest({ profileRepository: repo }, { interestId: "interest-1" });

    const stored = await repo.load();
    expect(stored!.interests).toHaveLength(0);
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      removeInterest({ profileRepository: emptyRepo }, { interestId: "interest-1" }),
    ).rejects.toThrow(ProfileNotFoundError);
  });

  it("throws InterestNotFoundError for nonexistent interest", async () => {
    await expect(
      removeInterest({ profileRepository: repo }, { interestId: "nonexistent" }),
    ).rejects.toThrow(InterestNotFoundError);
  });
});
