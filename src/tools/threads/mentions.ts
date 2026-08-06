import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

export function registerThreadsMentionTools(server: McpServer, client: MetaClient): void {
  // ─── threads_get_mentions ────────────────────────────────────
  server.tool(
    "threads_get_mentions",
    "Get public Threads posts where the authenticated user has been @mentioned by another profile. Requires threads_manage_mentions permission (without advanced access, only mentions by app testers are returned).",
    {
      fields: z.string().optional().describe("Comma-separated fields (default: id,text,username,permalink,timestamp,media_type,media_url,has_replies,is_reply,topic_tag)"),
    },
    async ({ fields }) => {
      try {
        const f = fields || "id,text,username,permalink,timestamp,media_type,media_url,has_replies,is_reply,topic_tag";
        const { data, rateLimit } = await client.threads("GET", `/${client.threadsUserId}/mentions`, { fields: f });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get mentions failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
