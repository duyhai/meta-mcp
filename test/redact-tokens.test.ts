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
    instagramMessagingAccessToken: "", instagramPageId: "", threadsAccessToken: "", threadsUserId: "", facebookPageId: "9",
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

test("Facebook Page post/comment responses are redacted through the client", async (t) => {
  const { MetaClient } = await import("../src/services/meta-client.js");
  const fbClient = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "1",
    instagramMessagingAccessToken: "", instagramPageId: "",
    threadsAccessToken: "", threadsUserId: "", facebookPageId: "537",
  });
  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  globalThis.fetch = (async () => ({
    ok: true, status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({
      data: [{ id: "537_1", message: "post", comments: {
        data: [{ id: "c1", message: "hi" }],
        paging: { next: "https://graph.facebook.com/v26.0/537_1/comments?access_token=EAAXfbleak&after=X" },
      }}],
      paging: { next: "https://graph.facebook.com/v26.0/537/posts?access_token=EAAXfbleak2" },
    }),
  })) as unknown as typeof fetch;
  const { data } = await fbClient.ig("GET", `/${fbClient.facebookPageId}/posts`);
  const text = JSON.stringify(data);
  assert.ok(!text.includes("EAAXfbleak"), "token leaked in FB response");
  assert.match(text, /access_token=REDACTED/);
});

test("insights tool responses are redacted end to end", async (t) => {
  const { MetaClient } = await import("../src/services/meta-client.js");
  const { registerFbInsightTools } = await import("../src/tools/facebook/insights.js");
  const { registerIgProfileTools } = await import("../src/tools/instagram/profile.js");
  const { registerIgMediaTools } = await import("../src/tools/instagram/media.js");
  const insightsClient = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "178",
    instagramMessagingAccessToken: "", instagramPageId: "",
    threadsAccessToken: "", threadsUserId: "", facebookPageId: "537",
  });
  type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;
  const handlers = new Map<string, Handler>();
  const server = {
    tool: (name: string, ...rest: unknown[]) => { handlers.set(name, rest[rest.length - 1] as Handler); },
  };
  registerFbInsightTools(server as never, insightsClient);
  registerIgProfileTools(server as never, insightsClient);
  registerIgMediaTools(server as never, insightsClient);

  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    return {
      ok: true, status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: [{ name: "views", period: "day", values: [{ value: 3 }], id: "x/insights/views/day" }],
        insights: { data: [{ name: "post_media_view", period: "lifetime", values: [{ value: 9 }] }] },
        shares: { count: 2 },
        comments: { data: [], summary: { total_count: 5 } },
        paging: {
          previous: "https://graph.facebook.com/v26.0/537/insights?access_token=EAAXinsleak&since=1",
          next: "https://graph.facebook.com/v26.0/537/insights?access_token=EAAXinsleak2&until=2",
        },
      }),
    };
  }) as unknown as typeof fetch;

  const calls: [string, Record<string, unknown>][] = [
    ["fb_get_page_insights", { period: "week" }],
    ["fb_get_post_insights", { post_id: "537_1" }],
    ["ig_get_account_insights", { metric: "views,reach" }],
    ["ig_get_media_insights", { media_id: "m1" }],
  ];
  for (const [name, args] of calls) {
    const res = await handlers.get(name)!(args);
    assert.ok(!res.isError, `${name} errored: ${res.content[0].text}`);
    const text = res.content[0].text;
    assert.ok(!text.includes("EAAXinsleak"), `token leaked in ${name}`);
    // fb_get_post_insights returns lifetime values only, no paging.
    if (name !== "fb_get_post_insights") {
      assert.match(text, /access_token=REDACTED/, `${name} lost its paging`);
    }
  }

  // Defaults hit current (non-removed) metrics and the right endpoints.
  assert.match(urls[0], /\/537\/insights\?.*metric=page_media_view%2Cpage_total_media_view_unique/);
  assert.match(urls[0], /period=week/);
  // Post insights + counts in ONE request (field expansion).
  assert.match(decodeURIComponent(urls[1]), /\/537_1\?.*fields=insights\.metric\(post_media_view,.*\),shares,/);
  assert.match(urls[2], /\/178\/insights\?.*metric_type=total_value/);
  assert.match(urls[2], /period=day/);
  assert.equal(urls.length, 4);
  for (const u of urls) assert.ok(!/impressions/.test(u), `removed metric requested: ${u}`);

  const post = JSON.parse((await handlers.get("fb_get_post_insights")!({ post_id: "537_1" })).content[0].text);
  assert.deepEqual(post.counts, { shares: 2, comments: 5, reactions: null });
  assert.equal(post.data[0].name, "post_media_view");
  assert.equal(post.insights_error, undefined);
});

test("fb_get_post_insights keeps counts when the insights part fails", async (t) => {
  const { MetaClient } = await import("../src/services/meta-client.js");
  const { registerFbInsightTools } = await import("../src/tools/facebook/insights.js");
  const c = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "178",
    instagramMessagingAccessToken: "", instagramPageId: "",
    threadsAccessToken: "", threadsUserId: "", facebookPageId: "537",
  });
  type Handler = (args: Record<string, unknown>) => Promise<{ content: { text: string }[]; isError?: boolean }>;
  let handler: Handler | undefined;
  registerFbInsightTools({ tool: (name: string, ...rest: unknown[]) => {
    if (name === "fb_get_post_insights") handler = rest[rest.length - 1] as Handler;
  } } as never, c);

  const realFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = realFetch; });
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(url);
    if (decodeURIComponent(url).includes("insights.metric(")) {
      return { ok: false, status: 400, text: async () =>
        '{"error":{"message":"(#10) requires read_insights access_token=EAAXfailleak","code":10}}' };
    }
    return {
      ok: true, status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ comments: { data: [], summary: { total_count: 4 } }, reactions: { data: [], summary: { total_count: 7 } } }),
    };
  }) as unknown as typeof fetch;

  const res = await handler!({ post_id: "537_1" });
  assert.ok(!res.isError);
  const text = res.content[0].text;
  assert.ok(!text.includes("EAAXfailleak"), "token leaked via insights_error");
  const out = JSON.parse(text);
  assert.match(out.insights_error, /read_insights/);
  assert.deepEqual(out.data, []);
  assert.deepEqual(out.counts, { shares: 0, comments: 4, reactions: 7 });
  assert.equal(urls.length, 2);
});
