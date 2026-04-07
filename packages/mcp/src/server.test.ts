import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  addDomainToProfile,
  BUILT_IN_DOMAINS,
  createProfile,
  toProfileId,
} from "@dossier/core";
import type { Profile } from "@dossier/core";
import { application } from "@dossier/core";

import { createDossierMcpServer } from "./server.js";
import type { DossierMcpDeps } from "./server.js";

// --- Test infrastructure ---

class InMemoryProfileRepository implements application.IProfileRepository {
  private profile: Profile | null = null;

  async load(): Promise<Profile | null> {
    return this.profile ? structuredClone(this.profile) : null;
  }

  async save(profile: Profile): Promise<void> {
    this.profile = structuredClone(profile);
  }

  async exists(): Promise<boolean> {
    return this.profile !== null;
  }

  getStoredProfile(): Profile | null {
    return this.profile;
  }
}

class StubIdGenerator implements application.IIdGenerator {
  private counter = 0;

  generate(prefix?: string): string {
    this.counter++;
    return `${prefix ?? "id"}-${this.counter}`;
  }
}

function createTestProfile(): Profile {
  let profile = createProfile({
    id: toProfileId("test-profile"),
    name: "Test User",
  });
  for (const domain of BUILT_IN_DOMAINS) {
    profile = addDomainToProfile(profile, domain);
  }
  return profile;
}

// --- Test setup ---

let client: Client;
let repo: InMemoryProfileRepository;
let deps: DossierMcpDeps;

beforeEach(async () => {
  repo = new InMemoryProfileRepository();
  deps = { profileRepository: repo, idGenerator: new StubIdGenerator() };
  await repo.save(createTestProfile());

  const server = createDossierMcpServer(deps);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  client = new Client({ name: "test-client", version: "1.0" });
  await client.connect(clientTransport);
});

afterEach(async () => {
  await client.close();
});

// --- Resources ---

describe("resources", () => {
  it("lists all registered resources", async () => {
    const { resources } = await client.listResources();
    const names = resources.map((r) => r.name);
    expect(names).toContain("profile");
    expect(names).toContain("profile-summary");
    expect(names).toContain("skills");
    expect(names).toContain("goals");
    expect(names).toContain("goals-active");
    expect(names).toContain("interests");
    expect(names).toContain("domains");
  });

  it("reads full profile as JSON", async () => {
    const result = await client.readResource({ uri: "dossier://profile" });
    const json = JSON.parse(result.contents[0].text as string);
    expect(json.name).toBe("Test User");
    expect(json.domains).toHaveLength(3);
  });

  it("reads profile summary in claude-md format", async () => {
    const result = await client.readResource({ uri: "dossier://profile/summary" });
    const text = result.contents[0].text as string;
    expect(text).toContain("# Dossier Profile: Test User");
  });

  it("reads domains with categories", async () => {
    const result = await client.readResource({ uri: "dossier://domains" });
    const domains = JSON.parse(result.contents[0].text as string);
    expect(domains).toHaveLength(3);
    const swDomain = domains.find((d: { slug: string }) => d.slug === "software-development");
    expect(swDomain).toBeDefined();
    expect(swDomain.categories.length).toBeGreaterThan(0);
    expect(swDomain.categories[0].name).toBeDefined();
  });

  it("reads empty skills list", async () => {
    const result = await client.readResource({ uri: "dossier://skills" });
    const skills = JSON.parse(result.contents[0].text as string);
    expect(skills).toEqual([]);
  });

  it("reads skills filtered by domain slug", async () => {
    // Add a skill first
    await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "TypeScript",
        domainId: "software-development",
        categoryId: "languages",
        proficiency: "advanced",
      },
    });

    const result = await client.readResource({ uri: "dossier://skills/software-development" });
    const skills = JSON.parse(result.contents[0].text as string);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe("TypeScript");
  });

  it("reads empty goals and interests", async () => {
    const goals = await client.readResource({ uri: "dossier://goals" });
    expect(JSON.parse(goals.contents[0].text as string)).toEqual([]);

    const interests = await client.readResource({ uri: "dossier://interests" });
    expect(JSON.parse(interests.contents[0].text as string)).toEqual([]);
  });

  it("reads only active goals", async () => {
    await client.callTool({
      name: "dossier_add_goal",
      arguments: { name: "Learn Rust", domainId: "software-development", priority: "high" },
    });

    const result = await client.readResource({ uri: "dossier://goals/active" });
    const goals = JSON.parse(result.contents[0].text as string);
    expect(goals).toHaveLength(1);
    expect(goals[0].name).toBe("Learn Rust");
  });
});

// --- Tools: Skills ---

