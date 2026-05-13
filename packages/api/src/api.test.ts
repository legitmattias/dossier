import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { sql } from "drizzle-orm";
import { createApp } from "./app.js";
import { createConnection } from "./db/connection.js";
import { ensureTables } from "./db/migrate.js";
import type { DbConnection } from "./db/connection.js";

// Uses Postgres — set DATABASE_URL or defaults to local dev database (port 5433 matches docker-compose.dev.yml)
const TEST_DATABASE_URL = process.env["DATABASE_URL"] ?? "postgres://dossier:dossier@localhost:5433/dossier_test";

let dbConn: DbConnection;
let app: ReturnType<typeof createApp>;

// Helper: make a request to the app
async function req(path: string, init?: RequestInit) {
  return app.request(path, init);
}

// Helper: make an authenticated request
async function authReq(path: string, token: string, init?: RequestInit) {
  return app.request(path, {
    ...init,
    headers: { ...init?.headers as Record<string, string>, Authorization: `Bearer ${token}` },
  });
}

// Helper: register a user and return the JWT token
async function registerAndGetToken(username = "testuser", email = "test@test.com") {
  const res = await req("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password: "testpass123" }),
  });
  const data = await res.json() as { token: string; user: { id: string } };
  return data;
}

beforeEach(async () => {
  dbConn = createConnection(TEST_DATABASE_URL);
  await ensureTables(dbConn.db);

  // Truncate all tables between tests (reverse FK order)
  await dbConn.db.execute(sql`TRUNCATE interests, goals, skills, categories, domains, profiles, api_keys, users CASCADE`);

  app = createApp(dbConn);
  process.env["JWT_SECRET"] = "test-secret-for-tests";
  process.env["NODE_ENV"] = "test";
});

afterEach(async () => {
  await dbConn.close();
  delete process.env["JWT_SECRET"];
});

// --- Health ---

describe("health", () => {
  it("returns ok with version info", async () => {
    const res = await req("/health");
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string; version: string; commitSha: string; builtAt: string };
    expect(body.status).toBe("ok");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(typeof body.commitSha).toBe("string");
    expect(typeof body.builtAt).toBe("string");
  });
});

describe("version", () => {
  it("returns version info with api contract", async () => {
    const res = await req("/version");
    expect(res.status).toBe(200);
    const body = await res.json() as { version: string; commitSha: string; builtAt: string; api: string };
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(body.api).toBe("v1");
  });
});

// --- Auth ---

describe("auth", () => {
  it("registers a new user", async () => {
    const res = await req("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", email: "m@test.com", password: "testpass123" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { token: string; user: { username: string } };
    expect(data.token).toBeDefined();
    expect(data.user.username).toBe("alice");
  });

  it("rejects duplicate username", async () => {
    await registerAndGetToken("alice", "a@test.com");
    const res = await req("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", email: "b@test.com", password: "testpass123" }),
    });
    expect(res.status).toBe(409);
  });

  it("rejects short password", async () => {
    const res = await req("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "x", email: "x@test.com", password: "short" }),
    });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    await registerAndGetToken();
    const res = await req("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "testpass123" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as { token: string };
    expect(data.token).toBeDefined();
  });

  it("rejects wrong password", async () => {
    await registerAndGetToken();
    const res = await req("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", password: "wrongpass" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns user info on /auth/me", async () => {
    const { token } = await registerAndGetToken();
    const res = await authReq("/auth/me", token);
    expect(res.status).toBe(200);
    const data = await res.json() as { user: { username: string } };
    expect(data.user.username).toBe("testuser");
  });

  it("rejects /auth/me without token", async () => {
    const res = await req("/auth/me");
    expect(res.status).toBe(401);
  });
});

// --- API Keys ---

