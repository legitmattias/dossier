import { describe, expect, it } from "vitest";
import {
  DomainNotFoundError,
  DuplicateSkillError,
  GoalNotFoundError,
  InterestNotFoundError,
  InvalidNameError,
  ProjectNotFoundError,
  SkillNotFoundError,
} from "../errors/domain-errors.js";
import {
  toCategoryId,
  toDomainId,
  toGoalId,
  toInterestId,
  toProfileId,
  toProjectId,
  toSkillId,
} from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createCategory } from "./category.js";
import { createDomain } from "./domain-entity.js";
import { createInterest } from "./interest.js";
import { createLearningGoal } from "./learning-goal.js";
import { createProject } from "./project.js";
import {
  addDomainToProfile,
  addGoalToProfile,
  addInterestToProfile,
  addProjectToProfile,
  addSkillToProfile,
  createProfile,
  findDomainInProfile,
  findGoalInProfile,
  findInterestInProfile,
  findProjectInProfile,
  findSkillInProfile,
  removeDomainFromProfile,
  removeGoalFromProfile,
  removeInterestFromProfile,
  removeProjectFromProfile,
  removeSkillFromProfile,
  updateGoalInProfile,
  updateProjectInProfile,
  updateSkillInProfile,
} from "./profile.js";
import { createSkill, updateSkill } from "./skill.js";

// --- Test data factories ---

function makeProfile() {
  return createProfile({
    id: toProfileId("profile-1"),
    name: "Test User",
  });
}

function makeDomain(id = "domain-sw", slug = "software-development", name = "Software Development") {
  return createDomain({
    id: toDomainId(id),
    slug: createSlug(slug),
    name,
    categories: [
      createCategory({
        id: toCategoryId("cat-languages"),
        slug: createSlug("languages"),
        name: "Languages",
      }),
    ],
  });
}

function makeSkill(id = "skill-1", name = "TypeScript") {
  return createSkill({
    id: toSkillId(id),
    slug: createSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")),
    name,
    domainId: toDomainId("domain-sw"),
    categoryId: toCategoryId("cat-languages"),
    proficiency: "proficient",
  });
}

function makeGoal(id = "goal-1", name = "Learn Rust") {
  return createLearningGoal({
    id: toGoalId(id),
    name,
    domainId: toDomainId("domain-sw"),
  });
}

function makeInterest(id = "interest-1", name = "Distributed Systems") {
  return createInterest({
    id: toInterestId(id),
    name,
    domainId: toDomainId("domain-sw"),
  });
}

function makeProject(id = "project-1", name = "My Project") {
  return createProject({
    id: toProjectId(id),
    slug: createSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")),
    name,
  });
}

// --- Tests ---

describe("createProfile", () => {
  it("creates a profile with defaults", () => {
    const profile = makeProfile();

    expect(profile.id).toBe("profile-1");
    expect(profile.name).toBe("Test User");
    expect(profile.settings).toEqual({});
    expect(profile.domains).toEqual([]);
    expect(profile.skills).toEqual([]);
    expect(profile.goals).toEqual([]);
    expect(profile.interests).toEqual([]);
    expect(profile.projects).toEqual([]);
    expect(profile.createdAt).toBeInstanceOf(Date);
  });

  it("creates a profile with initial data", () => {
    const domain = makeDomain();
    const profile = createProfile({
      id: toProfileId("profile-2"),
      name: "Populated Profile",
      settings: { defaultDomainId: toDomainId("domain-sw") },
      domains: [domain],
    });

    expect(profile.domains).toHaveLength(1);
    expect(profile.settings.defaultDomainId).toBe("domain-sw");
  });

  it("trims the name", () => {
    const profile = createProfile({
      id: toProfileId("p"),
      name: "  Trimmed  ",
    });
    expect(profile.name).toBe("Trimmed");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() =>
      createProfile({ id: toProfileId("p"), name: "" }),
    ).toThrow(InvalidNameError);
  });
});

