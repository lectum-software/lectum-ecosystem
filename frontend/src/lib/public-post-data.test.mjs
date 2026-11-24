import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";

const { getPublicPostData } = await import("./public-post-data.ts");

function setup(t, { slug = "general", unavailable = false } = {}) {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  process.env.NEXT_PUBLIC_API_URL = "https://api.lectum.com.br";
  t.after(() => {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  });
  const requests = [];
  const reference = "/api/public/video-assets/asset1234/playback";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    const data = String(url).includes("/video-assets/")
      ? { captions: { cues: [{ text: "Full transcript" }] } }
      : String(url).includes("/thread")
        ? { id: "reply", media_url: reference, replies: [] }
        : String(url).includes("/replies?")
          ? {
              data: [{ id: "reply", media_url: reference, replies: [] }],
              page: 1,
              pages: 1,
              count: 1,
            }
          : {
              post: {
                id: "post",
                content: "Full post",
                community: { slug },
                media_url: null,
                media_items: [],
              },
            };
    return Response.json({ success: !unavailable, data }, { status: unavailable ? 503 : 200 });
  });
  return requests;
}

test("SSR seeds exact UI keys and public captions without forwarding credentials", async (t) => {
  const requests = setup(t);
  const result = await getPublicPostData("post", "general");
  assert.deepEqual(
    result.queries.map((q) => q.queryKey),
    [
      ["posts", "post", "detail"],
      ["posts", "post", "replies", { page: 1, limit: 8 }],
      ["video_asset_playback", "asset1234", "anonymous"],
    ],
  );
  assert.equal(result.queries[0].data.post.content, "Full post");
  assert.equal(result.queries[2].data.captions.cues[0].text, "Full transcript");
  for (const { options } of requests) {
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    assert.deepEqual(options.headers, { Accept: "application/json" });
  }
});

test("reply thread hydration preserves the query response envelope", async (t) => {
  setup(t);
  const result = await getPublicPostData("post", "general", "reply");
  assert.deepEqual(result.queries[1].queryKey, ["posts", "post", "reply-thread", "reply"]);
  assert.equal(result.queries[1].data.reply.id, "reply");
});

test("mismatched community is not hydrated", async (t) => {
  const requests = setup(t, { slug: "other" });
  assert.equal(await getPublicPostData("post", "general"), null);
  assert.equal(requests.length, 1);
});

test("upstream failure does not fabricate public data", async (t) => {
  setup(t, { unavailable: true });
  assert.equal(await getPublicPostData("post", "general"), null);
});
