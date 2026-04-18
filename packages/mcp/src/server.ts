import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { VERSION, getVersionInfo } from "@dossier/core";

import type { DossierOperations } from "./operations.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

export function createDossierMcpServer(ops: DossierOperations): McpServer {
  const { commitSha } = getVersionInfo();
  const server = new McpServer({
    name: "dossier",
    version: VERSION,
    description: commitSha === "dev"
      ? "Personal knowledge profile for LLM personalization"
      : `Personal knowledge profile for LLM personalization (build ${commitSha.slice(0, 7)})`,
  });

  registerResources(server, ops);
  registerTools(server, ops);
  registerPrompts(server, ops);

  return server;
}
