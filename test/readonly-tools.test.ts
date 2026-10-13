import test from "node:test";
import assert from "node:assert/strict";
import { READ_ONLY_TOOLS, registerReadOnlyIgTools } from "../src/http/readonly.js";
import { MetaClient } from "../src/services/meta-client.js";

function fakeServer() {
  const registered: string[] = [];
  return {
    registered,
    tool: (name: string, ..._rest: unknown[]) => {
      registered.push(name);
    },
  };
}

const client = new MetaClient({
  appId: "", appSecret: "",
  instagramAccessToken: "tok", instagramUserId: "1",
  instagramMessagingAccessToken: "", instagramPageId: "",
  threadsAccessToken: "", threadsUserId: "",
});

test("hosted entrypoint registers exactly the read-only allowlist", () => {
  const server = fakeServer();
  registerReadOnlyIgTools(server as never, client);
  assert.deepEqual(new Set(server.registered), new Set(READ_ONLY_TOOLS));
  // No duplicates.
  assert.equal(server.registered.length, READ_ONLY_TOOLS.size);
});

test("no write, delete, messaging, token or webhook tool slips through", () => {
  const server = fakeServer();
  registerReadOnlyIgTools(server as never, client);
  const banned = [
    "ig_post_comment", "ig_reply_to_comment", "ig_hide_comment", "ig_delete_comment",
    "ig_delete_media", "ig_toggle_comments", "ig_send_message",
    "ig_publish_photo", "ig_publish_video", "ig_publish_carousel",
    "ig_respond_collaboration_invite", "ig_business_discovery",
    "meta_subscribe_webhook", "meta_exchange_token",
  ];
  for (const name of banned) {
    assert.ok(!server.registered.includes(name), `${name} must not be registered`);
  }
  for (const name of server.registered) {
    assert.ok(name.startsWith("ig_get_"), `${name} is not a read tool`);
  }
});
