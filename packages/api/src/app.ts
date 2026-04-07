import { Hono } from "hono";
import { cors } from "hono/cors";

import type { DbConnection } from "./db/connection.js";

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

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // TODO: Mount route groups
  // app.route("/auth", authRoutes);
  // app.route("/profile", profileRoutes);
  // app.route("/skills", skillRoutes);
  // app.route("/goals", goalRoutes);
  // app.route("/interests", interestRoutes);
  // app.route("/u", publicRoutes);
  // app.route("/export", exportRoutes);

  return app;
}
