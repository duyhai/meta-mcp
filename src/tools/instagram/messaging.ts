import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";
import {
  buildInstagramConversationParams,
  buildInstagramMessageBody,
} from "../../services/api-contracts.js";

export function registerIgMessagingTools(server: McpServer, client: MetaClient): void {
  // ─── ig_get_conversations ────────────────────────────────────
  server.tool(
    "ig_get_conversations",
    "Get Instagram DM conversations using Instagram Messaging with Facebook Login. Requires a Page access token, the linked Facebook Page ID, instagram_manage_messages, and pages_manage_metadata.",
    {
      folder: z.enum(["inbox", "spam"]).optional().describe("Folder to retrieve (default: inbox)"),
      limit: z.number().optional().describe("Number of conversations"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ folder, limit, after }) => {
      try {
        const params = buildInstagramConversationParams(folder, limit, after);
        const { data, rateLimit } = await client.igMessaging(
          "GET",
          `/${client.instagramPageId}/conversations`,
          params
        );
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get conversations failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_get_messages ─────────────────────────────────────────
  server.tool(
    "ig_get_messages",
    "Get messages in a specific DM conversation.",
    {
      conversation_id: z.string().describe("Conversation ID"),
      limit: z.number().optional().describe("Number of messages"),
      after: z.string().optional().describe("Pagination cursor"),
    },
    async ({ conversation_id, limit, after }) => {
      try {
        const params: Record<string, unknown> = {
          fields: "id,message,from,created_time,attachments",
        };
        if (limit) params.limit = limit;
        if (after) params.after = after;
        const { data, rateLimit } = await client.igMessaging(
          "GET",
          `/${conversation_id}/messages`,
          params
        );
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get messages failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_send_message ─────────────────────────────────────────
  server.tool(
    "ig_send_message",
    "Send an Instagram DM using Instagram Messaging with Facebook Login. Requires a Page access token, instagram_manage_messages, and pages_manage_metadata. The recipient must have messaged the professional account first.",
    {
      recipient_id: z.string().describe("Instagram-scoped user ID of the recipient"),
      message: z.string().describe("Message text to send"),
    },
    async ({ recipient_id, message }) => {
      try {
        const { data, rateLimit } = await client.igMessaging(
          "POST",
          `/${client.instagramPageId}/messages`,
          buildInstagramMessageBody(recipient_id, message)
        );
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Send message failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── ig_get_message ──────────────────────────────────────────
  server.tool(
    "ig_get_message",
    "Get details of a specific DM message.",
    {
      message_id: z.string().describe("Message ID"),
    },
    async ({ message_id }) => {
      try {
        const { data, rateLimit } = await client.igMessaging("GET", `/${message_id}`, {
          fields: "id,message,from,created_time,attachments",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get message failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
