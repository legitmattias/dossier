import { infrastructure } from "@dossier/core";

import { createDossierMcpServer } from "./server.js";
import type { DossierMcpDeps } from "./server.js";

// --- Storage backend ---

const storage = process.env["DOSSIER_STORAGE"] ?? "file";
let deps: DossierMcpDeps;

if (storage === "api") {
  const apiUrl = process.env["DOSSIER_API_URL"];
  const storageApiKey = process.env["DOSSIER_STORAGE_API_KEY"] ?? process.env["DOSSIER_API_KEY"];
  if (!apiUrl || !storageApiKey) {
    console.error("DOSSIER_STORAGE=api requires DOSSIER_API_URL and DOSSIER_STORAGE_API_KEY (or DOSSIER_API_KEY)");
    process.exit(1);
  }
  const { ApiProfileRepository } = await import("./api-profile-repository.js");
  deps = {
    profileRepository: new ApiProfileRepository(apiUrl, storageApiKey),
    idGenerator: new infrastructure.UuidIdGenerator(),
  };
} else {
  const profilePath = process.env["DOSSIER_PROFILE"] ?? infrastructure.getDefaultProfilePath();
  deps = {
    profileRepository: new infrastructure.FileProfileRepository(profilePath),
    idGenerator: new infrastructure.UuidIdGenerator(),
  };
}

// --- Transport ---

const transport = process.env["DOSSIER_TRANSPORT"] ?? "stdio";

if (transport === "http") {
  // HTTP mode: pass a factory so each session gets a fresh McpServer instance
  const { startHttpServer } = await import("./http.js");
  const port = Number(process.env["DOSSIER_PORT"] ?? "3100");
  const host = process.env["DOSSIER_HOST"] ?? "0.0.0.0";
  const mcpApiKey = process.env["DOSSIER_MCP_API_KEY"] ?? process.env["DOSSIER_API_KEY"];
  const corsOrigin = process.env["DOSSIER_MCP_CORS_ORIGIN"];
  await startHttpServer(() => createDossierMcpServer(deps), { port, host, apiKey: mcpApiKey, corsOrigin });
} else {
  // stdio mode: single session, single server instance
  const server = createDossierMcpServer(deps);
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