describe("api keys", () => {
  it("generates an API key", async () => {
    const { token } = await registerAndGetToken();
    const res = await authReq("/auth/api-keys", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "test-key" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { key: string; prefix: string };
    expect(data.key).toMatch(/^dsk_/);
    expect(data.prefix).toBe(data.key.slice(0, 8));
  });

  it("authenticates with API key", async () => {
    const { token } = await registerAndGetToken();
    const keyRes = await authReq("/auth/api-keys", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "read-key" }),
    });
    const { key } = await keyRes.json() as { key: string };

    // Use API key to access profile
    const profileRes = await authReq("/profile", key);
    expect(profileRes.status).toBe(200);
    const profile = await profileRes.json() as { name: string };
    expect(profile.name).toBe("testuser");
  });
});

// --- Profile ---

describe("profile", () => {
  it("returns profile with built-in domains", async () => {
    const { token } = await registerAndGetToken();
    const res = await authReq("/profile", token);
    expect(res.status).toBe(200);
    const data = await res.json() as { name: string; domains: unknown[] };
    expect(data.name).toBe("testuser");
    expect(data.domains.length).toBe(3); // 3 built-in domains
  });

  it("exports in llm-md format", async () => {
    const { token } = await registerAndGetToken();
    const res = await authReq("/profile/export?format=llm-md", token);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("# Dossier Profile:");
  });
});

// --- Skills CRUD ---

describe("skills", () => {
  it("adds and lists skills", async () => {
    const { token } = await registerAndGetToken();

    // Add
    const addRes = await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "advanced",
      }),
    });
    expect(addRes.status).toBe(201);

    // List
    const listRes = await authReq("/profile/skills", token);
    const data = await listRes.json() as { skills: Array<{ name: string; proficiency: string }> };
    expect(data.skills).toHaveLength(1);
    expect(data.skills[0].name).toBe("TypeScript");
    expect(data.skills[0].proficiency).toBe("advanced");
  });

  it("updates a skill", async () => {
    const { token } = await registerAndGetToken();

    const addRes = await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rust",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "novice",
      }),
    });
    const { skill } = await addRes.json() as { skill: { id: string } };

    const updateRes = await authReq(`/profile/skills/${skill.id}`, token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proficiency: "familiar" }),
    });
    expect(updateRes.status).toBe(200);
    const updated = await updateRes.json() as { skill: { proficiency: string } };
    expect(updated.skill.proficiency).toBe("familiar");
  });

  it("deletes a skill", async () => {
    const { token } = await registerAndGetToken();

    const addRes = await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Go",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "novice",
      }),
    });
    const { skill } = await addRes.json() as { skill: { id: string } };

    const delRes = await authReq(`/profile/skills/${skill.id}`, token, { method: "DELETE" });
    expect(delRes.status).toBe(200);

    const listRes = await authReq("/profile/skills", token);
    const data = await listRes.json() as { skills: unknown[] };
    expect(data.skills).toHaveLength(0);
  });
});

// --- Goals ---

describe("goals", () => {
  it("adds and lists goals", async () => {
    const { token } = await registerAndGetToken();

    await authReq("/profile/goals", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Learn Rust",
        domainId: "builtin-domain-software-development",
        priority: "high",
      }),
    });

    const listRes = await authReq("/profile/goals", token);
    const data = await listRes.json() as { goals: Array<{ name: string; status: string }> };
    expect(data.goals).toHaveLength(1);
    expect(data.goals[0].name).toBe("Learn Rust");
    expect(data.goals[0].status).toBe("active");
  });

  it("filters goals by status", async () => {
    const { token } = await registerAndGetToken();

    await authReq("/profile/goals", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Active Goal", domainId: "builtin-domain-software-development" }),
    });

    const activeRes = await authReq("/profile/goals?status=active", token);
    const active = await activeRes.json() as { goals: unknown[] };
    expect(active.goals).toHaveLength(1);

    const completedRes = await authReq("/profile/goals?status=completed", token);
    const completed = await completedRes.json() as { goals: unknown[] };
    expect(completed.goals).toHaveLength(0);
  });
});

// --- Resources (on goals) ---

