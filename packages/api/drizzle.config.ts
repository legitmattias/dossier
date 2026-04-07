import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"] ?? "postgres://dossier:dossier@localhost:5432/dossier";
const dialect = databaseUrl.startsWith("sqlite:") ? "sqlite" : "postgresql";
const schema = dialect === "postgresql" ? "./src/db/schema.pg.ts" : "./src/db/schema.sqlite.ts";

export default defineConfig({
  dialect,
  schema,
  out: `./drizzle/${dialect}`,
  dbCredentials: dialect === "postgresql"
    ? { url: databaseUrl }
    : { url: databaseUrl.replace(/^sqlite:/, "") },
});
