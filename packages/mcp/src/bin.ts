import { infrastructure } from "@dossier/core";

import { createDossierMcpServer } from "./server.js";
import type { DossierOperations } from "./operations.js";

// --- Select operations backend ---

const storage = process.env["DOSSIER_STORAGE"] ?? "file";
let ops: DossierOperations;

if (storage === "api") {
  const apiUrl = process.env["DOSSIER_API_URL"];
  const storageApiKey = process.env["DOSSIER_STORAGE_API_KEY"] ?? process.env["DOSSIER_API_KEY"];
  if (!apiUrl || !storageApiKey) {
    console.error("DOSSIER_STORAGE=api requires DOSSIER_API_URL and DOSSIER_STORAGE_API_KEY");
    process.exit(1);
  }
  const { RemoteOperations } = await import("./remote-operations.js");
  ops = new RemoteOperations(apiUrl, storageApiKey);
} else {
  const profilePath = process.env["DOSSIER_PROFILE"] ?? infrastructure.getDefaultProfilePath();
  const { LocalOperations } = await import("./local-operations.js");
  ops = new LocalOperations(profilePath);
}

// --- Select transport ---

const transport = process.env["DOSSIER_TRANSPORT"] ?? "stdio";

if (transport === "http") {
  const { startHttpServer } = await import("./http.js");
  const port = Number(process.env["DOSSIER_PORT"] ?? "3100");
  const host = process.env["DOSSIER_HOST"] ?? "0.0.0.0";
  const mcpApiKey = process.env["DOSSIER_MCP_API_KEY"] ?? process.env["DOSSIER_API_KEY"];
  const corsOrigin = process.env["DOSSIER_MCP_CORS_ORIGIN"];
  await startHttpServer(() => createDossierMcpServer(ops), { port, host, apiKey: mcpApiKey, corsOrigin });
} else {
  const server = createDossierMcpServer(ops);
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