describe("resources", () => {
  it("adds, updates, and removes resources on a goal", async () => {
    const { token } = await registerAndGetToken();

    const addGoalRes = await authReq("/profile/goals", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Learn Rust", domainId: "builtin-domain-software-development" }),
    });
    const { goal } = await addGoalRes.json() as { goal: { id: string } };

    const addRes = await authReq(`/profile/goals/${goal.id}/resources`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rustlings", url: "https://github.com/rust-lang/rustlings", type: "course" }),
    });
    expect(addRes.status).toBe(201);
    const { resource } = await addRes.json() as { resource: { id: string; title: string; type: string; completed: boolean } };
    expect(resource.title).toBe("Rustlings");
    expect(resource.type).toBe("course");
    expect(resource.completed).toBe(false);
    expect(resource.id).toMatch(/^resource[_-]/);

    const toggleRes = await authReq(`/profile/goals/${goal.id}/resources/${resource.id}`, token, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(toggleRes.status).toBe(200);
    const { resource: toggled } = await toggleRes.json() as { resource: { completed: boolean } };
    expect(toggled.completed).toBe(true);

    const removeRes = await authReq(`/profile/goals/${goal.id}/resources/${resource.id}`, token, { method: "DELETE" });
    expect(removeRes.status).toBe(200);

    const goalsRes = await authReq("/profile/goals", token);
    const { goals: [g] } = await goalsRes.json() as { goals: Array<{ resources: unknown[] }> };
    expect(g.resources).toHaveLength(0);
  });

  it("strips resources from public profile when goal has privateFields=['resources']", async () => {
    const { token, user } = await registerAndGetToken("bob", "bob@test.com");

    const addGoalRes = await authReq("/profile/goals", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Learn Rust",
        domainId: "builtin-domain-software-development",
        privateFields: ["resources"],
      }),
    });
    const { goal } = await addGoalRes.json() as { goal: { id: string } };

    await authReq(`/profile/goals/${goal.id}/resources`, token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Rustlings", url: "https://github.com/rust-lang/rustlings", type: "course" }),
    });

    await dbConn.db.execute(sql`UPDATE profiles SET is_public = TRUE WHERE user_id = ${user.id}`);

    const publicRes = await req("/u/bob");
    expect(publicRes.status).toBe(200);
    const publicProfile = await publicRes.json() as { goals: Array<Record<string, unknown>> };
    expect(publicProfile.goals).toHaveLength(1);
    expect(publicProfile.goals[0]).not.toHaveProperty("resources");
    expect(JSON.stringify(publicProfile)).not.toContain("Rustlings");
  });
});

// --- Interests ---

describe("interests", () => {
  it("adds and lists interests", async () => {
    const { token } = await registerAndGetToken();

    await authReq("/profile/interests", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Kubernetes",
        domainId: "builtin-domain-software-development",
      }),
    });

    const listRes = await authReq("/profile/interests", token);
    const data = await listRes.json() as { interests: Array<{ name: string }> };
    expect(data.interests).toHaveLength(1);
    expect(data.interests[0].name).toBe("Kubernetes");
  });
});

// --- Domains ---

describe("domains", () => {
  it("lists built-in domains with categories", async () => {
    const { token } = await registerAndGetToken();

    const res = await authReq("/profile/domains", token);
    const data = await res.json() as { domains: Array<{ name: string; categories: unknown[] }> };
    expect(data.domains).toHaveLength(3);

    const sw = data.domains.find((d) => d.name === "Software Development");
    expect(sw).toBeDefined();
    expect(sw!.categories.length).toBeGreaterThan(0);
  });
});

// --- Public Profiles ---

