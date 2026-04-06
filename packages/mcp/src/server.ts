import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { infrastructure } from "@dossier/core";
import type { application } from "@dossier/core";

import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

export interface DossierMcpDeps {
  readonly profileRepository: application.IProfileRepository;
  readonly idGenerator: application.IIdGenerator;
}

export function createDossierMcpServer(deps: DossierMcpDeps): McpServer {
  const server = new McpServer({
    name: "dossier",
    version: "0.0.1",
  });

  registerResources(server, deps);
  registerTools(server, deps);
  registerPrompts(server, deps);

  return server;
}

export function createDeps(profilePath: string): DossierMcpDeps {
  return {
    profileRepository: new infrastructure.FileProfileRepository(profilePath),
    idGenerator: new infrastructure.UuidIdGenerator(),
  };
}
