import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

/**
 * Facebook Page and post insights (Graph API v26.0).
 *
 * Both tools need read_insights + pages_read_engagement on the Page token,
 * and Meta only serves Page Insights for Pages with 100+ likes. Reads only,
 * named fb_get_* so they pass the hosted read-only allowlist.
 *
 * Meta removed the impressions/reach family on 2025-06-15 and 2025-11-15
 * for ALL API versions (page_impressions*, page_posts_impressions*,
 * page_fans*, post_impressions*); asking for one returns an invalid-metric
 * error. The defaults below use the media-view replacements.
 */
export function registerFbInsightTools(server: McpServer, client: MetaClient): void {
  // ─── fb_get_page_insights ────────────────────────────────────
  server.tool(
    "fb_get_page_insights",
    "Get Facebook Page insights for the configured Page. Current metrics: page_media_view (views; replaces the removed page_impressions), page_total_media_view_unique (unique viewers; replaces the removed page_impressions_unique reach), page_post_engagements, page_follows, page_daily_follows_unique, page_daily_unfollows_unique, page_views_total, page_video_views, page_actions_post_reactions_total. Removed metrics (page_impressions*, page_posts_impressions*, page_fans*) return an invalid-metric error. Facebook has no saves metric. Requires read_insights; Meta only serves this for Pages with 100+ likes.",
    {
      metric: z
        .string()
        .optional()
        .describe("Comma-separated metrics (default: page_media_view,page_total_media_view_unique,page_post_engagements,page_follows)"),
      period: z
        .enum(["day", "week", "days_28"])
        .optional()
        .describe("Aggregation period (default: day). page_follows and page_actions_post_reactions_total support day only."),
      since: z.string().optional().describe("Start date (Unix timestamp or YYYY-MM-DD)"),
      until: z.string().optional().describe("End date (Unix timestamp or YYYY-MM-DD)"),
      breakdown: z
        .string()
        .optional()
        .describe("Optional breakdown for page_media_view, e.g. is_from_ads or is_from_followers"),
    },
    async ({ metric, period, since, until, breakdown }) => {
      try {
        const params: Record<string, unknown> = {
          metric: metric || "page_media_view,page_total_media_view_unique,page_post_engagements,page_follows",
          period: period || "day",
        };
        if (since) params.since = since;
        if (until) params.until = until;
        if (breakdown) params.breakdown = breakdown;
        const { data, rateLimit } = await client.ig(
          "GET",
          `/${client.facebookPageId}/insights`,
          params
        );
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get page insights failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_get_post_insights ────────────────────────────────────
  server.tool(
    "fb_get_post_insights",
    "Get lifetime insights for one Facebook Page post, plus its share, comment and reaction counts (post fields, not insight metrics). Current metrics: post_media_view (views; replaces the removed post_impressions), post_total_media_view_unique (unique viewers; replaces the removed post_impressions_unique reach), post_clicks, post_reactions_by_type_total, post_video_views, post_video_avg_time_watched. Removed post_impressions* metrics return an invalid-metric error. Facebook has no saves metric. Requires read_insights.",
    {
      post_id: z.string().describe("Post ID (from fb_get_page_posts)"),
      metric: z
        .string()
        .optional()
        .describe("Comma-separated metrics (default: post_media_view,post_total_media_view_unique,post_clicks,post_reactions_by_type_total)"),
    },
    async ({ post_id, metric }) => {
      try {
        const m = metric || "post_media_view,post_total_media_view_unique,post_clicks,post_reactions_by_type_total";
        const insights = await client.ig("GET", `/${post_id}/insights`, { metric: m });
        const counts = await client.ig("GET", `/${post_id}`, {
          fields: "shares,comments.summary(true).limit(0),reactions.summary(true).limit(0)",
        });
        const c = counts.data as {
          shares?: { count?: number };
          comments?: { summary?: { total_count?: number } };
          reactions?: { summary?: { total_count?: number } };
        };
        const result = {
          ...insights.data as object,
          counts: {
            // Meta omits `shares` entirely when a post has none.
            shares: c.shares?.count ?? 0,
            comments: c.comments?.summary?.total_count ?? null,
            reactions: c.reactions?.summary?.total_count ?? null,
          },
          _rateLimit: counts.rateLimit ?? insights.rateLimit,
        };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get post insights failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