describe("public profiles", () => {
  it("returns 404 for non-public profile", async () => {
    await registerAndGetToken("alice", "m@test.com");
    const res = await req("/u/alice");
    expect(res.status).toBe(404);
    const data = await res.json() as { error: string };
    expect(data.error).toContain("not public");
  });

  it("returns 404 for unknown user", async () => {
    const res = await req("/u/nobody");
    expect(res.status).toBe(404);
  });

  it("strips notes from entities on the public profile", async () => {
    const { token, user } = await registerAndGetToken("alice", "alice@test.com");

    const addRes = await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "advanced",
        notes: "should-not-leak",
      }),
    });
    expect(addRes.status).toBe(201);

    await dbConn.db.execute(
      sql`UPDATE profiles SET is_public = TRUE WHERE user_id = ${user.id}`,
    );

    const res = await req("/u/alice");
    expect(res.status).toBe(200);
    const body = await res.json() as { skills: Array<Record<string, unknown>> };
    expect(body.skills).toHaveLength(1);
    expect(body.skills[0]).not.toHaveProperty("notes");
    expect(JSON.stringify(body)).not.toContain("should-not-leak");
  });

  it("strips per-field privateFields markings on the public profile", async () => {
    const { token, user } = await registerAndGetToken("alice", "alice@test.com");

    const addRes = await authReq("/profile/projects", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bachelor Thesis",
        description: "A public project with a private repo URL",
        url: "https://github.com/example/private-thesis-repo",
        privateFields: ["url"],
      }),
    });
    expect(addRes.status).toBe(201);

    await dbConn.db.execute(
      sql`UPDATE profiles SET is_public = TRUE WHERE user_id = ${user.id}`,
    );

    const res = await req("/u/alice");
    expect(res.status).toBe(200);
    const body = await res.json() as { projects: Array<Record<string, unknown>> };
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]).toHaveProperty("name", "Bachelor Thesis");
    expect(body.projects[0]).toHaveProperty("description");
    expect(body.projects[0]).not.toHaveProperty("url");
    expect(body.projects[0]).not.toHaveProperty("privateFields");
    expect(JSON.stringify(body)).not.toContain("private-thesis-repo");
  });

  it("keeps privateFields-marked fields visible to authenticated owner", async () => {
    const { token } = await registerAndGetToken("alice", "alice@test.com");

    await authReq("/profile/projects", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Bachelor Thesis",
        url: "https://github.com/example/private-thesis-repo",
        privateFields: ["url"],
      }),
    });

    const res = await authReq("/profile", token);
    expect(res.status).toBe(200);
    const body = await res.json() as { projects: Array<Record<string, unknown>> };
    expect(body.projects[0]).toHaveProperty("url");
    expect(body.projects[0]).toHaveProperty("privateFields");
  });

  it("filters /profile reads when API key has maxVisibility=public", async () => {
    const { token } = await registerAndGetToken("alice", "alice@test.com");

    await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TypeScript",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "advanced",
        notes: "internal-skill-note",
        visibility: "public",
      }),
    });
    await authReq("/profile/skills", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "InternalTool",
        domainId: "builtin-domain-software-development",
        categoryId: "builtin-category-software-development-languages",
        proficiency: "advanced",
        visibility: "private",
      }),
    });
    await authReq("/profile/projects", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Thesis",
        url: "https://github.com/example/private-thesis",
        privateFields: ["url"],
      }),
    });

    const keyRes = await authReq("/auth/api-keys", token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "capped-test", scopes: "read", maxVisibility: "public" }),
    });
    expect(keyRes.status).toBe(201);
    const keyData = await keyRes.json() as { key: string; maxVisibility: string };
    expect(keyData.maxVisibility).toBe("public");

    const cappedRes = await authReq("/profile", keyData.key);
    expect(cappedRes.status).toBe(200);
    const cappedProfile = await cappedRes.json() as {
      skills: Array<Record<string, unknown>>;
      projects: Array<Record<string, unknown>>;
    };
    expect(cappedProfile.skills.map((s) => s.name)).toEqual(["TypeScript"]);
    expect(cappedProfile.skills[0]).not.toHaveProperty("notes");
    expect(JSON.stringify(cappedProfile)).not.toContain("internal-skill-note");
    expect(cappedProfile.projects[0]).not.toHaveProperty("url");

    const ownerRes = await authReq("/profile", token);
    const ownerProfile = await ownerRes.json() as { skills: Array<Record<string, unknown>> };
    expect(ownerProfile.skills.map((s) => s.name).sort()).toEqual(["InternalTool", "TypeScript"]);
  });
});
