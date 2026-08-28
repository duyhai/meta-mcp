import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInstagramConversationParams,
  buildInstagramMessageBody,
  buildInstagramStoryParams,
  buildThreadsPollAttachment,
  buildThreadsTextEntities,
  buildThreadsUserInsightParams,
  buildTokenRefreshRequest,
} from "../src/services/api-contracts.js";

test("Instagram stories always use the STORIES media type", () => {
  assert.deepEqual(buildInstagramStoryParams("IMAGE", "https://example.com/a.jpg"), {
    media_type: "STORIES",
    image_url: "https://example.com/a.jpg",
  });
  assert.deepEqual(buildInstagramStoryParams("VIDEO", "https://example.com/a.mp4"), {
    media_type: "STORIES",
    video_url: "https://example.com/a.mp4",
  });
});

test("Threads poll options use the flat option_a through option_d contract", () => {
  assert.deepEqual(JSON.parse(buildThreadsPollAttachment(["A", "B", "C"])), {
    option_a: "A",
    option_b: "B",
    option_c: "C",
  });
  assert.throws(
    () => buildThreadsPollAttachment(["A", "x".repeat(26)]),
    /1 to 25 characters/
  );
});

test("Threads spoilers use text_entities with explicit offsets", () => {
  assert.deepEqual(JSON.parse(buildThreadsTextEntities("hello", true)!), [
    { entity_type: "SPOILER", offset: 0, length: 5 },
  ]);
  assert.deepEqual(
    JSON.parse(
      buildThreadsTextEntities("hello world", false, [{ offset: 6, length: 5 }])!
    ),
    [{ entity_type: "SPOILER", offset: 6, length: 5 }]
  );
  assert.throws(
    () => buildThreadsTextEntities("short", false, [{ offset: 3, length: 5 }]),
    /within the post text/
  );
  assert.throws(
    () =>
      buildThreadsTextEntities(
        "abcdefghijk",
        false,
        Array.from({ length: 11 }, (_, offset) => ({ offset, length: 1 }))
      ),
    /at most 10/
  );
});

test("Instagram messaging body retains nested JSON objects", () => {
  assert.deepEqual(buildInstagramMessageBody("recipient", "hello"), {
    recipient: { id: "recipient" },
    message: { text: "hello" },
    messaging_type: "RESPONSE",
  });
});

test("Instagram Facebook Login conversations explicitly select Instagram", () => {
  assert.deepEqual(buildInstagramConversationParams("inbox", 25, "cursor"), {
    platform: "instagram",
    fields: "id,updated_time,participants,messages{id,message,from,created_time}",
    folder: "inbox",
    limit: 25,
    after: "cursor",
  });
});

test("token refresh selects the platform-specific endpoint and parameters", () => {
  assert.deepEqual(buildTokenRefreshRequest("threads", "token", "", ""), {
    baseUrl: "https://graph.threads.net",
    path: "/refresh_access_token",
    token: "token",
    params: { grant_type: "th_refresh_token" },
  });

  assert.deepEqual(buildTokenRefreshRequest("instagram", "token", "app", "secret"), {
    baseUrl: "https://graph.facebook.com/v26.0",
    path: "/oauth/access_token",
    token: "token",
    params: {
      grant_type: "fb_exchange_token",
      client_id: "app",
      client_secret: "secret",
      fb_exchange_token: "token",
    },
  });
});

test("follower demographics require and forward a breakdown", () => {
  assert.throws(
    () => buildThreadsUserInsightParams("views,follower_demographics"),
    /breakdown is required/
  );
  assert.deepEqual(
    buildThreadsUserInsightParams(
      "follower_demographics",
      "100",
      "200",
      "country"
    ),
    {
      metric: "follower_demographics",
      since: "100",
      until: "200",
      breakdown: "country",
    }
  );
});
