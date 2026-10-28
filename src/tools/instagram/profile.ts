import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

export function registerIgProfileTools(server: McpServer, client: MetaClient): void {
  // ─── ig_get_profile ──────────────────────────────────────────
  server.tool(
    "ig_get_profile",
    "Get Instagram Business/Creator account profile information.",
    {},
    async () => {
      try {
        const { data, rateLimit } = await client.ig("GET", `/${client.igUserId}`, {
          fields: "id,name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get profile failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_get_account_insights ─────────────────────────────────
  server.tool(
    "ig_get_account_insights",
    "Get Instagram account insights. Current metrics: views, reach, accounts_engaged, total_interactions, likes, comments, saves, shares, replies, reposts, profile_links_taps, follows_and_unfollows (period=day), and follower_demographics, engaged_audience_demographics (period=lifetime, use timeframe). Every metric except reach needs metric_type=total_value (the default here); reach also supports time_series. 'impressions' (removed), 'follower_count', 'profile_views', 'website_clicks' and other v22-deprecated metrics are not available. Requires instagram_manage_insights.",
    {
      metric: z.string().describe("Comma-separated metrics, e.g. views,reach,accounts_engaged,total_interactions,saves,shares"),
      period: z.enum(["day", "lifetime"]).optional().describe("Aggregation period (default: day; lifetime only for *_demographics)"),
      metric_type: z.enum(["total_value", "time_series"]).optional().describe("Default total_value. time_series works for reach only."),
      breakdown: z.string().optional().describe("total_value only, e.g. media_product_type, follow_type, follower_type, contact_button_type; demographics: age, city, country, gender"),
      since: z.string().optional().describe("Start (Unix timestamp or ISO 8601). Omitting since/until means the last 24 hours."),
      until: z.string().optional().describe("End (Unix timestamp or ISO 8601)"),
      timeframe: z.string().optional().describe("Demographics only: this_week, this_month, prev_month (overrides since/until)"),
    },
    async ({ metric, period, metric_type, breakdown, since, until, timeframe }) => {
      try {
        const params: Record<string, unknown> = {
          metric,
          period: period || "day",
          metric_type: metric_type || "total_value",
        };
        if (breakdown) params.breakdown = breakdown;
        if (since) params.since = since;
        if (until) params.until = until;
        if (timeframe) params.timeframe = timeframe;
        const { data, rateLimit } = await client.ig("GET", `/${client.igUserId}/insights`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get account insights failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_business_discovery ───────────────────────────────────
  server.tool(
    "ig_business_discovery",
    "Look up another Instagram Business/Creator account's public info by username.",
    {
      username: z.string().describe("Instagram username to look up (without @)"),
      fields: z.string().optional().describe("Fields to retrieve (default: id,username,name,biography,followers_count,follows_count,media_count)"),
    },
    async ({ username, fields }) => {
      try {
        const f = fields || "id,username,name,biography,followers_count,follows_count,media_count";
        const { data, rateLimit } = await client.ig("GET", `/${client.igUserId}`, {
          fields: `business_discovery.fields(${f}){username=${username}}`,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Business discovery failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_get_collaboration_invites ────────────────────────────
  server.tool(
    "ig_get_collaboration_invites",
    "Get pending collaboration invites for the Instagram account. Added in December 2025.",
    {
      limit: z.number().optional().describe("Number of results"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ limit, after }) => {
      try {
        const params: Record<string, unknown> = {};
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.ig("GET", `/${client.igUserId}/collaboration_invites`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get collaboration invites failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_respond_collaboration_invite ─────────────────────────
  server.tool(
    "ig_respond_collaboration_invite",
    "Accept or decline a collaboration invite. Added in December 2025.",
    {
      invite_id: z.string().describe("Collaboration invite ID"),
      action: z.enum(["accept", "decline"]).describe("Accept or decline the invite"),
    },
    async ({ invite_id, action }) => {
      try {
        const { data, rateLimit } = await client.ig("POST", `/${client.igUserId}/collaboration_invites`, {
          invite_id,
          action,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Respond to collaboration invite failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
