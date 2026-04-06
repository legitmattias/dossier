import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { infrastructure } from "@dossier/core";

import { createDossierMcpServer, createDeps } from "./server.js";

const profilePath = process.env["DOSSIER_PROFILE"] ?? infrastructure.getDefaultProfilePath();

const deps = createDeps(profilePath);
const server = createDossierMcpServer(deps);

const transport = new StdioServerTransport();
await server.connect(transport);
