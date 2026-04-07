import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import postgres from "postgres";
import Database from "better-sqlite3";

import * as pgSchema from "./schema.pg.js";
import * as sqliteSchema from "./schema.sqlite.js";

export type DbDialect = "postgres" | "sqlite";

export type PgDatabase = ReturnType<typeof drizzlePg<typeof pgSchema>>;
export type SqliteDatabase = ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>;
export type AnyDatabase = PgDatabase | SqliteDatabase;

export interface DbConnection {
  readonly dialect: DbDialect;
  readonly db: AnyDatabase;
  readonly close: () => Promise<void>;
}

export function parseDialect(url: string): DbDialect {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgres";
  }
  if (url.startsWith("sqlite:")) {
    return "sqlite";
  }
  throw new Error(`Unsupported DATABASE_URL format: "${url}". Use postgres://... or sqlite:...`);
}

export function createConnection(databaseUrl: string): DbConnection {
  const dialect = parseDialect(databaseUrl);

  if (dialect === "postgres") {
    const client = postgres(databaseUrl);
    const db = drizzlePg(client, { schema: pgSchema });
    return {
      dialect,
      db,
      close: async () => { await client.end(); },
    };
  }

  // SQLite
  const filePath = databaseUrl.replace(/^sqlite:/, "");
  const client = new Database(filePath);
  client.pragma("journal_mode = WAL");
  client.pragma("foreign_keys = ON");
  const db = drizzleSqlite(client, { schema: sqliteSchema });
  return {
    dialect,
    db,
    close: async () => { client.close(); },
  };
}