describe("domain operations", () => {
  it("adds a domain", () => {
    const profile = makeProfile();
    const domain = makeDomain();
    const updated = addDomainToProfile(profile, domain);

    expect(updated.domains).toHaveLength(1);
    expect(updated.domains[0]!.name).toBe("Software Development");
    expect(profile.domains).toHaveLength(0); // immutable
  });

  it("finds a domain by ID", () => {
    const domain = makeDomain();
    const profile = addDomainToProfile(makeProfile(), domain);
    const found = findDomainInProfile(profile, toDomainId("domain-sw"));

    expect(found.name).toBe("Software Development");
  });

  it("throws DomainNotFoundError for unknown domain", () => {
    expect(() => findDomainInProfile(makeProfile(), toDomainId("nope"))).toThrow(
      DomainNotFoundError,
    );
  });

  it("removes a domain and cascades to linked entities", () => {
    let profile = makeProfile();
    const domain = makeDomain();
    profile = addDomainToProfile(profile, domain);
    profile = addSkillToProfile(profile, makeSkill());
    profile = addGoalToProfile(profile, makeGoal());
    profile = addInterestToProfile(profile, makeInterest());

    expect(profile.skills).toHaveLength(1);
    expect(profile.goals).toHaveLength(1);
    expect(profile.interests).toHaveLength(1);

    const cleaned = removeDomainFromProfile(profile, toDomainId("domain-sw"));

    expect(cleaned.domains).toHaveLength(0);
    expect(cleaned.skills).toHaveLength(0);
    expect(cleaned.goals).toHaveLength(0);
    expect(cleaned.interests).toHaveLength(0);
  });

  it("throws DomainNotFoundError when removing unknown domain", () => {
    expect(() => removeDomainFromProfile(makeProfile(), toDomainId("nope"))).toThrow(
      DomainNotFoundError,
    );
  });
});

describe("skill operations", () => {
  it("adds a skill", () => {
    const profile = addSkillToProfile(makeProfile(), makeSkill());
    expect(profile.skills).toHaveLength(1);
  });

  it("prevents duplicate skills by ID", () => {
    const profile = addSkillToProfile(makeProfile(), makeSkill());
    expect(() => addSkillToProfile(profile, makeSkill())).toThrow(DuplicateSkillError);
  });

  it("prevents duplicate skills by slug + domain", () => {
    const profile = addSkillToProfile(makeProfile(), makeSkill("skill-1", "TypeScript"));
    const duplicate = makeSkill("skill-2", "TypeScript"); // different ID, same name/domain
    expect(() => addSkillToProfile(profile, duplicate)).toThrow(DuplicateSkillError);
  });

  it("rejects same skill name even in different domains (profile-wide uniqueness)", () => {
    const skill1 = createSkill({
      id: toSkillId("skill-1"),
      slug: createSlug("python"),
      name: "Python",
      domainId: toDomainId("domain-sw"),
      categoryId: toCategoryId("cat-languages"),
      proficiency: "familiar",
    });
    const skill2 = createSkill({
      id: toSkillId("skill-2"),
      slug: createSlug("python"),
      name: "Python",
      domainId: toDomainId("domain-other"),
      categoryId: toCategoryId("cat-other"),
      proficiency: "novice",
    });

    const profile = addSkillToProfile(makeProfile(), skill1);
    expect(() => addSkillToProfile(profile, skill2)).toThrow(/already exists/);
  });

  it("finds a skill by ID", () => {
    const profile = addSkillToProfile(makeProfile(), makeSkill());
    const found = findSkillInProfile(profile, toSkillId("skill-1"));
    expect(found.name).toBe("TypeScript");
  });

  it("throws SkillNotFoundError for unknown skill", () => {
    expect(() => findSkillInProfile(makeProfile(), toSkillId("nope"))).toThrow(
      SkillNotFoundError,
    );
  });

  it("updates a skill in the profile", () => {
    const skill = makeSkill();
    const profile = addSkillToProfile(makeProfile(), skill);
    const updatedSkill = updateSkill(skill, { proficiency: "expert" });
    const updated = updateSkillInProfile(profile, toSkillId("skill-1"), updatedSkill);

    expect(findSkillInProfile(updated, toSkillId("skill-1")).proficiency).toBe("expert");
  });

  it("throws SkillNotFoundError when updating unknown skill", () => {
    expect(() =>
      updateSkillInProfile(makeProfile(), toSkillId("nope"), makeSkill()),
    ).toThrow(SkillNotFoundError);
  });

  it("removes a skill", () => {
    const profile = addSkillToProfile(makeProfile(), makeSkill());
    const updated = removeSkillFromProfile(profile, toSkillId("skill-1"));
    expect(updated.skills).toHaveLength(0);
  });

  it("throws SkillNotFoundError when removing unknown skill", () => {
    expect(() => removeSkillFromProfile(makeProfile(), toSkillId("nope"))).toThrow(
      SkillNotFoundError,
    );
  });
});

