import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";

import type { AppEnv } from "../app.js";
import * as schema from "../db/schema.js";
import {
  createJwt,
  hashPassword,
  verifyPassword,
  hashApiKey,
  requireAuth,
  requireScope,
} from "../middleware/auth.js";
import { BUILT_IN_DOMAINS } from "@dossier/core";
import { rateLimit } from "../middleware/rate-limit.js";

const loginRateLimit = rateLimit({ windowMs: 60 * 1000, max: 5, message: "Too many login attempts" });
const registerRateLimit = rateLimit({ windowMs: 60 * 60 * 1000, max: 3, message: "Too many registration attempts" });

export const authRoutes = new Hono<AppEnv>();

// POST /auth/register
authRoutes.post("/register", registerRateLimit, async (c) => {
  if (process.env["REGISTRATION_ENABLED"] === "false") {
    return c.json({ error: "Registration is currently disabled" }, 403);
  }

  const body = await c.req.json<{ username: string; email: string; password: string; name?: string }>();
  const { username, email, password, name } = body;

  if (!username || !email || !password) {
    return c.json({ error: "username, email, and password are required" }, 400);
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{1,28}[a-zA-Z0-9]$/.test(username)) {
    return c.json({ error: "Username must be 3-30 characters, alphanumeric with dashes/underscores" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    return c.json({ error: "Server misconfigured: JWT_SECRET not set" }, 500);
  }

  const { db } = c.get("dbConnection");
  const userId = randomUUID();
  const profileId = randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await db.insert(schema.users).values({
      id: userId, username, email, passwordHash,
    });

    await db.insert(schema.profiles).values({
      id: profileId, userId, name: name ?? username,
    });

    // Seed built-in domains
    for (const domain of BUILT_IN_DOMAINS) {
      await db.insert(schema.domains).values({
        id: domain.id, profileId, slug: domain.slug, name: domain.name,
        description: domain.description, isBuiltIn: true,
      });
      for (const cat of domain.categories) {
        await db.insert(schema.categories).values({
          id: cat.id, domainId: domain.id, slug: cat.slug, name: cat.name,
          description: cat.description,
        });
      }
    }
  } catch (error: unknown) {
    // Check for unique constraint violation (Postgres code 23505)
    const pgCode = (error as { code?: string })?.code;
    const cause = (error as { cause?: { code?: string } })?.cause;
    if (pgCode === "23505" || cause?.code === "23505") {
      return c.json({ error: "Username or email already exists" }, 409);
    }
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("unique") || message.includes("duplicate") || message.includes("23505")) {
      return c.json({ error: "Username or email already exists" }, 409);
    }
    throw error;
  }

  const token = await createJwt(userId, jwtSecret);
  return c.json({ token, user: { id: userId, username, email } }, 201);
});

// POST /auth/login
authRoutes.post("/login", loginRateLimit, async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: "email and password are required" }, 400);
  }

  const jwtSecret = process.env["JWT_SECRET"];
  if (!jwtSecret) {
    return c.json({ error: "Server misconfigured: JWT_SECRET not set" }, 500);
  }

  const { db } = c.get("dbConnection");
  const rows = await db.select().from(schema.users).where(eq(schema.users.email, email));
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const token = await createJwt(user.id, jwtSecret);
  return c.json({ token, user: { id: user.id, username: user.username, email: user.email } });
});

// GET /auth/me
authRoutes.get("/me", requireAuth, requireScope("read"), async (c) => {
  const userId = c.get("userId")!;
  const { db } = c.get("dbConnection");

  const rows = await db.select({
    id: schema.users.id,
    username: schema.users.username,
    email: schema.users.email,
  }).from(schema.users).where(eq(schema.users.id, userId));
  const user = rows[0];

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ user });
});

// POST /auth/api-keys — Generate a new API key
authRoutes.post("/api-keys", requireAuth, requireScope("write"), async (c) => {
  const userId = c.get("userId")!;
  const body = await c.req.json<{ name: string; scopes?: string }>();

  if (!body.name) {
    return c.json({ error: "name is required" }, 400);
  }

  const rawKey = `dsk_${randomUUID().replace(/-/g, "")}`;
  const prefix = rawKey.slice(0, 8);
  const keyHash = await hashApiKey(rawKey);
  const id = randomUUID();

  const { db } = c.get("dbConnection");
  await db.insert(schema.apiKeys).values({
    id, userId, name: body.name, keyHash, prefix,
    scopes: body.scopes ?? "read",
  });

  // Return the raw key ONCE — it can't be retrieved later
  return c.json({ id, name: body.name, key: rawKey, prefix, scopes: body.scopes ?? "read" }, 201);
});

// GET /auth/api-keys — List all API keys (without hashes)
authRoutes.get("/api-keys", requireAuth, requireScope("read"), async (c) => {
  const userId = c.get("userId")!;
  const { db } = c.get("dbConnection");

  const keys = await db.select({
    id: schema.apiKeys.id,
    name: schema.apiKeys.name,
    prefix: schema.apiKeys.prefix,
    scopes: schema.apiKeys.scopes,
    lastUsedAt: schema.apiKeys.lastUsedAt,
    createdAt: schema.apiKeys.createdAt,
  }).from(schema.apiKeys).where(eq(schema.apiKeys.userId, userId));

  return c.json({ keys });
});

// DELETE /auth/api-keys/:id — Revoke an API key
authRoutes.delete("/api-keys/:id", requireAuth, requireScope("write"), async (c) => {
  const userId = c.get("userId")!;
  const keyId = c.req.param("id");
  const { db } = c.get("dbConnection");

  const result = await db.delete(schema.apiKeys)
    .where(and(eq(schema.apiKeys.id, keyId), eq(schema.apiKeys.userId, userId)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Key not found" }, 404);
  }

  return c.json({ revoked: true });
});
