import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";
import { waitForContainerStatus } from "../../services/container-polling.js";

export function registerThreadsReplyTools(server: McpServer, client: MetaClient): void {
  // ─── threads_get_replies ─────────────────────────────────────
  server.tool(
    "threads_get_replies",
    "Get replies (conversation) for a specific Threads post.",
    {
      post_id: z.string().describe("Threads post ID to get replies for"),
      reverse: z.boolean().optional().describe("Reverse chronological order"),
      limit: z.number().optional().describe("Number of replies"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ post_id, reverse, limit, after }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,text,username,permalink,timestamp,media_type,media_url,has_replies,hide_status,root_post,replied_to,is_reply,reply_audience,topic_tag,is_verified,profile_picture_url",
        };
        if (reverse !== undefined) params.reverse = reverse;
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.threads("GET", `/${post_id}/replies`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get replies failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_conversation ────────────────────────────────
  server.tool(
    "threads_get_conversation",
    "Get a flattened list of all replies (top-level and nested) to a Threads post, in chronological or reverse-chronological order.",
    {
      post_id: z.string().describe("Root Threads post ID to get the conversation for"),
      reverse: z.boolean().optional().describe("Reverse chronological order (default true)"),
      limit: z.number().optional().describe("Number of replies"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ post_id, reverse, limit, after }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,text,username,permalink,timestamp,media_type,media_url,has_replies,hide_status,root_post,replied_to,is_reply,reply_audience,topic_tag,is_verified,profile_picture_url",
        };
        if (reverse !== undefined) params.reverse = reverse;
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.threads("GET", `/${post_id}/conversation`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get conversation failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_reply ───────────────────────────────────────────
  server.tool(
    "threads_reply",
    "Reply to a Threads post or another reply.",
    {
      reply_to_id: z.string().describe("Post ID to reply to"),
      text: z.string().max(500).describe("Reply text"),
      image_url: z.string().url().optional().describe("Optional image URL to attach"),
      video_url: z.string().url().optional().describe("Optional video URL to attach"),
    },
    async ({ reply_to_id, text, image_url, video_url }) => {
      try {
        if (image_url && video_url) {
          throw new Error("A reply can include either image_url or video_url, not both.");
        }
        let mediaType = "TEXT";
        if (image_url) mediaType = "IMAGE";
        if (video_url) mediaType = "VIDEO";
        const params: Record<string, unknown> = {
          media_type: mediaType,
          text,
          reply_to_id,
        };
        if (image_url) params.image_url = image_url;
        if (video_url) params.video_url = video_url;
        const { data: container } = await client.threads("POST", `/${client.threadsUserId}/threads`, params);
        const containerId = (container as { id: string }).id;
        if (video_url) {
          await waitForContainerStatus(
            async () => {
              const { data: status } = await client.threads(
                "GET",
                `/${containerId}`,
                { fields: "status" }
              );
              return (status as { status?: string }).status;
            },
            {
              intervalMs: 5_000,
              maxWaitMs: 120_000,
              label: "Threads reply video",
            }
          );
        }
        const { data, rateLimit } = await client.threads("POST", `/${client.threadsUserId}/threads_publish`, {
          creation_id: containerId,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Reply failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_hide_reply ──────────────────────────────────────
  server.tool(
    "threads_hide_reply",
    "Hide a reply on your Threads post. Hidden replies are still visible if directly accessed.",
    {
      reply_id: z.string().describe("Reply ID to hide"),
    },
    async ({ reply_id }) => {
      try {
        const { data, rateLimit } = await client.threads("POST", `/${reply_id}/manage_reply`, { hide: true });
        return { content: [{ type: "text", text: JSON.stringify({ success: true, hidden: true, ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Hide reply failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_unhide_reply ────────────────────────────────────
  server.tool(
    "threads_unhide_reply",
    "Unhide a previously hidden reply on your Threads post.",
    {
      reply_id: z.string().describe("Reply ID to unhide"),
    },
    async ({ reply_id }) => {
      try {
        const { data, rateLimit } = await client.threads("POST", `/${reply_id}/manage_reply`, { hide: false });
        return { content: [{ type: "text", text: JSON.stringify({ success: true, hidden: false, ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Unhide reply failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_pending_replies ─────────────────────────────
  server.tool(
    "threads_get_pending_replies",
    "Get pending/ignored replies awaiting approval on a post that has reply approvals enabled (enable_reply_approvals).",
    {
      post_id: z.string().describe("Threads post ID with reply approvals enabled"),
      approval_status: z.enum(["pending", "ignored"]).optional().describe("Filter by approval status (default: all)"),
      reverse: z.boolean().optional().describe("Reverse chronological order (default true)"),
    },
    async ({ post_id, approval_status, reverse }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,text,topic_tag,timestamp,media_product_type,media_type,media_url,shortcode,thumbnail_url,children,has_replies,root_post,replied_to,is_reply,hide_status,reply_approval_status",
        };
        if (approval_status) params.approval_status = approval_status;
        if (reverse !== undefined) params.reverse = reverse;
        const { data, rateLimit } = await client.threads("GET", `/${post_id}/pending_replies`, params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get pending replies failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_manage_pending_reply ────────────────────────────
  server.tool(
    "threads_manage_pending_reply",
    "Approve or ignore a pending reply on a post with reply approvals enabled. Ignored replies can still be approved later.",
    {
      reply_id: z.string().describe("Pending reply ID"),
      approve: z.boolean().describe("true to approve and publish the reply, false to ignore it"),
    },
    async ({ reply_id, approve }) => {
      try {
        const { data, rateLimit } = await client.threads("POST", `/${reply_id}/manage_pending_reply`, { approve });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Manage pending reply failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
