import { infrastructure } from "@dossier/core";

import { createDossierMcpServer } from "./server.js";
import type { DossierOperations } from "./operations.js";

// --- Select transport ---

const transport = process.env["DOSSIER_TRANSPORT"] ?? "stdio";

if (transport === "http") {
  // HTTP transport is multi-tenant: each MCP client authenticates with their
  // own `dsk_` API key, validated against the Dossier API. The MCP server
  // forwards that bearer onward — there is no shared service identity. File
  // storage doesn't expose an /auth/me endpoint, so HTTP requires API mode.
  const storage = process.env["DOSSIER_STORAGE"] ?? "file";
  if (storage !== "api") {
    console.error("DOSSIER_TRANSPORT=http requires DOSSIER_STORAGE=api (per-client auth is validated against the API)");
    process.exit(1);
  }
  const apiUrl = process.env["DOSSIER_API_URL"];
  if (!apiUrl) {
    console.error("DOSSIER_TRANSPORT=http requires DOSSIER_API_URL");
    process.exit(1);
  }

  const { startHttpServer } = await import("./http.js");
  const { RemoteOperations } = await import("./remote-operations.js");
  const port = Number(process.env["DOSSIER_PORT"] ?? "3100");
  const host = process.env["DOSSIER_HOST"] ?? "0.0.0.0";
  const corsOrigin = process.env["DOSSIER_MCP_CORS_ORIGIN"];

  await startHttpServer(
    (ctx) => createDossierMcpServer(new RemoteOperations(apiUrl, ctx.apiKey)),
    { port, host, apiUrl, corsOrigin },
  );
} else {
  // stdio transport: local AI clients connecting from the same machine.
  // Storage can be file (default, single-user local) or api (cloud-backed).
  const storage = process.env["DOSSIER_STORAGE"] ?? "file";
  let ops: DossierOperations;

  if (storage === "api") {
    const apiUrl = process.env["DOSSIER_API_URL"];
    const apiKey = process.env["DOSSIER_API_KEY"];
    if (!apiUrl || !apiKey) {
      console.error("DOSSIER_STORAGE=api requires DOSSIER_API_URL and DOSSIER_API_KEY");
      process.exit(1);
    }
    const { RemoteOperations } = await import("./remote-operations.js");
    ops = new RemoteOperations(apiUrl, apiKey);
  } else {
    const profilePath = process.env["DOSSIER_PROFILE"] ?? infrastructure.getDefaultProfilePath();
    const { LocalOperations } = await import("./local-operations.js");
    ops = new LocalOperations(profilePath);
  }

  const server = createDossierMcpServer(ops);
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
