import { z } from "zod";
import { graphId } from "../ids.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

/**
 * Facebook Page post/comment tools (duyhai/home-server#39).
 *
 * All calls use the same Page access token and graph.facebook.com base as the
 * Instagram tools (client.ig). Reads require pages_read_user_content on the
 * token; writes require pages_manage_engagement. Naming contract: every read
 * is fb_get_* (the hosted read-only allowlist and its test enforce this);
 * writes (fb_reply_to_comment, fb_hide_comment) are Mac-only — never
 * registered on the hosted endpoint. There is deliberately no delete tool.
 */
export function registerFbCommentTools(server: McpServer, client: MetaClient): void {
  // ─── fb_get_page_posts ───────────────────────────────────────
  server.tool(
    "fb_get_page_posts",
    "List recent posts on the configured Facebook Page, with comment counts.",
    {
      limit: z.number().optional().describe("Number of posts to return"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ limit, after }) => {
      try {
        const params: Record<string, unknown> = {
          fields:
            "id,message,created_time,permalink_url,comments.summary(true).limit(0)",
        };
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.ig(
          "GET",
          `/${client.facebookPageId}/posts`,
          params
        );
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get page posts failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_get_comments ─────────────────────────────────────────
  server.tool(
    "fb_get_comments",
    "Get comments on a Facebook Page post.",
    {
      post_id: graphId().describe("Post ID (from fb_get_page_posts)"),
      limit: z.number().optional().describe("Number of comments to return"),
      after: z.string().optional().describe("Pagination cursor"),
      include_replies: z
        .boolean()
        .optional()
        .describe(
          "true to flatten replies into one chronological list (filter=stream); default is top-level comments only. Hidden comments are visible either way with a Page token — check is_hidden."
        ),
    },
    async ({ post_id, limit, after, include_replies }) => {
      try {
        const params: Record<string, unknown> = {
          fields:
            "id,message,from,created_time,like_count,comment_count,is_hidden,permalink_url",
        };
        if (include_replies) params.filter = "stream";
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.ig("GET", `/${post_id}/comments`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get comments failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_get_comment ──────────────────────────────────────────
  server.tool(
    "fb_get_comment",
    "Get details of a single Facebook comment.",
    {
      comment_id: graphId().describe("Comment ID"),
    },
    async ({ comment_id }) => {
      try {
        const { data, rateLimit } = await client.ig("GET", `/${comment_id}`, {
          fields:
            "id,message,from,created_time,like_count,comment_count,is_hidden,parent,permalink_url",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get comment failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_get_comment_replies ──────────────────────────────────
  server.tool(
    "fb_get_comment_replies",
    "Get replies to a Facebook comment.",
    {
      comment_id: graphId().describe("Comment ID to get replies for"),
      limit: z.number().optional().describe("Number of replies to return"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ comment_id, limit, after }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,message,from,created_time,like_count,is_hidden",
        };
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.ig("GET", `/${comment_id}/comments`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get replies failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_reply_to_comment (WRITE — Mac only) ──────────────────
  server.tool(
    "fb_reply_to_comment",
    "Reply to a Facebook comment as the Page. Requires pages_manage_engagement.",
    {
      comment_id: graphId().describe("Comment ID to reply to"),
      message: z.string().describe("Reply text"),
    },
    async ({ comment_id, message }) => {
      try {
        const { data, rateLimit } = await client.ig("POST", `/${comment_id}/comments`, { message });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Reply failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── fb_hide_comment (WRITE — Mac only) ──────────────────────
  server.tool(
    "fb_hide_comment",
    "Hide or unhide a comment on the Page. Requires pages_manage_engagement.",
    {
      comment_id: graphId().describe("Comment ID"),
      hide: z.boolean().describe("true to hide, false to unhide"),
    },
    async ({ comment_id, hide }) => {
      try {
        const { data, rateLimit } = await client.ig("POST", `/${comment_id}`, { is_hidden: hide });
        return { content: [{ type: "text", text: JSON.stringify({ success: true, hidden: hide, ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Hide comment failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
