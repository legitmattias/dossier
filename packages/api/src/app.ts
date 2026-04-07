import { Hono } from "hono";
import { cors } from "hono/cors";

import type { DbConnection } from "./db/connection.js";
import { optionalAuth } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { profileRoutes } from "./routes/profile.js";
import { publicRoutes } from "./routes/public.js";

export interface AppEnv {
  Variables: {
    dbConnection: DbConnection;
    userId?: string;
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
  app.use("*", cors({
    origin: origins ? origins.split(",").map((o) => o.trim()) : "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: [],
    credentials: true,
  }));

  // Auth — resolve JWT/API key on every request (doesn't require it)
  app.use("*", optionalAuth);

  // Global error handler
  app.onError((err, c) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[dossier-api] Error: ${message}`);

    // Domain/application errors → 400
    if (err.constructor?.name?.includes("Error") && "code" in err) {
      return c.json({ error: message }, 400);
    }

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
