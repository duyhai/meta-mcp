#!/usr/bin/env node
/**
 * Streamable-HTTP entrypoint for hosting this server as a remote MCP.
 *
 * Read-only by design (see src/http/readonly.ts). Stateless: each POST gets
 * a fresh server + transport, so there is no session state to hijack and no
 * GET/SSE stream (405, as the MCP spec permits).
 *
 * Auth: requires `Authorization: Bearer $MCP_AUTH_TOKEN` on every /mcp
 * request. The process refuses to start without MCP_AUTH_TOKEN — behind
 * Cloudflare Access this is defense in depth, not the only gate.
 */
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { loadConfig } from "./config.js";
import { MetaClient } from "./services/meta-client.js";
import { registerReadOnlyIgTools } from "./http/readonly.js";

const PORT = Number(process.env.PORT || 23376);
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const ALLOWED_HOSTS = (
  process.env.MCP_ALLOWED_HOSTS || "localhost,127.0.0.1,::1,[::1],meta-ig-mcp"
)
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

if (!AUTH_TOKEN) {
  console.error("MCP_AUTH_TOKEN must be set; refusing to start unauthenticated.");
  process.exit(1);
}

const config = loadConfig();
if (!config.instagramAccessToken || !config.instagramUserId) {
  console.error("INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_USER_ID must be set.");
  process.exit(1);
}
const client = new MetaClient(config);

function hostAllowed(req: IncomingMessage): boolean {
  const host = (req.headers.host || "").replace(/:\d+$/, "");
  return ALLOWED_HOSTS.includes(host);
}

function authorized(req: IncomingMessage): boolean {
  const expected = Buffer.from(`Bearer ${AUTH_TOKEN}`);
  const got = Buffer.from(req.headers.authorization ?? "");
  // Length comparison leaks only the length; timingSafeEqual needs equal sizes.
  return got.length === expected.length && timingSafeEqual(got, expected);
}

const MAX_BODY_BYTES = 1_048_576; // 1 MiB — requests are JSON-RPC calls, not uploads.

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new Error("body too large");
    chunks.push(c as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : undefined;
}

async function handleMcp(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" }).end();
    return;
  }
  const server = new McpServer({ name: "meta-mcp-readonly", version: "2.1.1" });
  registerReadOnlyIgTools(server, client);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    const body = await readBody(req);
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (err) {
    console.error("request failed:", err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "bad request" }));
    }
  }
}

const httpServer = createServer((req, res) => {
  const path = (req.url || "/").split("?")[0];
  if (path === "/healthz") {
    // Unauthenticated liveness only; reveals nothing.
    res.writeHead(200).end("ok");
    return;
  }
  if (!hostAllowed(req)) {
    res.writeHead(403).end("forbidden host");
    return;
  }
  if (!authorized(req)) {
    res.writeHead(401, { "WWW-Authenticate": "Bearer" }).end("unauthorized");
    return;
  }
  if (path === "/mcp" || path === "/") {
    void handleMcp(req, res);
    return;
  }
  res.writeHead(404).end("not found");
});

httpServer.listen(PORT, () => {
  console.error(`meta-mcp read-only HTTP endpoint on :${PORT} (POST /mcp)`);
});
