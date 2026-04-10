import { createMiddleware } from "hono/factory";
import * as jose from "jose";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

import type { AppEnv } from "../app.js";
import type { Database } from "../db/connection.js";
import * as schema from "../db/schema.js";

const JWT_ALG = "HS256";
const JWT_EXPIRY = "7d";
const JWT_ISSUER = "dossier";
const JWT_AUDIENCE = "dossier-api";

// --- JWT helpers ---

export async function createJwt(userId: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new jose.SignJWT({ sub: userId })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRY)
    .sign(key);
}

export async function verifyJwt(token: string, secret: string): Promise<string | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// --- API key helpers ---

export async function hashApiKey(key: string): Promise<string> {
  return bcrypt.hash(key, 10);
}

export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
  return bcrypt.compare(key, hash);
}

async function resolveApiKeyUserId(db: Database, apiKey: string): Promise<string | null> {
  const prefix = apiKey.slice(0, 8);
  const rows = await db.select().from(schema.apiKeys).where(eq(schema.apiKeys.prefix, prefix));
  for (const row of rows) {
    if (await verifyApiKey(apiKey, row.keyHash)) {
      await db.update(schema.apiKeys).set({ lastUsedAt: new Date() }).where(eq(schema.apiKeys.id, row.id));
      return row.userId;
    }
  }
  return null;
}

// --- Middleware ---

/**
 * Auth middleware that supports three modes:
 * 1. JWT Bearer token → sets userId from token
 * 2. API key Bearer token (starts with "dsk_") → resolves userId from database
 * 3. No auth → userId remains undefined (for public routes)
 */
export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    await next();
    return;
  }

  const token = authHeader.slice(7);
  const jwtSecret = process.env["JWT_SECRET"];

  // API key (prefixed with "dsk_")
  if (token.startsWith("dsk_")) {
    const { db } = c.get("dbConnection");
    const userId = await resolveApiKeyUserId(db, token);
    if (userId) {
      c.set("userId", userId);
    }
    await next();
    return;
  }

  // JWT
  if (jwtSecret) {
    const userId = await verifyJwt(token, jwtSecret);
    if (userId) {
      c.set("userId", userId);
    }
  }

  await next();
});

/**
 * Require authentication — returns 401 if no valid auth provided.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.get("userId");
  if (!userId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
});

// --- Password helpers ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
