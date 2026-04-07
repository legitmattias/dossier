/**
 * Push schema to database on startup. Uses Drizzle's push API for development
 * and simple deployments. For production with controlled migrations, use
 * drizzle-kit generate + migrate instead.
 */
import { sql } from "drizzle-orm";
import type { DbConnection, PgDatabase, SqliteDatabase } from "./connection.js";
import * as pgSchema from "./schema.pg.js";
import * as sqliteSchema from "./schema.sqlite.js";

export async function ensureTables(dbConn: DbConnection): Promise<void> {
  if (dbConn.dialect === "postgres") {
    await ensureTablesPg(dbConn.db as PgDatabase);
  } else {
    await ensureTablesSqlite(dbConn.db as SqliteDatabase);
  }
}

async function ensureTablesPg(db: PgDatabase): Promise<void> {
  // Create tables if they don't exist using raw SQL
  // This is idempotent — safe to run on every startup
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT 'read',
      last_used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_built_in BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS domains_profile_slug_idx ON domains(profile_id, slug)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS categories_domain_slug_idx ON categories(domain_id, slug)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      proficiency TEXT NOT NULL,
      notes TEXT,
      sources JSONB NOT NULL DEFAULT '[]',
      usage JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS skills_profile_slug_domain_idx ON skills(profile_id, slug, domain_id)`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      progress JSONB NOT NULL DEFAULT '[]',
      resources JSONB NOT NULL DEFAULT '[]',
      target_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS interests (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function ensureTablesSqlite(db: SqliteDatabase): Promise<void> {
  db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      prefix TEXT NOT NULL,
      scopes TEXT NOT NULL DEFAULT 'read',
      last_used_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 0,
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      is_built_in INTEGER NOT NULL DEFAULT 0
    )
  `);
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS domains_profile_slug_idx ON domains(profile_id, slug)`);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT
    )
  `);
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS categories_domain_slug_idx ON categories(domain_id, slug)`);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      category_id TEXT NOT NULL REFERENCES categories(id),
      proficiency TEXT NOT NULL,
      notes TEXT,
      sources TEXT NOT NULL DEFAULT '[]',
      usage TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS skills_profile_slug_domain_idx ON skills(profile_id, slug, domain_id)`);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      description TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      progress TEXT NOT NULL DEFAULT '[]',
      resources TEXT NOT NULL DEFAULT '[]',
      target_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.run(sql`
    CREATE TABLE IF NOT EXISTS interests (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      domain_id TEXT NOT NULL REFERENCES domains(id),
      description TEXT,
      created_at TEXT NOT NULL
    )
  `);
}
