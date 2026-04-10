import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema.js";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

export interface DbConnection {
  readonly db: Database;
  readonly close: () => Promise<void>;
}

export function createConnection(databaseUrl: string): DbConnection {
  if (!databaseUrl.startsWith("postgres://") && !databaseUrl.startsWith("postgresql://")) {
    throw new Error(`DATABASE_URL must be a postgres:// URL. Got: "${databaseUrl}"`);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client, { schema });
  return {
    db,
    close: async () => { await client.end(); },
  };
}
