import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { test } from "node:test";

const { renderSitemap, sitemapIndex, sitemapPage, sitemapUnavailable } = await import(
  "./sitemap.ts"
);

test("video XML escapes text and query parameters and uses stable media URLs", () => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.lectum.com.br";
  const xml = renderSitemap([
    {
      path: "/post?reel=a&reelPost=b",
      modified: "2026-11-24T12:00:00Z",
      video: {
        title: 'A < B & "C"',
        description: "Public\u0001 description",
        thumbnail: "/api/public/seo/community-post/slug/post/videos/reply/thumbnail",
        content: "/api/public/seo/community-post/slug/post/videos/reply/content",
        published: "2026-11-20T12:00:00Z",
      },
    },
  ]);
  assert.match(xml, /reel=a&amp;reelPost=b/);
  assert.match(xml, /A &lt; B &amp; &quot;C&quot;/);
  assert.match(
    xml,
    /<video:content_loc>https:\/\/api.lectum.com.br\/api\/public\/seo\/community-post\//,
  );
  assert.match(xml, /<lastmod>2026-11-24T12:00:00Z/);
  assert.doesNotMatch(xml, /focusReplyId/);
  assert.ok(xml.includes("<video:description>Public description</video:description>"));
});
test("static URLs do not invent a modification timestamp", async () => {
  const xml = await sitemapPage("static-0.xml");
  assert.equal((xml.match(/<url>/g) || []).length, 4);
  assert.doesNotMatch(xml, /lastmod/);
  assert.equal(await sitemapPage("unknown-0.xml"), null);
  assert.equal(await sitemapPage("posts--1.xml"), null);
});
test("index includes every partition, fetches anonymously and does not cache upstream failures", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    assert.equal(options.credentials, "omit");
    assert.equal(options.cache, "no-store");
    return Response.json({
      success: true,
      data: [
        { kind: "posts", pages: 3 },
        { kind: "videos", pages: 2 },
      ],
    });
  });
  const xml = await sitemapIndex();
  assert.equal((xml.match(/<sitemap>/g) || []).length, 6);
  assert.match(xml, /posts-2.xml/);
  assert.match(xml, /videos-1.xml/);
  t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 503 }));
  await assert.rejects(sitemapIndex);
  const response = sitemapUnavailable();
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
test("invalid dates and excessive URL counts fail instead of publishing malformed XML", () => {
  assert.throws(() => renderSitemap([{ path: "/post", modified: "invalid" }]));
  assert.throws(() => renderSitemap([{ path: "//external.example" }]));
  assert.throws(() => renderSitemap(Array.from({ length: 50001 }, () => ({ path: "/" }))));
  assert.throws(() =>
    renderSitemap([
      {
        path: "/post",
        video: {
          title: "Video",
          description: "Description",
          published: "invalid",
          thumbnail: "/api/public/seo/community-post/thumbnail",
          content: "/api/public/seo/community-post/content",
        },
      },
    ]),
  );
});
