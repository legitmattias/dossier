import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DossierOperations } from "./operations.js";
import { registerResources } from "./resources.js";
import { registerTools } from "./tools.js";
import { registerPrompts } from "./prompts.js";

export function createDossierMcpServer(ops: DossierOperations): McpServer {
  const server = new McpServer({
    name: "dossier",
    version: "0.0.1",
  });

  registerResources(server, ops);
  registerTools(server, ops);
  registerPrompts(server, ops);

  return server;
}
