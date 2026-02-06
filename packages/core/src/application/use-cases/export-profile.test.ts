import { beforeEach, describe, expect, it } from "vitest";
import {
  createProfileWithBuiltInDomains,
  InMemoryProfileRepository,
  StubExporter,
  StubIdGenerator,
} from "../__tests__/fixtures.js";
import { ProfileNotFoundError } from "../errors/application-errors.js";
import { addInterest } from "./add-interest.js";
import { addLearningGoal } from "./add-learning-goal.js";
import { addSkill } from "./add-skill.js";
import { exportProfile } from "./export-profile.js";

describe("exportProfile", () => {
  let repo: InMemoryProfileRepository;
  let idGen: StubIdGenerator;
  let exporter: StubExporter;

  beforeEach(async () => {
    repo = new InMemoryProfileRepository();
    idGen = new StubIdGenerator();
    exporter = new StubExporter();
    await repo.save(createProfileWithBuiltInDomains());

    // Seed data across domains
    await addSkill({ profileRepository: repo, idGenerator: idGen }, {
      name: "TypeScript",
      domainId: "builtin-domain-software-development",
      categoryId: "builtin-category-software-development-languages",
      proficiency: "proficient",
    });
    await addLearningGoal({ profileRepository: repo, idGenerator: idGen }, {
      name: "Learn Rust",
      domainId: "builtin-domain-software-development",
    });
    await addInterest({ profileRepository: repo, idGenerator: idGen }, {
      name: "Swedish Literature",
      domainId: "builtin-domain-languages",
    });
  });

  it("delegates to the exporter and returns its output", async () => {
    exporter.output = "# My Profile\n...";
    const result = await exportProfile({ profileRepository: repo, exporter }, {});

    expect(result.content).toBe("# My Profile\n...");
    expect(exporter.calls).toHaveLength(1);
  });

  it("passes the full profile when no filters applied", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {});

    const call = exporter.calls[0];
    expect(call.profile.skills).toHaveLength(1);
    expect(call.profile.goals).toHaveLength(1);
    expect(call.profile.interests).toHaveLength(1);
  });

  it("filters by domain IDs", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {
      domainIds: ["builtin-domain-software-development"],
    });

    const call = exporter.calls[0];
    expect(call.profile.skills).toHaveLength(1);
    expect(call.profile.goals).toHaveLength(1);
    expect(call.profile.interests).toHaveLength(0); // language interest filtered out
    expect(call.profile.domains).toHaveLength(1);
    expect(call.profile.domains[0].id).toBe("builtin-domain-software-development");
  });

  it("excludes skills when includeSkills is false", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {
      includeSkills: false,
    });

    const call = exporter.calls[0];
    expect(call.profile.skills).toHaveLength(0);
    expect(call.profile.goals).toHaveLength(1);
    expect(call.profile.interests).toHaveLength(1);
  });

  it("excludes goals when includeGoals is false", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {
      includeGoals: false,
    });

    const call = exporter.calls[0];
    expect(call.profile.skills).toHaveLength(1);
    expect(call.profile.goals).toHaveLength(0);
  });

  it("excludes interests when includeInterests is false", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {
      includeInterests: false,
    });

    const call = exporter.calls[0];
    expect(call.profile.interests).toHaveLength(0);
  });

  it("passes export options to the exporter", async () => {
    await exportProfile({ profileRepository: repo, exporter }, {
      domainIds: ["builtin-domain-software-development"],
      includeSkills: true,
      includeGoals: false,
    });

    const call = exporter.calls[0];
    expect(call.options).toEqual({
      domainIds: ["builtin-domain-software-development"],
      includeSkills: true,
      includeGoals: false,
      includeInterests: undefined,
    });
  });

  it("throws ProfileNotFoundError when no profile exists", async () => {
    const emptyRepo = new InMemoryProfileRepository();
    await expect(
      exportProfile({ profileRepository: emptyRepo, exporter }, {}),
    ).rejects.toThrow(ProfileNotFoundError);
  });
});
