import { Hono } from "hono";
import { cors } from "hono/cors";

import { application } from "@dossier/core";
import type { DbConnection } from "./db/connection.js";
import { optionalAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { publicRoutes } from "./routes/public.js";

export interface AppEnv {
  Variables: {
    dbConnection: DbConnection;
    userId?: string;
    apiKeyScopes?: string;
  };
}

export function createApp(dbConnection: DbConnection): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Inject database into context
  app.use("*", async (c, next) => {
    c.set("dbConnection", dbConnection);
    await next();
  });

  // CORS
  const origins = process.env["CORS_ORIGINS"];
  if (!origins && process.env["NODE_ENV"] === "production") {
    console.warn("[dossier-api] WARNING: CORS_ORIGINS not set in production — defaulting to restrictive");
  }
  app.use("*", cors({
    origin: origins ? origins.split(",").map((o) => o.trim()) : (process.env["NODE_ENV"] === "production" ? [] : "*"),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [],
    credentials: !!origins,
  }));

  // Auth — resolve JWT/API key on every request (doesn't require it)
  app.use("*", optionalAuth);

  // Global error handler
  app.onError((err, c) => {
    // Domain/application errors → 400 with descriptive message
    if (err instanceof application.ApplicationError || err instanceof application.InvalidInputError || err instanceof application.ProfileNotFoundError) {
      return c.json({ error: err.message }, 400);
    }

    // Known domain errors (DomainError base class has a 'code' property)
    if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
      return c.json({ error: err.message }, 400);
    }

    // Unknown errors — log internally, return generic message
    console.error(`[dossier-api] Unhandled error:`, err);
    return c.json({ error: "Internal server error" }, 500);
  });

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Routes
  app.route("/auth", authRoutes);
  app.route("/profile", profileRoutes);
  app.route("/u", publicRoutes);

  return app;
}
