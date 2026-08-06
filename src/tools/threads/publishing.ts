import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

async function waitForThreadsContainer(client: MetaClient, containerId: string, maxWait = 30): Promise<void> {
  const interval = 2000;
  const maxAttempts = Math.ceil((maxWait * 1000) / interval);
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await client.threads("GET", `/${containerId}`, { fields: "status" });
    const status = (data as { status?: string }).status;
    if (status === "FINISHED") return;
    if (status === "ERROR") throw new Error("Threads container processing failed (ERROR status)");
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Threads container processing timed out after ${maxWait}s`);
}

export function registerThreadsPublishingTools(server: McpServer, client: MetaClient): void {
  // ─── threads_publish_text ────────────────────────────────────
  server.tool(
    "threads_publish_text",
    "Publish a text-only post on Threads. Supports optional link attachment, poll, GIF, topic tag, and quote post.",
    {
      text: z.string().max(500).describe("Post text (max 500 chars)"),
      reply_control: z.enum(["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"]).optional().describe("Who can reply"),
      link_attachment: z.string().url().optional().describe("URL to attach as a link preview card (max 5 links per post)"),
      topic_tag: z.string().max(50).optional().describe("Topic tag for the post (1-50 chars, no periods or ampersands)"),
      quote_post_id: z.string().optional().describe("ID of a post to quote"),
      poll_options: z.array(z.string()).min(2).max(4).optional().describe("Poll options (2-4 choices). Creates a poll attachment."),
      gif_id: z.string().optional().describe("GIF ID from GIPHY (id field from GIPHY's API response). GIPHY is currently the only supported GIF provider (Tenor was sunset March 31, 2026)."),
      alt_text: z.string().max(1000).optional().describe("Alt text for accessibility (max 1000 chars)"),
      is_spoiler: z.boolean().optional().describe("Mark content as spoiler"),
      is_ghost_post: z.boolean().optional().describe("Create a ghost post (auto-archived after 24h). Text-only, and per Meta's docs the only other feature supported alongside it is is_spoiler — do not combine with polls, GIFs, links, topic tags, location, reply approvals, or cross-sharing. Ghost posts also cannot be used to reply to a post."),
      enable_reply_approvals: z.boolean().optional().describe("Require replies to be approved before they're published. Not compatible with ghost posts."),
      location_id: z.string().optional().describe("Location ID to tag (from threads_search_locations)"),
      crossreshare_to_ig: z.boolean().optional().describe("Also share this post to the user's linked Instagram account as a Story"),
      crossreshare_to_ig_dark_mode: z.boolean().optional().describe("Cross-share to Instagram Stories in dark mode"),
    },
    async ({ text, reply_control, link_attachment, topic_tag, quote_post_id, poll_options, gif_id, alt_text, is_spoiler, is_ghost_post, enable_reply_approvals, location_id, crossreshare_to_ig, crossreshare_to_ig_dark_mode }) => {
      try {
        const params: Record<string, unknown> = { media_type: "TEXT", text };
        if (reply_control) params.reply_control = reply_control;
        if (link_attachment) params.link_attachment = link_attachment;
        if (topic_tag) params.topic_tag = topic_tag;
        if (quote_post_id) params.quote_post_id = quote_post_id;
        if (poll_options) {
          params.poll_attachment = JSON.stringify({ options: poll_options.map(o => ({ option_text: o })) });
        }
        if (gif_id) {
          params.gif_attachment = JSON.stringify({ gif_id, provider: "GIPHY" });
        }
        if (alt_text) params.alt_text = alt_text;
        if (is_spoiler) params.is_spoiler = true;
        if (is_ghost_post) params.is_ghost_post = true;
        if (enable_reply_approvals) params.enable_reply_approvals = true;
        if (location_id) params.location_id = location_id;
        if (crossreshare_to_ig) params.crossreshare_to_ig = true;
        if (crossreshare_to_ig_dark_mode) params.crossreshare_to_ig_dark_mode = true;
        const { data: container } = await client.threads("POST", `/${client.threadsUserId}/threads`, params);
        const containerId = (container as { id: string }).id;
        const { data, rateLimit } = await client.threads("POST", `/${client.threadsUserId}/threads_publish`, {
          creation_id: containerId,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Publish text failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_publish_image ───────────────────────────────────
  server.tool(
    "threads_publish_image",
    "Publish an image post on Threads. Supports topic tag, quote post, alt text, and spoiler flag.",
    {
      image_url: z.string().url().describe("Public HTTPS URL of the image (JPEG/PNG, max 8MB)"),
      text: z.string().max(500).optional().describe("Caption text"),
      reply_control: z.enum(["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"]).optional().describe("Who can reply"),
      topic_tag: z.string().max(50).optional().describe("Topic tag for the post"),
      quote_post_id: z.string().optional().describe("ID of a post to quote"),
      alt_text: z.string().max(1000).optional().describe("Alt text for accessibility (max 1000 chars)"),
      is_spoiler: z.boolean().optional().describe("Mark content as spoiler"),
      enable_reply_approvals: z.boolean().optional().describe("Require replies to be approved before they're published"),
      location_id: z.string().optional().describe("Location ID to tag (from threads_search_locations)"),
      crossreshare_to_ig: z.boolean().optional().describe("Also share this post to the user's linked Instagram account as a Story"),
      crossreshare_to_ig_dark_mode: z.boolean().optional().describe("Cross-share to Instagram Stories in dark mode"),
    },
    async ({ image_url, text, reply_control, topic_tag, quote_post_id, alt_text, is_spoiler, enable_reply_approvals, location_id, crossreshare_to_ig, crossreshare_to_ig_dark_mode }) => {
      try {
        const params: Record<string, unknown> = { media_type: "IMAGE", image_url };
        if (text) params.text = text;
        if (reply_control) params.reply_control = reply_control;
        if (topic_tag) params.topic_tag = topic_tag;
        if (quote_post_id) params.quote_post_id = quote_post_id;
        if (alt_text) params.alt_text = alt_text;
        if (is_spoiler) params.is_spoiler = true;
        if (enable_reply_approvals) params.enable_reply_approvals = true;
        if (location_id) params.location_id = location_id;
        if (crossreshare_to_ig) params.crossreshare_to_ig = true;
        if (crossreshare_to_ig_dark_mode) params.crossreshare_to_ig_dark_mode = true;
        const { data: container } = await client.threads("POST", `/${client.threadsUserId}/threads`, params);
        const containerId = (container as { id: string }).id;
        const { data, rateLimit } = await client.threads("POST", `/${client.threadsUserId}/threads_publish`, {
          creation_id: containerId,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Publish image failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_publish_video ───────────────────────────────────
  server.tool(
    "threads_publish_video",
    "Publish a video post on Threads. Waits for video processing. Supports topic tag, quote post, alt text, and spoiler flag.",
    {
      video_url: z.string().url().describe("Public HTTPS URL of the video (MP4/MOV, max 1GB, up to 5 min)"),
      text: z.string().max(500).optional().describe("Caption text"),
      reply_control: z.enum(["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"]).optional().describe("Who can reply"),
      topic_tag: z.string().max(50).optional().describe("Topic tag for the post"),
      quote_post_id: z.string().optional().describe("ID of a post to quote"),
      alt_text: z.string().max(1000).optional().describe("Alt text for accessibility (max 1000 chars)"),
      is_spoiler: z.boolean().optional().describe("Mark content as spoiler"),
      enable_reply_approvals: z.boolean().optional().describe("Require replies to be approved before they're published"),
      location_id: z.string().optional().describe("Location ID to tag (from threads_search_locations)"),
      crossreshare_to_ig: z.boolean().optional().describe("Also share this post to the user's linked Instagram account as a Story"),
      crossreshare_to_ig_dark_mode: z.boolean().optional().describe("Cross-share to Instagram Stories in dark mode"),
    },
    async ({ video_url, text, reply_control, topic_tag, quote_post_id, alt_text, is_spoiler, enable_reply_approvals, location_id, crossreshare_to_ig, crossreshare_to_ig_dark_mode }) => {
      try {
        const params: Record<string, unknown> = { media_type: "VIDEO", video_url };
        if (text) params.text = text;
        if (reply_control) params.reply_control = reply_control;
        if (topic_tag) params.topic_tag = topic_tag;
        if (quote_post_id) params.quote_post_id = quote_post_id;
        if (alt_text) params.alt_text = alt_text;
        if (is_spoiler) params.is_spoiler = true;
        if (enable_reply_approvals) params.enable_reply_approvals = true;
        if (location_id) params.location_id = location_id;
        if (crossreshare_to_ig) params.crossreshare_to_ig = true;
        if (crossreshare_to_ig_dark_mode) params.crossreshare_to_ig_dark_mode = true;
        const { data: container } = await client.threads("POST", `/${client.threadsUserId}/threads`, params);
        const containerId = (container as { id: string }).id;
        await waitForThreadsContainer(client, containerId);
        const { data, rateLimit } = await client.threads("POST", `/${client.threadsUserId}/threads_publish`, {
          creation_id: containerId,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Publish video failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_publish_carousel ────────────────────────────────
  server.tool(
    "threads_publish_carousel",
    "Publish a carousel post on Threads with 2-20 images/videos.",
    {
      items: z.array(z.object({
        type: z.enum(["IMAGE", "VIDEO"]).describe("Media type"),
        url: z.string().url().describe("Public HTTPS URL"),
        alt_text: z.string().max(1000).optional().describe("Alt text for this item"),
      })).min(2).max(20).describe("Array of media items"),
      text: z.string().max(500).optional().describe("Caption text"),
      reply_control: z.enum(["everyone", "accounts_you_follow", "mentioned_only", "parent_post_author_only", "followers_only"]).optional().describe("Who can reply"),
      topic_tag: z.string().max(50).optional().describe("Topic tag for the post"),
      quote_post_id: z.string().optional().describe("ID of a post to quote"),
      enable_reply_approvals: z.boolean().optional().describe("Require replies to be approved before they're published"),
      location_id: z.string().optional().describe("Location ID to tag (from threads_search_locations)"),
      crossreshare_to_ig: z.boolean().optional().describe("Also share this post to the user's linked Instagram account as a Story"),
      crossreshare_to_ig_dark_mode: z.boolean().optional().describe("Cross-share to Instagram Stories in dark mode"),
    },
    async ({ items, text, reply_control, topic_tag, quote_post_id, enable_reply_approvals, location_id, crossreshare_to_ig, crossreshare_to_ig_dark_mode }) => {
      try {
        const childIds: string[] = [];
        for (const item of items) {
          const params: Record<string, unknown> = { media_type: item.type, is_carousel_item: true };
          if (item.type === "IMAGE") {
            params.image_url = item.url;
          } else {
            params.video_url = item.url;
          }
          if (item.alt_text) params.alt_text = item.alt_text;
          const { data: child } = await client.threads("POST", `/${client.threadsUserId}/threads`, params);
          const childId = (child as { id: string }).id;
          await waitForThreadsContainer(client, childId);
          childIds.push(childId);
        }
        const carouselParams: Record<string, unknown> = {
          media_type: "CAROUSEL",
          children: childIds.join(","),
        };
        if (text) carouselParams.text = text;
        if (reply_control) carouselParams.reply_control = reply_control;
        if (topic_tag) carouselParams.topic_tag = topic_tag;
        if (quote_post_id) carouselParams.quote_post_id = quote_post_id;
        if (enable_reply_approvals) carouselParams.enable_reply_approvals = true;
        if (location_id) carouselParams.location_id = location_id;
        if (crossreshare_to_ig) carouselParams.crossreshare_to_ig = true;
        if (crossreshare_to_ig_dark_mode) carouselParams.crossreshare_to_ig_dark_mode = true;
        const { data: carousel } = await client.threads("POST", `/${client.threadsUserId}/threads`, carouselParams);
        const carouselId = (carousel as { id: string }).id;
        const { data, rateLimit } = await client.threads("POST", `/${client.threadsUserId}/threads_publish`, {
          creation_id: carouselId,
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Publish carousel failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_delete_post ──────────────────────────────────────
  server.tool(
    "threads_delete_post",
    "Delete a Threads post. This action is irreversible. Rate limited to 100 deletions per 24 hours.",
    {
      post_id: z.string().describe("Threads post ID to delete"),
    },
    async ({ post_id }) => {
      try {
        const { data, rateLimit } = await client.threads("DELETE", `/${post_id}`);
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Delete post failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_container_status ────────────────────────────
  server.tool(
    "threads_get_container_status",
    "Check the processing status of a Threads media container.",
    {
      container_id: z.string().describe("Container ID to check"),
    },
    async ({ container_id }) => {
      try {
        const { data, rateLimit } = await client.threads("GET", `/${container_id}`, {
          fields: "id,status,error_message",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get container status failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_publishing_limit ────────────────────────────
  server.tool(
    "threads_get_publishing_limit",
    "Check how many posts you can still publish within the current 24-hour window (max 250 posts/day).",
    {},
    async () => {
      try {
        const { data, rateLimit } = await client.threads("GET", `/${client.threadsUserId}/threads_publishing_limit`, {
          fields: "quota_usage",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get publishing limit failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
