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
      domain_id TEXT REFERENCES domains(id),
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  // Allow null domain_id on existing databases
  await db.execute(sql`ALTER TABLE interests ALTER COLUMN domain_id DROP NOT NULL`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT,
      role TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      skill_ids JSONB NOT NULL DEFAULT '[]',
      highlights JSONB NOT NULL DEFAULT '[]',
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT`);

  // Project priority is optional (null = no priority). Relax the legacy NOT NULL/default.
  await db.execute(sql`ALTER TABLE projects ALTER COLUMN priority DROP NOT NULL`);
  await db.execute(sql`ALTER TABLE projects ALTER COLUMN priority DROP DEFAULT`);

  await db.execute(sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS description TEXT`);
  await db.execute(sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE`);

  await db.execute(sql`ALTER TABLE goals ADD COLUMN IF NOT EXISTS notes TEXT`);
  await db.execute(sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS notes TEXT`);

  await db.execute(sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public'`);
  await db.execute(sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS proficiency_labels JSONB DEFAULT '{}'`);
  await db.execute(sql`ALTER TABLE skills ADD COLUMN IF NOT EXISTS proficiency_label TEXT`);

  // Timestamps on domains/categories/interests (added in entity model updates)
  await db.execute(sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE domains ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await db.execute(sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);

  // User flags for feedback gating
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS feedback_opt_in BOOLEAN NOT NULL DEFAULT FALSE`);

  // Per-field privacy override: array of field names hidden from public output
  // even when the entity itself is public. Goals default to ["progress"] so the
  // history of % updates stays private unless the user opts in to publishing it.
  await db.execute(sql`ALTER TABLE skills    ADD COLUMN IF NOT EXISTS private_fields JSONB NOT NULL DEFAULT '[]'`);
  await db.execute(sql`ALTER TABLE goals     ADD COLUMN IF NOT EXISTS private_fields JSONB NOT NULL DEFAULT '["progress"]'`);
  await db.execute(sql`ALTER TABLE interests ADD COLUMN IF NOT EXISTS private_fields JSONB NOT NULL DEFAULT '[]'`);
  await db.execute(sql`ALTER TABLE projects  ADD COLUMN IF NOT EXISTS private_fields JSONB NOT NULL DEFAULT '[]'`);

  // Optional visibility cap on API keys ("public" = filter reads as if anonymous, NULL = no cap)
  await db.execute(sql`ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS max_visibility TEXT`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      message TEXT NOT NULL,
      reproduction TEXT,
      reporter_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      client_name TEXT,
      client_version TEXT,
      client_sha TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      resolved_note TEXT,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
