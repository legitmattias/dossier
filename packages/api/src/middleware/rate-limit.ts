/**
 * Simple in-memory rate limiter middleware for Hono.
 * Tracks requests per IP with a sliding window.
 */
import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../app.js";

interface RateLimitOptions {
  readonly windowMs: number;
  readonly max: number;
  readonly message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests" } = options;
  const windows = new Map<string, WindowEntry>();

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now > entry.resetAt) windows.delete(key);
    }
  }, windowMs);

  return createMiddleware<AppEnv>(async (c, next) => {
    // Skip rate limiting in test environment
    if (process.env["NODE_ENV"] === "test") {
      await next();
      return;
    }

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      ?? c.req.header("x-real-ip")
      ?? "unknown";

    const now = Date.now();
    const entry = windows.get(ip);

    if (!entry || now > entry.resetAt) {
      windows.set(ip, { count: 1, resetAt: now + windowMs });
      await next();
      return;
    }

    entry.count++;
    if (entry.count > max) {
      c.header("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: message }, 429);
    }

    await next();
  });
}
