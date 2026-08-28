import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";
import { buildThreadsUserInsightParams } from "../../services/api-contracts.js";

export function registerThreadsInsightTools(server: McpServer, client: MetaClient): void {
  // ─── threads_get_post_insights ───────────────────────────────
  server.tool(
    "threads_get_post_insights",
    "Get insights/analytics for a specific Threads post (views, likes, replies, reposts, quotes, clicks).",
    {
      post_id: z.string().describe("Threads post ID"),
      metric: z.string().optional().describe("Comma-separated metrics (default: views,likes,replies,reposts,quotes)"),
    },
    async ({ post_id, metric }) => {
      try {
        const m = metric || "views,likes,replies,reposts,quotes";
        const { data, rateLimit } = await client.threads("GET", `/${post_id}/insights`, { metric: m });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get post insights failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_user_insights ───────────────────────────────
  server.tool(
    "threads_get_user_insights",
    "Get account-level Threads insights (views, likes, replies, reposts, quotes, clicks, followers, follower demographics).",
    {
      metric: z.string().describe("Comma-separated metrics: views,likes,replies,reposts,quotes,followers_count,follower_demographics"),
      since: z.string().optional().describe("Start date (Unix timestamp)"),
      until: z.string().optional().describe("End date (Unix timestamp)"),
      breakdown: z.enum(["country", "city", "age", "gender"]).optional().describe("Required when requesting follower_demographics"),
    },
    async ({ metric, since, until, breakdown }) => {
      try {
        const params = buildThreadsUserInsightParams(
          metric,
          since,
          until,
          breakdown
        );
        const { data, rateLimit } = await client.threads("GET", `/${client.threadsUserId}/threads_insights`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get user insights failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