describe("tools - skills", () => {
  it("adds a skill", async () => {
    const result = await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "TypeScript",
        domainId: "software-development",
        categoryId: "languages",
        proficiency: "proficient",
      },
    });

    expect(result.content[0].text).toContain("Added skill: TypeScript (proficient)");

    const profile = repo.getStoredProfile()!;
    expect(profile.skills).toHaveLength(1);
    expect(profile.skills[0].name).toBe("TypeScript");
  });

  it("accepts domain name instead of slug", async () => {
    const result = await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "Python",
        domainId: "Software Development",
        categoryId: "Programming Languages",
        proficiency: "familiar",
      },
    });

    expect(result.content[0].text).toContain("Added skill: Python");
  });

  it("lists skills with human-readable names", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "TypeScript",
        domainId: "software-development",
        categoryId: "languages",
        proficiency: "advanced",
      },
    });

    const result = await client.callTool({
      name: "dossier_list_skills",
      arguments: {},
    });

    const text = result.content[0].text as string;
    expect(text).toContain("TypeScript (advanced)");
    expect(text).toContain("Software Development > Programming Languages");
  });

  it("lists skills filtered by domain slug", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "TS", domainId: "software-development", categoryId: "languages", proficiency: "familiar" },
    });
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "Swedish", domainId: "languages", categoryId: "spoken", proficiency: "expert" },
    });

    const result = await client.callTool({
      name: "dossier_list_skills",
      arguments: { domainId: "languages" },
    });

    const text = result.content[0].text as string;
    expect(text).toContain("Swedish");
    expect(text).not.toContain("TS");
  });

  it("updates a skill", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "Rust", domainId: "software-development", categoryId: "languages", proficiency: "novice" },
    });

    const result = await client.callTool({
      name: "dossier_update_skill",
      arguments: { skillId: "skill-1", proficiency: "familiar" },
    });

    expect(result.content[0].text).toContain("Updated skill: Rust (familiar)");
  });

  it("removes a skill", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "Rust", domainId: "software-development", categoryId: "languages", proficiency: "novice" },
    });

    await client.callTool({
      name: "dossier_remove_skill",
      arguments: { skillId: "skill-1" },
    });

    const profile = repo.getStoredProfile()!;
    expect(profile.skills).toHaveLength(0);
  });

  it("marks a skill as used", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "Go", domainId: "software-development", categoryId: "languages", proficiency: "familiar" },
    });

    const result = await client.callTool({
      name: "dossier_mark_used",
      arguments: { skillId: "skill-1", context: "side project" },
    });

    expect(result.content[0].text).toContain("Marked as used: Go");
    const profile = repo.getStoredProfile()!;
    expect(profile.skills[0].usage).toHaveLength(1);
    expect(profile.skills[0].usage[0].context).toBe("side project");
  });
});

// --- Tools: Goals ---

describe("tools - goals", () => {
  it("adds a learning goal", async () => {
    const result = await client.callTool({
      name: "dossier_add_goal",
      arguments: { name: "Learn Rust", domainId: "software-development", priority: "high" },
    });

    expect(result.content[0].text).toContain("Added goal: Learn Rust (high priority)");
  });

  it("lists goals", async () => {
    await client.callTool({
      name: "dossier_add_goal",
      arguments: { name: "Learn Rust", domainId: "software-development" },
    });

    const result = await client.callTool({
      name: "dossier_list_goals",
      arguments: {},
    });

    expect(result.content[0].text).toContain("Learn Rust (active, medium priority)");
  });

  it("updates goal progress", async () => {
    await client.callTool({
      name: "dossier_add_goal",
      arguments: { name: "Learn Rust", domainId: "software-development" },
    });

    const result = await client.callTool({
      name: "dossier_update_goal",
      arguments: { goalId: "goal-1", percentage: 50, note: "Halfway there" },
    });

    expect(result.content[0].text).toContain("50%");
  });

  it("completes a goal and creates a skill", async () => {
    await client.callTool({
      name: "dossier_add_goal",
      arguments: { name: "Learn Rust", domainId: "software-development" },
    });

    const result = await client.callTool({
      name: "dossier_complete_goal",
      arguments: { goalId: "goal-1", categoryId: "languages" },
    });

    const text = result.content[0].text as string;
    expect(text).toContain("Completed goal: Learn Rust");
    expect(text).toContain("Created skill");

    const profile = repo.getStoredProfile()!;
    expect(profile.goals[0].status).toBe("completed");
    expect(profile.skills).toHaveLength(1);
  });
});

// --- Tools: Interests ---

