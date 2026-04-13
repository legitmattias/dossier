/**
 * Ensure all tables exist in the database.
 * Uses CREATE TABLE IF NOT EXISTS for idempotent startup.
 */
import { sql } from "drizzle-orm";
import type { Database } from "./connection.js";

export async function ensureTables(db: Database): Promise<void> {
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
      bio TEXT,
      preferred_language TEXT,
      custom_instructions TEXT,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      settings JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Add columns if they don't exist (for existing databases)
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT`);
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT`);
  await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_instructions TEXT`);

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
      motivation TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'active',
      progress JSONB NOT NULL DEFAULT '[]',
      resources JSONB NOT NULL DEFAULT '[]',
      target_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS motivation TEXT`);

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
