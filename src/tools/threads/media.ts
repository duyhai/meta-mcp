import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

export function registerThreadsMediaTools(server: McpServer, client: MetaClient): void {
  // ─── threads_get_posts ───────────────────────────────────────
  server.tool(
    "threads_get_posts",
    "Get a list of published Threads posts.",
    {
      limit: z.number().optional().describe("Number of results (default 25)"),
      since: z.string().optional().describe("Start date (ISO 8601 or Unix timestamp)"),
      until: z.string().optional().describe("End date (ISO 8601 or Unix timestamp)"),
      after: z.string().optional().describe("Pagination cursor"),
      before: z.string().optional().describe("Pagination cursor"),
    },
    async ({ limit, since, until, after, before }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,media_product_type,media_type,media_url,permalink,text,timestamp,shortcode,is_quote_post,has_replies,reply_audience,topic_tag,link_attachment_url,poll_attachment,alt_text,is_verified,profile_picture_url,location_id",
        };
        if (limit) params.limit = limit;
        if (since) params.since = since;
        if (until) params.until = until;
        if (after) params.after = after;
        if (before) params.before = before;
        const { data, rateLimit } = await client.threads("GET", `/${client.threadsUserId}/threads`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get posts failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_post ────────────────────────────────────────
  server.tool(
    "threads_get_post",
    "Get details of a specific Threads post.",
    {
      post_id: z.string().describe("Threads post ID"),
      fields: z.string().optional().describe("Comma-separated fields"),
    },
    async ({ post_id, fields }) => {
      try {
        const f = fields || "id,media_product_type,media_type,media_url,permalink,text,timestamp,shortcode,is_quote_post,has_replies,reply_audience,topic_tag,link_attachment_url,poll_attachment,alt_text,is_verified,profile_picture_url,location_id";
        const { data, rateLimit } = await client.threads("GET", `/${post_id}`, { fields: f });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get post failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_profile_posts ───────────────────────────────
  server.tool(
    "threads_get_profile_posts",
    "Get a public profile's posts by username (Profile Discovery). Requires threads_profile_discovery permission; with standard access, only @meta, @threads, @instagram, and @facebook are queryable.",
    {
      username: z.string().describe("Threads username to look up (without @)"),
      limit: z.number().optional().describe("Number of results"),
      since: z.string().optional().describe("Start date (ISO 8601 or Unix timestamp)"),
      until: z.string().optional().describe("End date (ISO 8601 or Unix timestamp)"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ username, limit, since, until, after }) => {
      try {
        const params: Record<string, unknown> = {
          username,
          fields: "id,media_product_type,media_type,media_url,permalink,text,timestamp,shortcode,is_quote_post,has_replies,topic_tag,alt_text,is_verified,profile_picture_url",
        };
        if (limit) params.limit = limit;
        if (since) params.since = since;
        if (until) params.until = until;
        if (after) params.after = after;
        const { data, rateLimit } = await client.threads("GET", "/profile_posts", params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get profile posts failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_search_posts ────────────────────────────────────
  server.tool(
    "threads_search_posts",
    "Search for public Threads posts by keyword or topic tag via the /keyword_search endpoint. Results can be filtered by media type and author.",
    {
      q: z.string().describe("Search keyword or topic tag to query"),
      search_mode: z.enum(["KEYWORD", "TAG"]).optional().describe("Treat q as a keyword or a topic tag (default: KEYWORD)"),
      search_type: z.enum(["TOP", "RECENT"]).optional().describe("Return most popular or most recent results (default: TOP)"),
      media_type: z.enum(["TEXT", "IMAGE", "VIDEO"]).optional().describe("Filter results by media type"),
      author_username: z.string().optional().describe("Filter results to an exact author username (no @)"),
      since: z.string().optional().describe("Start date (Unix timestamp, must be >= 1688540400)"),
      until: z.string().optional().describe("End date (Unix timestamp)"),
      limit: z.number().optional().describe("Number of results (default 25, max 100)"),
    },
    async ({ q, search_mode, search_type, media_type, author_username, since, until, limit }) => {
      try {
        const params: Record<string, unknown> = {
          q,
          fields: "id,text,username,permalink,timestamp,media_type,media_url,topic_tag,has_replies,is_quote_post,is_reply",
        };
        if (search_mode) params.search_mode = search_mode;
        if (search_type) params.search_type = search_type;
        if (media_type) params.media_type = media_type;
        if (author_username) params.author_username = author_username;
        if (since) params.since = since;
        if (until) params.until = until;
        if (limit) params.limit = limit;
        const { data, rateLimit } = await client.threads("GET", "/keyword_search", params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Search posts failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
