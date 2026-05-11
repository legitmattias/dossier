import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "./logger.js";

export interface HttpServerOptions {
  readonly port: number;
  readonly host: string;
  /**
   * URL of the Dossier REST API. Used to validate inbound bearer tokens at
   * session-init time by calling GET /auth/me. Required — HTTP transport
   * cannot operate in file-storage mode.
   */
  readonly apiUrl: string;
  readonly corsOrigin?: string;
  /**
   * Override the inbound bearer validator. Used by tests; production passes
   * undefined and the real `/auth/me` round-trip runs.
   */
  readonly validateBearer?: (apiKey: string) => Promise<{ userId: string } | null>;
}

export interface SessionContext {
  readonly apiKey: string;
  readonly userId: string;
}

/**
 * Start the MCP HTTP transport.
 *
 * Inbound authentication is DB-backed: each client must present a personal
 * `dsk_` API key in `Authorization: Bearer …`. The key is validated against
 * the Dossier API at session-init time. Validated bearer + userId are passed
 * into `serverFactory` so each session operates as its own user — the MCP
 * server forwards that client's bearer onward to the API instead of using a
 * shared service identity.
 */
export async function startHttpServer(
  serverFactory: (ctx: SessionContext) => McpServer,
  options: HttpServerOptions,
): Promise<void> {
  const { port, host, apiUrl, corsOrigin, validateBearer } = options;
  const transports: Record<string, StreamableHTTPServerTransport> = {};
  const sessionActivity: Record<string, number> = {};

  // Clean up inactive sessions every 5 minutes
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [id, lastActive] of Object.entries(sessionActivity)) {
      if (now - lastActive > SESSION_TIMEOUT_MS) {
        transports[id]?.close();
        delete transports[id];
        delete sessionActivity[id];
        log.info(`Session timed out: ${id}`);
      }
    }
  }, 5 * 60 * 1000);

  const validate = validateBearer ?? (async (token: string) => {
    if (!token.startsWith("dsk_")) return null;
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const body = await res.json() as { user?: { id?: string } };
      const userId = body.user?.id;
      if (!userId) return null;
      return { userId };
    } catch (err) {
      log.warn(`Bearer validation failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  });

  const extractBearer = (req: IncomingMessage): string | null => {
    const header = req.headers["authorization"] ?? "";
    if (!header.startsWith("Bearer ")) return null;
    return header.slice(7);
  };

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", corsOrigin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "mcp-session-id");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Only handle /mcp path
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    if (url.pathname !== "/mcp") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const sessionId = req.headers["mcp-session-id"] as string | undefined;

      if (sessionId && transports[sessionId]) {
        sessionActivity[sessionId] = Date.now();
        await transports[sessionId].handleRequest(req, res, body);
        return;
      }

      // Any POST without a known session id needs a valid bearer. Validate
      // upfront so missing/bad auth returns 401 regardless of body shape.
      const bearer = extractBearer(req);
      if (!bearer) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing Authorization: Bearer dsk_… header" }));
        return;
      }
      const result = await validate(bearer);
      if (!result) {
        log.warn(`Unauthorized POST from ${req.socket.remoteAddress}`);
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid or revoked API key" }));
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        // Session is bound to this token; subsequent requests on the
        // session id use the bound context regardless of later headers.

        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            log.info(`Session initialized: ${id} (user ${result.userId})`);
            transports[id] = transport;
            sessionActivity[id] = Date.now();
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            log.info(`Session closed: ${sid}`);
            delete sessionActivity[sid];
            delete transports[sid];
          }
        };

        const server = serverFactory({ apiKey: bearer, userId: result.userId });
        await server.connect(transport);
        await transport.handleRequest(req, res, body);
        return;
      }

      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null,
      }));
    } else if (req.method === "GET") {
      const sessionId = req.headers["mcp-session-id"] as string;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].handleRequest(req, res);
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid session" }));
      }
    } else if (req.method === "DELETE") {
      const sessionId = req.headers["mcp-session-id"] as string;
      if (sessionId && transports[sessionId]) {
        await transports[sessionId].close();
        delete transports[sessionId];
        res.writeHead(200);
        res.end();
      } else {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid session" }));
      }
    } else {
      res.writeHead(405, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Method not allowed" }));
    }
  });

  httpServer.listen(port, host, () => {
    log.info(`Listening on http://${host}:${port}/mcp`);
    log.info(`Inbound auth: per-client dsk_ keys, validated via ${apiUrl}/auth/me`);
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    clearInterval(cleanupInterval);
    for (const transport of Object.values(transports)) {
      await transport.close();
    }
    httpServer.close();
    process.exit(0);
  });
}

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalSize = 0;
    req.on("data", (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_BODY_SIZE) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", reject);
  });
}
