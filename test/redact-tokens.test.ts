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
