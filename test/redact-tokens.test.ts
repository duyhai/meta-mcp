import test from "node:test";
import assert from "node:assert/strict";
import { redactAccessTokens } from "../src/services/redact.js";

test("access_token query params are redacted in paging URLs", () => {
  const input = {
    data: [{ id: "1" }],
    paging: {
      cursors: { before: "BEFORE", after: "AFTER" },
      next: "https://graph.facebook.com/v26.0/123/media?access_token=EAAXsecret123&fields=id&after=AFTER",
      previous:
        "https://graph.facebook.com/v26.0/123/media?fields=id&access_token=EAAXsecret456",
    },
  };
  const out = redactAccessTokens(input) as typeof input;
  assert.equal(
    out.paging.next,
    "https://graph.facebook.com/v26.0/123/media?access_token=REDACTED&fields=id&after=AFTER"
  );
  assert.equal(
    out.paging.previous,
    "https://graph.facebook.com/v26.0/123/media?fields=id&access_token=REDACTED"
  );
  // Cursors and data are untouched.
  assert.equal(out.paging.cursors.after, "AFTER");
  assert.deepEqual(out.data, [{ id: "1" }]);
});

test("nested paging (e.g. comments inside media) is redacted too", () => {
  const input = {
    data: [
      {
        id: "m1",
        comments: {
          data: [],
          paging: { next: "https://graph.facebook.com/x?access_token=EAAXdeep&limit=5" },
        },
      },
    ],
  };
  const out = redactAccessTokens(input) as any;
  assert.equal(
    out.data[0].comments.paging.next,
    "https://graph.facebook.com/x?access_token=REDACTED&limit=5"
  );
});

test("bare token strings outside URLs are left alone, non-objects pass through", () => {
  assert.equal(redactAccessTokens("plain text"), "plain text");
  assert.equal(redactAccessTokens(42), 42);
  assert.equal(redactAccessTokens(null), null);
  const arr = redactAccessTokens([{ access_token: "EAAXtop" }]) as any;
  // Literal access_token FIELDS are redacted as well (e.g. token-exchange responses).
  assert.equal(arr[0].access_token, "REDACTED");
});

test("error responses and non-JSON bodies are redacted (URL and quoted JSON forms)", async (t) => {
  const { redactTokenText } = await import("../src/services/redact.js");
  assert.equal(
    redactTokenText('{"error":{"message":"bad access_token=EAAXleak1 here"}}'),
    '{"error":{"message":"bad access_token=REDACTED here"}}'
  );
  assert.equal(
    redactTokenText('body {"access_token": "EAAXleak2", "ok":1}'),
    'body {"access_token": "REDACTED", "ok":1}'
  );

  const { MetaClient } = await import("../src/services/meta-client.js");
  const client = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "1",
    instagramMessagingAccessToken: "", instagramPageId: "", threadsAccessToken: "", threadsUserId: "",
  });
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });

  // !res.ok path: thrown error must not contain the token.
  globalThis.fetch = (async () => ({
    ok: false, status: 400,
    text: async () => 'Bad request for url?access_token=EAAXerrleak&x=1',
  })) as unknown as typeof fetch;
  await assert.rejects(client.ig("GET", "/x"), (e: Error) => {
    assert.match(e.message, /access_token=REDACTED/);
    assert.ok(!e.message.includes("EAAXerrleak"));
    return true;
  });

  // non-JSON body path: returned text must be redacted.
  globalThis.fetch = (async () => ({
    ok: true, status: 200,
    headers: new Headers({ "content-type": "text/plain" }),
    text: async () => 'done access_token=EAAXbodyleak',
  })) as unknown as typeof fetch;
  const { data } = await client.ig("GET", "/x");
  assert.equal(data, "done access_token=REDACTED");
});
