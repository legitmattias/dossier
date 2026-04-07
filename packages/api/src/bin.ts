import { serve } from "@hono/node-server";
import { createConnection } from "./db/connection.js";
import { createApp } from "./app.js";

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  console.error("DATABASE_URL is required. Set it to postgres://... or sqlite:...");
  process.exit(1);
}

const port = Number(process.env["PORT"] ?? "3200");
const host = process.env["HOST"] ?? "0.0.0.0";

const dbConnection = createConnection(databaseUrl);
const app = createApp(dbConnection);

console.log(`Dossier API (${dbConnection.dialect}) listening on http://${host}:${port}`);

serve({ fetch: app.fetch, port, hostname: host });

// Graceful shutdown
process.on("SIGINT", async () => {
  await dbConnection.close();
  process.exit(0);
});
