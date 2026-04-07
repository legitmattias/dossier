import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { infrastructure } from "@dossier/core";

import type { AppEnv } from "../app.js";
import type { PgDatabase, SqliteDatabase } from "../db/connection.js";
import * as pgSchema from "../db/schema.pg.js";
import * as sqliteSchema from "../db/schema.sqlite.js";
import { loadProfileFromDb } from "../db/profile-loader.js";

export const publicRoutes = new Hono<AppEnv>();

// GET /u/:username — Public profile data (only isPublic profiles)
publicRoutes.get("/:username", async (c) => {
  const username = c.req.param("username");
  const dbConn = c.get("dbConnection");

  // Find user by username
  let userId: string | undefined;
  let isPublic = false;

  if (dbConn.dialect === "postgres") {
    const db = dbConn.db as PgDatabase;
    const userRows = await db.select().from(pgSchema.users).where(eq(pgSchema.users.username, username));
    if (!userRows[0]) return c.json({ error: "User not found" }, 404);
    userId = userRows[0].id;

    const profileRows = await db.select().from(pgSchema.profiles).where(eq(pgSchema.profiles.userId, userId));
    isPublic = profileRows[0]?.isPublic ?? false;
  } else {
    const db = dbConn.db as SqliteDatabase;
    const userRows = await db.select().from(sqliteSchema.users).where(eq(sqliteSchema.users.username, username));
    if (!userRows[0]) return c.json({ error: "User not found" }, 404);
    userId = userRows[0].id;

    const profileRows = await db.select().from(sqliteSchema.profiles).where(eq(sqliteSchema.profiles.userId, userId));
    isPublic = profileRows[0]?.isPublic ?? false;
  }

  if (!isPublic) {
    return c.json({ error: "Profile is not public" }, 404);
  }

  const profile = await loadProfileFromDb(dbConn, userId);
  if (!profile) return c.json({ error: "Profile not found" }, 404);

  const format = c.req.query("format") ?? "json";

  if (format === "json") {
    const serialized = infrastructure.serializeProfile(profile);
    return c.json(serialized);
  }

  const exporter = infrastructure.createExporter(format);
  return c.text(exporter.export(profile));
});
