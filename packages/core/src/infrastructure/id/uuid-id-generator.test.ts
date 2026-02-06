import { describe, expect, it } from "vitest";

import { UuidIdGenerator } from "./uuid-id-generator.js";

describe("UuidIdGenerator", () => {
  const generator = new UuidIdGenerator();

  it("generates a valid UUID without prefix", () => {
    const id = generator.generate();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates a prefixed UUID", () => {
    const id = generator.generate("skill");
    expect(id).toMatch(
      /^skill-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generator.generate()));
    expect(ids.size).toBe(100);
  });
});