describe("goal operations", () => {
  it("adds a goal", () => {
    const profile = addGoalToProfile(makeProfile(), makeGoal());
    expect(profile.goals).toHaveLength(1);
  });

  it("finds a goal by ID", () => {
    const profile = addGoalToProfile(makeProfile(), makeGoal());
    const found = findGoalInProfile(profile, toGoalId("goal-1"));
    expect(found.name).toBe("Learn Rust");
  });

  it("throws GoalNotFoundError for unknown goal", () => {
    expect(() => findGoalInProfile(makeProfile(), toGoalId("nope"))).toThrow(
      GoalNotFoundError,
    );
  });

  it("updates a goal in the profile", () => {
    const goal = makeGoal();
    const profile = addGoalToProfile(makeProfile(), goal);
    const updatedGoal = { ...goal, priority: "high" as const };
    const updated = updateGoalInProfile(profile, toGoalId("goal-1"), updatedGoal);

    expect(findGoalInProfile(updated, toGoalId("goal-1")).priority).toBe("high");
  });

  it("throws GoalNotFoundError when updating unknown goal", () => {
    expect(() =>
      updateGoalInProfile(makeProfile(), toGoalId("nope"), makeGoal()),
    ).toThrow(GoalNotFoundError);
  });

  it("removes a goal", () => {
    const profile = addGoalToProfile(makeProfile(), makeGoal());
    const updated = removeGoalFromProfile(profile, toGoalId("goal-1"));
    expect(updated.goals).toHaveLength(0);
  });

  it("throws GoalNotFoundError when removing unknown goal", () => {
    expect(() => removeGoalFromProfile(makeProfile(), toGoalId("nope"))).toThrow(
      GoalNotFoundError,
    );
  });
});

describe("interest operations", () => {
  it("adds an interest", () => {
    const profile = addInterestToProfile(makeProfile(), makeInterest());
    expect(profile.interests).toHaveLength(1);
  });

  it("finds an interest by ID", () => {
    const profile = addInterestToProfile(makeProfile(), makeInterest());
    const found = findInterestInProfile(profile, toInterestId("interest-1"));
    expect(found.name).toBe("Distributed Systems");
  });

  it("throws InterestNotFoundError for unknown interest", () => {
    expect(() => findInterestInProfile(makeProfile(), toInterestId("nope"))).toThrow(
      InterestNotFoundError,
    );
  });

  it("removes an interest", () => {
    const profile = addInterestToProfile(makeProfile(), makeInterest());
    const updated = removeInterestFromProfile(profile, toInterestId("interest-1"));
    expect(updated.interests).toHaveLength(0);
  });

  it("throws InterestNotFoundError when removing unknown interest", () => {
    expect(() => removeInterestFromProfile(makeProfile(), toInterestId("nope"))).toThrow(
      InterestNotFoundError,
    );
  });
});

describe("project operations", () => {
  it("adds a project", () => {
    const profile = addProjectToProfile(makeProfile(), makeProject());
    expect(profile.projects).toHaveLength(1);
  });

  it("finds a project by ID", () => {
    const profile = addProjectToProfile(makeProfile(), makeProject());
    const found = findProjectInProfile(profile, toProjectId("project-1"));
    expect(found.name).toBe("My Project");
  });

  it("throws ProjectNotFoundError for unknown project", () => {
    expect(() => findProjectInProfile(makeProfile(), toProjectId("nope"))).toThrow(
      ProjectNotFoundError,
    );
  });

  it("updates a project in the profile", () => {
    const project = makeProject();
    const profile = addProjectToProfile(makeProfile(), project);
    const updatedProject = { ...project, name: "Updated Project" };
    const updated = updateProjectInProfile(profile, toProjectId("project-1"), updatedProject);

    expect(findProjectInProfile(updated, toProjectId("project-1")).name).toBe("Updated Project");
  });

  it("throws ProjectNotFoundError when updating unknown project", () => {
    expect(() =>
      updateProjectInProfile(makeProfile(), toProjectId("nope"), makeProject()),
    ).toThrow(ProjectNotFoundError);
  });

  it("removes a project", () => {
    const profile = addProjectToProfile(makeProfile(), makeProject());
    const updated = removeProjectFromProfile(profile, toProjectId("project-1"));
    expect(updated.projects).toHaveLength(0);
  });

  it("throws ProjectNotFoundError when removing unknown project", () => {
    expect(() => removeProjectFromProfile(makeProfile(), toProjectId("nope"))).toThrow(
      ProjectNotFoundError,
    );
  });
});

