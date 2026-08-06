import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MetaClient } from "../../services/meta-client.js";

export function registerThreadsLocationTools(server: McpServer, client: MetaClient): void {
  // ─── threads_search_locations ────────────────────────────────
  server.tool(
    "threads_search_locations",
    "Search for locations to tag in a Threads post, by query text or by coordinates. Provide q, or latitude+longitude, or both.",
    {
      q: z.string().optional().describe("Query text to search for locations by"),
      latitude: z.number().optional().describe("Latitude of a location (must be used with longitude)"),
      longitude: z.number().optional().describe("Longitude of a location (must be used with latitude)"),
    },
    async ({ q, latitude, longitude }) => {
      try {
        const params: Record<string, unknown> = {};
        if (q) params.q = q;
        if (latitude !== undefined) params.latitude = latitude;
        if (longitude !== undefined) params.longitude = longitude;
        const { data, rateLimit } = await client.threads("GET", "/location_search", params);
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Search locations failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );

  // ─── threads_get_location ────────────────────────────────────
  server.tool(
    "threads_get_location",
    "Get a Threads location object by ID (from threads_search_locations or a post's location_id field).",
    {
      location_id: z.string().describe("Threads location ID"),
    },
    async ({ location_id }) => {
      try {
        const { data, rateLimit } = await client.threads("GET", `/${location_id}`, {
          fields: "id,name,address,city,country,latitude,longitude,postal_code",
        });
        return { content: [{ type: "text", text: JSON.stringify({ ...data as object, _rateLimit: rateLimit }, null, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: `Get location failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    }
  );
}
