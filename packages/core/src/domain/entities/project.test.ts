import { describe, expect, it } from "vitest";
import { InvalidNameError } from "../errors/domain-errors.js";
import { toProjectId } from "../value-objects/identifiers.js";
import { createSlug } from "../value-objects/slug.js";
import { createProject } from "./project.js";

describe("createProject", () => {
  const baseInput = {
    id: toProjectId("project-1"),
    slug: createSlug("my-project"),
    name: "My Project",
  } as const;

  it("creates a project with required fields and correct defaults", () => {
    const project = createProject(baseInput);

    expect(project.id).toBe("project-1");
    expect(project.slug).toBe("my-project");
    expect(project.name).toBe("My Project");
    expect(project.description).toBeUndefined();
    expect(project.url).toBeUndefined();
    expect(project.role).toBeUndefined();
    expect(project.status).toBe("active");
    expect(project.priority).toBeUndefined();
    expect(project.featured).toBe(false);
    expect(project.skillIds).toEqual([]);
    expect(project.highlights).toEqual([]);
    expect(project.startDate).toBeUndefined();
    expect(project.endDate).toBeUndefined();
    expect(project.createdAt).toBeInstanceOf(Date);
    expect(project.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a project with all optional fields", () => {
    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-06-30");
    const createdAt = new Date("2025-01-15");
    const updatedAt = new Date("2025-02-01");

    const project = createProject({
      ...baseInput,
      description: "A full-stack web application",
      url: "https://example.com/project",
      role: "Lead Developer",
      status: "completed",
      priority: "high",
      featured: true,
      skillIds: ["skill-1", "skill-2"],
      highlights: ["Shipped MVP in 2 weeks", "10k users"],
      startDate,
      endDate,
      createdAt,
      updatedAt,
    });

    expect(project.description).toBe("A full-stack web application");
    expect(project.url).toBe("https://example.com/project");
    expect(project.role).toBe("Lead Developer");
    expect(project.status).toBe("completed");
    expect(project.priority).toBe("high");
    expect(project.featured).toBe(true);
    expect(project.skillIds).toEqual(["skill-1", "skill-2"]);
    expect(project.highlights).toEqual(["Shipped MVP in 2 weeks", "10k users"]);
    expect(project.startDate).toBe(startDate);
    expect(project.endDate).toBe(endDate);
    expect(project.createdAt).toBe(createdAt);
    expect(project.updatedAt).toBe(updatedAt);
  });

  it("trims the name", () => {
    const project = createProject({
      ...baseInput,
      name: "  Debut Album  ",
    });

    expect(project.name).toBe("Debut Album");
  });

  it("throws InvalidNameError for empty name", () => {
    expect(() => createProject({ ...baseInput, name: "" })).toThrow(InvalidNameError);
  });

  it("throws InvalidNameError for whitespace-only name", () => {
    expect(() => createProject({ ...baseInput, name: "   " })).toThrow(InvalidNameError);
  });

  // Domain extensibility: non-dev example
  it("works for a music album project", () => {
    const project = createProject({
      id: toProjectId("project-album-1"),
      slug: createSlug("debut-album"),
      name: "Debut Album",
      description: "Recording and producing a 12-track jazz album",
      role: "Composer & Pianist",
      status: "active",
      priority: "high",
      featured: true,
      highlights: ["Recorded 4 tracks at Blue Note Studio"],
      startDate: new Date("2025-03-01"),
    });

    expect(project.name).toBe("Debut Album");
    expect(project.role).toBe("Composer & Pianist");
    expect(project.highlights).toEqual(["Recorded 4 tracks at Blue Note Studio"]);
  });
});
