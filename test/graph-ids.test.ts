import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { registerReadOnlyIgTools } from "../src/http/readonly.js";
import { MetaClient } from "../src/services/meta-client.js";
import { graphId } from "../src/tools/ids.js";

test("graphId accepts IG and FB ids, rejects path tricks", () => {
  for (const ok of ["17841471826045110", "537813076079863_122101", "1_2_3"]) {
    assert.ok(graphId().safeParse(ok).success, ok);
  }
  for (const bad of ["", "me", "1/../me", "1?fields=access_token", "1&x=1", "../537", "1/insights", "1_", "_1", " 1"]) {
    assert.ok(!graphId().safeParse(bad).success, `accepted ${JSON.stringify(bad)}`);
  }
});

test("every hosted tool with a path id validates it", () => {
  const client = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "1",
    instagramMessagingAccessToken: "", instagramPageId: "",
    threadsAccessToken: "", threadsUserId: "", facebookPageId: "9",
  });
  const schemas = new Map<string, Record<string, z.ZodTypeAny>>();
  registerReadOnlyIgTools({ tool: (name: string, _d: string, shape: Record<string, z.ZodTypeAny>) => {
    schemas.set(name, shape);
  } } as never, client);
  let checked = 0;
  for (const [name, shape] of schemas) {
    for (const key of ["media_id", "comment_id", "post_id"]) {
      if (!shape[key]) continue;
      checked++;
      assert.ok(!shape[key].safeParse("1/../me").success, `${name}.${key} accepts a path`);
      assert.ok(shape[key].safeParse("537_1").success, `${name}.${key} rejects a real id`);
    }
  }
  assert.ok(checked >= 8, `only ${checked} id params found`);
});

test("fb insight metric lists cannot break out of the field expansion", async () => {
  const { registerFbInsightTools } = await import("../src/tools/facebook/insights.js");
  const client = new MetaClient({
    appId: "", appSecret: "", instagramAccessToken: "tok", instagramUserId: "1",
    instagramMessagingAccessToken: "", instagramPageId: "",
    threadsAccessToken: "", threadsUserId: "", facebookPageId: "9",
  });
  const schemas = new Map<string, Record<string, z.ZodTypeAny>>();
  registerFbInsightTools({ tool: (name: string, _d: string, shape: Record<string, z.ZodTypeAny>) => {
    schemas.set(name, shape);
  } } as never, client);
  for (const name of ["fb_get_page_insights", "fb_get_post_insights"]) {
    const m = schemas.get(name)!.metric;
    assert.ok(m.safeParse("post_media_view,post_clicks").success);
    assert.ok(!m.safeParse("post_clicks),from,admin_creator").success, `${name} metric injection`);
  }
});
