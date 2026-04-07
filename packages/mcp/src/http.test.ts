import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {
  addDomainToProfile,
  BUILT_IN_DOMAINS,
  createProfile,
  toProfileId,
} from "@dossier/core";
import type { Profile } from "@dossier/core";
import { application } from "@dossier/core";

import { createDossierMcpServer } from "./server.js";
import { startHttpServer } from "./http.js";
import type { DossierMcpDeps } from "./server.js";

// --- Test infrastructure (same as server.test.ts) ---

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

// --- HTTP transport tests ---

// Use a different port per test run to avoid conflicts
let testPort = 3200;

describe("HTTP transport", () => {
  let httpServer: ReturnType<typeof import("node:http").createServer>;
  let client: Client;
  let repo: InMemoryProfileRepository;

  beforeEach(async () => {
    testPort++;
    repo = new InMemoryProfileRepository();
    const deps: DossierMcpDeps = {
      profileRepository: repo,
      idGenerator: new StubIdGenerator(),
    };
    await repo.save(createTestProfile());

    // Start HTTP server — we use a factory function since each session creates a new server
    const serverFactory = () => createDossierMcpServer(deps);

    // We need to capture the http server for cleanup. Since startHttpServer
    // doesn't return it, we'll use the MCP client directly.
    await startHttpServer(createDossierMcpServer(deps), {
      port: testPort,
      host: "127.0.0.1",
      apiKey: "test-secret",
    });

    // Small delay for server to be ready
    await new Promise((r) => setTimeout(r, 100));
  });

  afterEach(async () => {
    try { await client?.close(); } catch { /* ignore */ }
  });

  it("connects via StreamableHTTP transport with API key", async () => {
    client = new Client({ name: "test-client", version: "1.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${testPort}/mcp`),
      { requestInit: { headers: { Authorization: "Bearer test-secret" } } },
    );
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(0);
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("dossier_add_skill");
    expect(toolNames).toContain("dossier_export");
  });

  it("rejects requests without API key", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/mcp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });
    expect(response.status).toBe(401);
  });

  it("rejects requests with wrong API key", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer wrong-key",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    });
    expect(response.status).toBe(401);
  });

  it("returns 404 for unknown paths", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/unknown`, {
      method: "GET",
      headers: { Authorization: "Bearer test-secret" },
    });
    expect(response.status).toBe(404);
  });

  it("handles CORS preflight", async () => {
    const response = await fetch(`http://127.0.0.1:${testPort}/mcp`, {
      method: "OPTIONS",
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-headers")).toContain("Authorization");
  });

  it("can call tools over HTTP", async () => {
    client = new Client({ name: "test-client", version: "1.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${testPort}/mcp`),
      { requestInit: { headers: { Authorization: "Bearer test-secret" } } },
    );
    await client.connect(transport);

    const result = await client.callTool({
      name: "dossier_list_skills",
      arguments: {},
    });
    expect(result.content[0].text).toContain("No skills found");
  });

  it("can read resources over HTTP", async () => {
    client = new Client({ name: "test-client", version: "1.0" });
    const transport = new StreamableHTTPClientTransport(
      new URL(`http://127.0.0.1:${testPort}/mcp`),
      { requestInit: { headers: { Authorization: "Bearer test-secret" } } },
    );
    await client.connect(transport);

    const result = await client.readResource({ uri: "dossier://profile/summary" });
    expect(result.contents[0].text).toContain("Dossier Profile: Test User");
  });
});
