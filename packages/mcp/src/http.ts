import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { log } from "./logger.js";

export interface HttpServerOptions {
  readonly port: number;
  readonly host: string;
  readonly apiKey?: string;
  readonly corsOrigin?: string;
}

export async function startHttpServer(
  serverFactory: McpServer | (() => McpServer),
  options: HttpServerOptions,
): Promise<void> {
  const { port, host, apiKey, corsOrigin } = options;
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  const getServer = typeof serverFactory === "function"
    ? serverFactory
    : () => serverFactory;

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

    // API key check (timing-safe comparison to prevent timing attacks)
    if (apiKey) {
      const authHeader = req.headers["authorization"] ?? "";
      const expected = `Bearer ${apiKey}`;
      const valid = authHeader.length === expected.length
        && timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
      if (!valid) {
        log.warn(`Unauthorized ${req.method} ${req.url}`);
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }
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
        await transports[sessionId].handleRequest(req, res, body);
        return;
      }

      if (!sessionId && isInitializeRequest(body)) {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id) => {
            log.info(`Session initialized: ${id}`);
            transports[id] = transport;
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            log.info(`Session closed: ${sid}`);
            delete transports[sid];
          }
        };

        const server = getServer();
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
    if (apiKey) {
      log.info("API key authentication enabled");
    } else {
      log.warn("No DOSSIER_API_KEY set — HTTP transport is unauthenticated");
    }
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
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
