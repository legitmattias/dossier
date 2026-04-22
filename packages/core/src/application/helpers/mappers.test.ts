import { describe, expect, it } from "vitest";

import {
  createSkill,
  toCategoryId,
  toDomainId,
  toSkillId,
} from "../../domain/index.js";
import { slugify } from "./slugify.js";
import { toSkillOutput } from "./mappers.js";

function makeSkill(overrides: { proficiencyLabel?: string } = {}) {
  return createSkill({
    id: toSkillId("skill-1"),
    slug: slugify("Swedish"),
    name: "Swedish",
    domainId: toDomainId("domain-languages"),
    categoryId: toCategoryId("category-modern"),
    proficiency: "expert",
    ...(overrides.proficiencyLabel !== undefined && { proficiencyLabel: overrides.proficiencyLabel }),
  });
}

describe("toSkillOutput", () => {
  it("emits proficiencyLabel: null when skill has no custom label", () => {
    const skill = makeSkill();
    const output = toSkillOutput(skill);
    expect(output.proficiencyLabel).toBeNull();
  });

  it("emits the string value when proficiencyLabel is set", () => {
    const skill = makeSkill({ proficiencyLabel: "native" });
    const output = toSkillOutput(skill);
    expect(output.proficiencyLabel).toBe("native");
  });

  it("always includes proficiency with the raw enum value", () => {
    const labelled = toSkillOutput(makeSkill({ proficiencyLabel: "native" }));
    const unlabelled = toSkillOutput(makeSkill());
    expect(labelled.proficiency).toBe("expert");
    expect(unlabelled.proficiency).toBe("expert");
  });
});
