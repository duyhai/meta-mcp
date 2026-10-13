import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../services/meta-client.js";
import { registerIgCommentTools } from "../tools/instagram/comments.js";
import { registerIgMediaTools } from "../tools/instagram/media.js";
import { registerIgMentionTools } from "../tools/instagram/mentions.js";
import { registerIgProfileTools } from "../tools/instagram/profile.js";

/**
 * The hosted (remote) entrypoint is deliberately READ-ONLY.
 *
 * A remote MCP connector has no client-side permission rules the way Claude
 * Code settings provide on a workstation, and cloud scheduled tasks run
 * unattended — so no tool that writes (reply, hide, publish, delete), no
 * messaging, no Threads, and no token/webhook management is registered at
 * all. Enforcement is server-side by this allowlist: anything not listed
 * here does not exist on the hosted endpoint.
 */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "ig_get_comments",
  "ig_get_comment",
  "ig_get_replies",
  "ig_get_media",
  "ig_get_media_list",
  "ig_get_media_insights",
  "ig_get_account_insights",
  "ig_get_profile",
  "ig_get_mentioned_comments",
  "ig_get_tagged_media",
]);

/** Minimal surface the register functions actually use. */
type ToolRegistrar = Pick<McpServer, "tool">;

/** Wrap a server so register functions can only land allowlisted tools. */
function readOnlyFilter<T extends ToolRegistrar>(server: T): T {
  return new Proxy(server, {
    get(target, prop, receiver) {
      // Filter every registration surface the SDK offers, so a register
      // function switching from tool() to registerTool() cannot bypass the
      // allowlist silently.
      if (prop === "tool" || prop === "registerTool") {
        return (name: string, ...rest: unknown[]) => {
          if (!READ_ONLY_TOOLS.has(name)) return undefined;
          const fn = (target as Record<string | symbol, unknown>)[prop];
          if (typeof fn !== "function") {
            throw new Error(`readOnlyFilter: server has no ${String(prop)}()`);
          }
          return (fn as (...a: unknown[]) => unknown).call(target, name, ...rest);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/** Register exactly the read-only Instagram tools on `server`. */
export function registerReadOnlyIgTools(
  server: ToolRegistrar,
  client: MetaClient
): void {
  const filtered = readOnlyFilter(server) as McpServer;
  registerIgCommentTools(filtered, client);
  registerIgMediaTools(filtered, client);
  registerIgMentionTools(filtered, client);
  registerIgProfileTools(filtered, client);
}
