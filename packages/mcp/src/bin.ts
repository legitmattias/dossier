import { infrastructure } from "@dossier/core";

import { createDossierMcpServer, createDeps } from "./server.js";

const profilePath = process.env["DOSSIER_PROFILE"] ?? infrastructure.getDefaultProfilePath();
const transport = process.env["DOSSIER_TRANSPORT"] ?? "stdio";

const deps = createDeps(profilePath);
const server = createDossierMcpServer(deps);

if (transport === "http") {
  const { startHttpServer } = await import("./http.js");
  const port = Number(process.env["DOSSIER_PORT"] ?? "3100");
  const host = process.env["DOSSIER_HOST"] ?? "0.0.0.0";
  const apiKey = process.env["DOSSIER_API_KEY"];
  await startHttpServer(server, { port, host, apiKey });
} else {
  const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
