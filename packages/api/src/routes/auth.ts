import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AppEnv } from "../app.js";
import type { PgDatabase, SqliteDatabase } from "../db/connection.js";
import * as pgSchema from "../db/schema.pg.js";
import * as sqliteSchema from "../db/schema.sqlite.js";
import {
  createJwt,
  hashPassword,
  verifyPassword,
  hashApiKey,
  requireAuth,
} from "../middleware/auth.js";
import { BUILT_IN_DOMAINS } from "@dossier/core";

export const authRoutes = new Hono<AppEnv>();

// POST /auth/register
authRoutes.post("/register", async (c) => {
  const body = await c.req.json<{ username: string; email: string; password: string; name?: string }>();
  const { username, email, password, name } = body;

  if (!username || !email || !password) {
    return c.json({ error: "username, email, and password are required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    return c.json({ error: "Server misconfigured: JWT_SECRET not set" }, 500);
  }

  const dbConn = c.get("dbConnection");
  const userId = randomUUID();
  const profileId = randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  try {
    if (dbConn.dialect === "postgres") {
      const db = dbConn.db as PgDatabase;

      await db.insert(pgSchema.users).values({
        id: userId, username, email, passwordHash,
      });

      await db.insert(pgSchema.profiles).values({
        id: profileId, userId, name: name ?? username,
      });

      // Seed built-in domains
      for (const domain of BUILT_IN_DOMAINS) {
        await db.insert(pgSchema.domains).values({
          id: domain.id, profileId, slug: domain.slug, name: domain.name,
          description: domain.description, isBuiltIn: true,
        });
        for (const cat of domain.categories) {
          await db.insert(pgSchema.categories).values({
            id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
            description: cat.description,
          });
        }
      }
    } else {
      const db = dbConn.db as SqliteDatabase;
      const nowStr = now.toISOString();

      await db.insert(sqliteSchema.users).values({
        id: userId, username, email, passwordHash,
        createdAt: nowStr, updatedAt: nowStr,
      });

      await db.insert(sqliteSchema.profiles).values({
        id: profileId, userId, name: name ?? username,
        createdAt: nowStr, updatedAt: nowStr,
      });

      for (const domain of BUILT_IN_DOMAINS) {
        await db.insert(sqliteSchema.domains).values({
          id: domain.id, profileId, slug: domain.slug, name: domain.name,
          description: domain.description, isBuiltIn: true,
        });
        for (const cat of domain.categories) {
          await db.insert(sqliteSchema.categories).values({
            id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
            description: cat.description,
          });
        }
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("UNIQUE") || message.includes("duplicate")) {
      return c.json({ error: "Username or email already exists" }, 409);
    }
    throw error;
  }

  const token = await createJwt(userId, jwtSecret);
  return c.json({ token, user: { id: userId, username, email } }, 201);
});

// POST /auth/login
authRoutes.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    return c.json({ error: "Server misconfigured: JWT_SECRET not set" }, 500);
  }

  const dbConn = c.get("dbConnection");
  let user: { id: string; username: string; email: string; passwordHash: string } | undefined;

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    const rows = await db.select().from(pgSchema.users).where(eq(pgSchema.users.email, email));
    user = rows[0];
  } else {
    const db = dbConn.db as SqliteDatabase;
    const rows = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.email, email));
    user = rows[0];
  }

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await createJwt(user.id, jwtSecret);
  return c.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

// GET /auth/me
authRoutes.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dbConn = c.get("dbConnection");

  let user: { id: string; username: string; email: string } | undefined;

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    const rows = await db.select({
      id: pgSchema.users.id,
      username: pgSchema.users.username,
      email: pgSchema.users.email,
    }).from(pgSchema.users).where(eq(pgSchema.users.id, userId));
    user = rows[0];
  } else {
    const db = dbConn.db as SqliteDatabase;
    const rows = await db.select({
      id: sqliteSchema.users.id,
      username: sqliteSchema.users.username,
      email: sqliteSchema.users.email,
    }).from(sqliteSchema.users).where(eq(sqliteSchema.users.id, userId));
    user = rows[0];
  }

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});

// POST /auth/api-keys — Generate a new API key
authRoutes.post("/api-keys", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const body = await c.req.json<{ name: string; scopes?: string }>();

  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }

  const rawKey = `dsk_${randomUUID().replace(/-/g, "")}`;
  const prefix = rawKey.slice(0, 8);
  const keyHash = await hashApiKey(rawKey);
  const id = randomUUID();

  const dbConn = c.get("dbConnection");

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    await db.insert(pgSchema.apiKeys).values({
      id, userId, name: body.name, keyHash, prefix,
      scopes: body.scopes ?? "read",
    });
  } else {
    const db = dbConn.db as SqliteDatabase;
    await db.insert(sqliteSchema.apiKeys).values({
      id, userId, name: body.name, keyHash, prefix,
      scopes: body.scopes ?? "read",
      createdAt: new Date().toISOString(),
    });
  }

  // Return the raw key ONCE — it can't be retrieved later
  return c.json({ id, name: body.name, key: rawKey, prefix, scopes: body.scopes ?? "read" }, 201);
});

// GET /auth/api-keys — List all API keys (without hashes)
authRoutes.get("/api-keys", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const dbConn = c.get("dbConnection");

  let keys: Array<{ id: string; name: string; prefix: string; scopes: string; lastUsedAt: string | Date | null; createdAt: string | Date }>;

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    keys = await db.select({
      id: pgSchema.apiKeys.id,
      name: pgSchema.apiKeys.name,
      prefix: pgSchema.apiKeys.prefix,
      scopes: pgSchema.apiKeys.scopes,
      lastUsedAt: pgSchema.apiKeys.lastUsedAt,
      createdAt: pgSchema.apiKeys.createdAt,
    }).from(pgSchema.apiKeys).where(eq(pgSchema.apiKeys.userId, userId));
  } else {
    const db = dbConn.db as SqliteDatabase;
    keys = await db.select({
      id: sqliteSchema.apiKeys.id,
      name: sqliteSchema.apiKeys.name,
      prefix: sqliteSchema.apiKeys.prefix,
      scopes: sqliteSchema.apiKeys.scopes,
      lastUsedAt: sqliteSchema.apiKeys.lastUsedAt,
      createdAt: sqliteSchema.apiKeys.createdAt,
    }).from(sqliteSchema.apiKeys).where(eq(sqliteSchema.apiKeys.userId, userId));
  }

  return c.json({ keys });
});

// DELETE /auth/api-keys/:id — Revoke an API key
authRoutes.delete("/api-keys/:id", requireAuth, async (c) => {
  const userId = c.get("userId")!;
  const keyId = c.req.param("id");
  const dbConn = c.get("dbConnection");

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    const result = await db.delete(pgSchema.apiKeys)
      .where(eq(pgSchema.apiKeys.id, keyId))
      .returning();
    if (result.length === 0) return c.json({ error: "Key not found" }, 404);
  } else {
    const db = dbConn.db as SqliteDatabase;
    await db.delete(sqliteSchema.apiKeys)
      .where(eq(sqliteSchema.apiKeys.id, keyId));
  }

  return c.json({ revoked: true });
});