// Domain extensibility: full workflow with non-dev domain
describe("non-dev domain workflow", () => {
  it("supports a music domain profile", () => {
    const musicDomain = createDomain({
      id: toDomainId("domain-music"),
      slug: createSlug("music"),
      name: "Music",
      categories: [
        createCategory({
          id: toCategoryId("cat-instruments"),
          slug: createSlug("instruments"),
          name: "Instruments",
        }),
      ],
    });

    const guitarSkill = createSkill({
      id: toSkillId("skill-guitar"),
      slug: createSlug("acoustic-guitar"),
      name: "Acoustic Guitar",
      domainId: toDomainId("domain-music"),
      categoryId: toCategoryId("cat-instruments"),
      proficiency: "familiar",
    });

    const jazzGoal = createLearningGoal({
      id: toGoalId("goal-jazz"),
      name: "Learn Jazz Chords",
      domainId: toDomainId("domain-music"),
    });

    let profile = createProfile({
      id: toProfileId("musician-1"),
      name: "Jazz Enthusiast",
    });

    profile = addDomainToProfile(profile, musicDomain);
    profile = addSkillToProfile(profile, guitarSkill);
    profile = addGoalToProfile(profile, jazzGoal);

    expect(profile.domains).toHaveLength(1);
    expect(profile.skills).toHaveLength(1);
    expect(profile.goals).toHaveLength(1);
    expect(findSkillInProfile(profile, toSkillId("skill-guitar")).name).toBe(
      "Acoustic Guitar",
    );
  });
});

// ---- Duplicate-name guards ----

describe("duplicate-name guards", () => {
  describe("addSkillToProfile", () => {
    it("rejects a second skill with the same name in a different domain", () => {
      const domainA = makeDomain("domain-a", "practices", "Practices");
      const domainB = makeDomain("domain-b", "architecture", "Architecture");
      let profile = addDomainToProfile(makeProfile(), domainA);
      profile = addDomainToProfile(profile, domainB);

      const skillA = createSkill({
        id: toSkillId("skill-a"),
        slug: createSlug("clean-code"),
        name: "Clean Code",
        domainId: toDomainId("domain-a"),
        categoryId: toCategoryId("cat-a"),
        proficiency: "advanced",
      });
      const skillB = createSkill({
        id: toSkillId("skill-b"),
        slug: createSlug("clean-code"),
        name: "Clean Code",
        domainId: toDomainId("domain-b"),
        categoryId: toCategoryId("cat-b"),
        proficiency: "advanced",
      });

      profile = addSkillToProfile(profile, skillA);
      expect(() => addSkillToProfile(profile, skillB)).toThrow(/already exists/);
    });

    it("is case-insensitive", () => {
      const skillA = makeSkill("skill-a", "TypeScript");
      const skillB = makeSkill("skill-b", "typescript");
      let profile = addSkillToProfile(makeProfile(), skillA);
      expect(() => addSkillToProfile(profile, skillB)).toThrow(/already exists/);
    });
  });

  describe("addGoalToProfile", () => {
    it("rejects duplicate goal names", () => {
      const goalA = makeGoal("goal-a", "Learn Rust");
      const goalB = makeGoal("goal-b", "Learn Rust");
      let profile = addGoalToProfile(makeProfile(), goalA);
      expect(() => addGoalToProfile(profile, goalB)).toThrow(/already exists/);
    });
  });

  describe("addInterestToProfile", () => {
    it("rejects duplicate interest names", () => {
      const intA = makeInterest("int-a", "Distributed Systems");
      const intB = makeInterest("int-b", "distributed systems");
      let profile = addInterestToProfile(makeProfile(), intA);
      expect(() => addInterestToProfile(profile, intB)).toThrow(/already exists/);
    });
  });

  describe("addProjectToProfile", () => {
    it("rejects duplicate project names", () => {
      const projA = makeProject("proj-a", "My Thing");
      const projB = makeProject("proj-b", "My Thing");
      let profile = addProjectToProfile(makeProfile(), projA);
      expect(() => addProjectToProfile(profile, projB)).toThrow(/already exists/);
    });
  });

  describe("update paths", () => {
    it("updateSkillInProfile rejects rename that collides with another skill", () => {
      const skillA = makeSkill("skill-a", "Rust");
      const skillB = makeSkill("skill-b", "Go");
      let profile = addSkillToProfile(makeProfile(), skillA);
      profile = addSkillToProfile(profile, skillB);
      const renamed = { ...skillB, name: "Rust" };
      expect(() => updateSkillInProfile(profile, toSkillId("skill-b"), renamed)).toThrow(/already exists/);
    });

    it("updateSkillInProfile allows a same-name update on the same entity (no-op rename)", () => {
      const skill = makeSkill("skill-a", "Rust");
      const profile = addSkillToProfile(makeProfile(), skill);
      const sameName = { ...skill, description: "new description" };
      expect(() => updateSkillInProfile(profile, toSkillId("skill-a"), sameName)).not.toThrow();
    });
  });
});
