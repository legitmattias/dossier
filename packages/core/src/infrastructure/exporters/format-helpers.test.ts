import { describe, expect, it } from "vitest";

import {
  addDomainToProfile,
  addSkillToProfile,
  BUILT_IN_DOMAINS,
  createDomain,
  createInterest,
  createProfile,
  createSkill,
  LANGUAGES,
  SOFTWARE_DEVELOPMENT,
  toDomainId,
  toInterestId,
  toProfileId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "../../application/helpers/slugify.js";
import { getDisplayProficiency, isExportVisible } from "./format-helpers.js";

describe("isExportVisible", () => {
  const domain = SOFTWARE_DEVELOPMENT;

  function baseProfile() {
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, domain);
    return profile;
  }

  it("returns true for public entity in public domain", () => {
    const profile = baseProfile();
    const entity = { visibility: "public" as const, domainId: domain.id };
    expect(isExportVisible(profile, entity)).toBe(true);
  });

  it("returns false for private entity in public domain", () => {
    const profile = baseProfile();
    const entity = { visibility: "private" as const, domainId: domain.id };
    expect(isExportVisible(profile, entity)).toBe(false);
  });

  it("returns false for public entity in private domain (domain wins)", () => {
    const privateDomain = createDomain({
      id: toDomainId("private-domain"),
      slug: slugify("Private Domain"),
      name: "Private Domain",
      visibility: "private",
    });
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, privateDomain);

    const entity = { visibility: "public" as const, domainId: privateDomain.id };
    expect(isExportVisible(profile, entity)).toBe(false);
  });

  it("returns false for private entity in private domain", () => {
    const privateDomain = createDomain({
      id: toDomainId("private-domain"),
      slug: slugify("Private Domain"),
      name: "Private Domain",
      visibility: "private",
    });
    let profile = createProfile({ id: toProfileId("p"), name: "P" });
    profile = addDomainToProfile(profile, privateDomain);

    const entity = { visibility: "private" as const, domainId: privateDomain.id };
    expect(isExportVisible(profile, entity)).toBe(false);
  });

  it("returns true for entity with no domainId (interests can be domain-less)", () => {
    const profile = baseProfile();
    const entity = { visibility: "public" as const };
    expect(isExportVisible(profile, entity)).toBe(true);
  });

  it("returns true when domain doesn't exist in profile (graceful handling)", () => {
    const profile = baseProfile();
    const entity = { visibility: "public" as const, domainId: toDomainId("nonexistent-domain") };
    expect(isExportVisible(profile, entity)).toBe(true);
  });
});

describe("getDisplayProficiency", () => {
  const languagesDomain = LANGUAGES;
  const softwareDomain = SOFTWARE_DEVELOPMENT;

  function makeSkill(overrides: {
    proficiency?: "novice" | "familiar" | "proficient" | "advanced" | "expert";
    proficiencyLabel?: string;
  } = {}) {
    return createSkill({
      id: toSkillId("s1"),
      slug: slugify("Test Skill"),
      name: "Test Skill",
      domainId: languagesDomain.id,
      categoryId: languagesDomain.categories[0]!.id,
      proficiency: overrides.proficiency ?? "expert",
      ...(overrides.proficiencyLabel !== undefined && { proficiencyLabel: overrides.proficiencyLabel }),
    });
  }

  it("returns skill.proficiencyLabel when set (highest priority)", () => {
    const skill = makeSkill({ proficiency: "expert", proficiencyLabel: "mother tongue" });
    const result = getDisplayProficiency(skill, languagesDomain);
    expect(result).toBe("mother tongue");
  });

  it("returns domain label when skill has no override but domain has labels", () => {
    const skill = makeSkill({ proficiency: "expert" });
    const result = getDisplayProficiency(skill, languagesDomain);
    expect(result).toBe("native");
  });

  it("returns raw proficiency when neither skill nor domain has labels", () => {
    const skill = makeSkill({ proficiency: "advanced" });
    // Software Development domain has no proficiencyLabels
    const result = getDisplayProficiency(skill, softwareDomain);
    expect(result).toBe("advanced");
  });

  it("skill override takes precedence over domain label", () => {
    const skill = makeSkill({ proficiency: "novice", proficiencyLabel: "just started" });
    // Languages domain maps novice -> "beginner", but the skill override should win
    const result = getDisplayProficiency(skill, languagesDomain);
    expect(result).toBe("just started");
  });

  it("handles undefined domain gracefully", () => {
    const skill = makeSkill({ proficiency: "proficient" });
    const result = getDisplayProficiency(skill, undefined);
    expect(result).toBe("proficient");
  });
});
