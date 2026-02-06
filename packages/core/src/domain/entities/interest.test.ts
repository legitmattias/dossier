import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toDomainId, toInterestId } from "../value-objects/identifiers.js";
import { createInterest } from "./interest.js";

describe("createInterest", () => {
  const baseInput = {
    id: toInterestId("interest-1"),
    name: "Distributed Systems",
    domainId: toDomainId("domain-1"),
  } as const;

  it("creates an interest with required fields", () => {
    const interest = createInterest(baseInput);

    expect(interest.id).toBe("interest-1");
    expect(interest.name).toBe("Distributed Systems");
    expect(interest.domainId).toBe("domain-1");
    expect(interest.description).toBeUndefined();
    expect(interest.createdAt).toBeInstanceOf(Date);
  });

  it("creates an interest with description", () => {
    const interest = createInterest({
      ...baseInput,
      description: "Interest in learning about distributed architectures",
    });

    expect(interest.description).toBe("Interest in learning about distributed architectures");
  });

  it("accepts a custom createdAt date", () => {
    const date = new Date("2025-01-15");
    const interest = createInterest({ ...baseInput, createdAt: date });

    expect(interest.createdAt).toBe(date);
  });

  it("trims the name", () => {
    const interest = createInterest({
      ...baseInput,
      name: "  Jazz Theory  ",
    });

    expect(interest.name).toBe("Jazz Theory");
  });

  // Domain extensibility: non-dev example
  it("works for music domain interests", () => {
    const interest = createInterest({
      id: toInterestId("interest-music-1"),
      name: "Modal Jazz",
      domainId: toDomainId("domain-music"),
      description: "Exploring modal approaches to jazz improvisation",
    });

    expect(interest.name).toBe("Modal Jazz");
    expect(interest.domainId).toBe("domain-music");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() => createInterest({ ...baseInput, name: "" })).toThrow(InvalidNameError);
  });

  it("throws InvalidNameError for whitespace-only name", () => {
    expect(() => createInterest({ ...baseInput, name: "   " })).toThrow(InvalidNameError);
  });
});