describe("tools - interests", () => {
  it("adds an interest", async () => {
    const result = await client.callTool({
      name: "dossier_add_interest",
      arguments: { name: "Kubernetes", domainId: "software-development" },
    });

    expect(result.content[0].text).toContain("Added interest: Kubernetes");
  });
});

// --- Tools: Domains & Categories ---

describe("tools - domains and categories", () => {
  it("adds a custom domain and returns its ID", async () => {
    const result = await client.callTool({
      name: "dossier_add_domain",
      arguments: { name: "Music" },
    });

    const text = result.content[0].text as string;
    expect(text).toContain("Added domain: Music");
    expect(text).toContain("id:");
    expect(text).toContain("slug: music");

    const profile = repo.getStoredProfile()!;
    const music = profile.domains.find((d) => d.slug === "music");
    expect(music).toBeDefined();
    expect(music!.isBuiltIn).toBe(false);
  });

  it("adds a category to a domain using slug", async () => {
    await client.callTool({
      name: "dossier_add_domain",
      arguments: { name: "Music" },
    });

    const result = await client.callTool({
      name: "dossier_add_category",
      arguments: { domainId: "music", name: "Instrument" },
    });

    const text = result.content[0].text as string;
    expect(text).toContain("Added category: Instrument");
    expect(text).toContain("id:");
    expect(text).toContain("to domain Music");

    const profile = repo.getStoredProfile()!;
    const music = profile.domains.find((d) => d.slug === "music")!;
    expect(music.categories).toHaveLength(1);
    expect(music.categories[0].name).toBe("Instrument");
  });

  it("can add a skill to a custom domain using slugs", async () => {
    await client.callTool({
      name: "dossier_add_domain",
      arguments: { name: "Music" },
    });
    await client.callTool({
      name: "dossier_add_category",
      arguments: { domainId: "music", name: "Instrument" },
    });

    const result = await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "Guitar",
        domainId: "music",
        categoryId: "instrument",
        proficiency: "familiar",
      },
    });

    expect(result.content[0].text).toContain("Added skill: Guitar (familiar)");

    const profile = repo.getStoredProfile()!;
    expect(profile.skills).toHaveLength(1);
    expect(profile.skills[0].name).toBe("Guitar");
  });

  it("rejects unknown domain slug", async () => {
    const result = await client.callTool({
      name: "dossier_add_skill",
      arguments: {
        name: "Test",
        domainId: "nonexistent",
        categoryId: "whatever",
        proficiency: "novice",
      },
    });

    expect(result.isError).toBe(true);
  });
});

// --- Tools: Export ---

describe("tools - export", () => {
  it("exports in claude format with domain/category grouping", async () => {
    await client.callTool({
      name: "dossier_add_skill",
      arguments: { name: "TypeScript", domainId: "software-development", categoryId: "languages", proficiency: "advanced" },
    });

    const result = await client.callTool({
      name: "dossier_export",
      arguments: { format: "claude" },
    });

    const text = result.content[0].text as string;
    expect(text).toContain("# Dossier Profile:");
    expect(text).toContain("### Software Development");
    expect(text).toContain("**Programming Languages:**");
    expect(text).toContain("TypeScript (advanced)");
  });

  it("exports in json format", async () => {
    const result = await client.callTool({
      name: "dossier_export",
      arguments: { format: "json" },
    });

    const text = result.content[0].text as string;
    const json = JSON.parse(text);
    expect(json.generator).toBe("dossier");
  });
});

// --- Prompts ---

describe("prompts", () => {
  it("lists all registered prompts", async () => {
    const { prompts } = await client.listPrompts();
    const names = prompts.map((p) => p.name);
    expect(names).toContain("suggest-learning");
    expect(names).toContain("recommend-stack");
    expect(names).toContain("explain-for-level");
    expect(names).toContain("review-stale-skills");
    expect(names).toContain("plan-learning-path");
  });

  it("returns suggest-learning prompt with profile context", async () => {
    const result = await client.getPrompt({ name: "suggest-learning" });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe("user");
    const text = (result.messages[0].content as { text: string }).text;
    expect(text).toContain("suggest what I should learn next");
    expect(text).toContain("Dossier Profile: Test User");
  });

  // Note: prompts with argsSchema and zod v4 trigger a client-side validation
  // bug in SDK v1.29.0 (keyValidator._parse). The prompts work correctly with
  // Claude Code's client. Testing the no-args prompt covers the handler logic.
  it("lists prompts with arguments", async () => {
    const { prompts } = await client.listPrompts();
    const recommendStack = prompts.find((p) => p.name === "recommend-stack");
    expect(recommendStack).toBeDefined();
    expect(recommendStack!.arguments).toBeDefined();
  });
});
