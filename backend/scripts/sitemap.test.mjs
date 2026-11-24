import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load({ rows = [], reel = null, fail = false } = {}) {
  const queries = [];
  const reelCalls = [];
  const table = {
    count: async () => 501,
    findMany: async (query) => {
      queries.push(query);
      return rows;
    },
  };
  const dependencies = {
    "@/infra/database/prisma": {
      default: {
        community: table,
        user: table,
        community_post: table,
        post_reply: table,
      },
    },
    "../../psychologist/use-cases/services": {
      publishedPsychologistWhere: () => ({ active: true, deleted: false }),
    },
    "../../community-post/use-cases/reel": {
      readPublicReel: async (...args) => {
        reelCalls.push(args);
        if (fail) throw new Error("unavailable");
        return reel;
      },
    },
  };
  const source = readFileSync(
    new URL("../src/modules/api/public/seo/sitemap/use-cases/services.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  new Function("require", "exports", compiled)((id) => {
    assert.ok(id in dependencies, id);
    return dependencies[id];
  }, exports);
  return { ...exports, queries, reelCalls };
}

test("manifest partitions every catalog and next pages retain visibility filters", async () => {
  const api = load();
  assert.deepEqual(
    (await api.sitemapManifest()).map((x) => x.pages),
    [2, 2, 2, 26, 51],
  );
  await api.sitemapEntries("posts", 1);
  assert.equal(api.queries[0].skip, 500);
  assert.equal(api.queries[0].take, 500);
  assert.equal(api.queries[0].where.status, "publicado");
  assert.equal(api.queries[0].where.deleted, false);
  assert.deepEqual(api.queries[0].where.community, { active: true, deleted: false });
});

test("post videos preserve media IDs, omit images and support legacy single media", async () => {
  const api = load({
    rows: [
      {
        id: "mixed",
        community: { slug: "public" },
        media_type: "image",
        media_items: [
          { id: "photo", media_type: "image" },
          { id: "clip", media_type: "video" },
        ],
      },
      { id: "legacy", community: { slug: "public" }, media_type: "video", media_items: [] },
    ],
  });
  await api.sitemapEntries("post-videos", 0);
  assert.deepEqual(api.reelCalls, [
    ["public", "mixed", "clip"],
    ["public", "legacy", "legacy"],
  ]);
  assert.equal(api.queries[0].take, 10);
});

test("post lastmod uses persisted dates, including replies", async () => {
  const api = load({
    rows: [
      {
        id: "post",
        community: { slug: "public" },
        updatedAt: new Date("2026-01-01"),
        replies: [{ updatedAt: new Date("2026-02-01") }],
      },
    ],
  });
  assert.deepEqual(await api.sitemapEntries("posts", 0), [
    {
      path: "/comunidades/public/publicacao/post",
      modified: "2026-02-01T00:00:00.000Z",
    },
  ]);
});

test("video entries reuse watch eligibility and never serialize signed media", async () => {
  const rows = [{ id: "reply", post_id: "post", post: { community: { slug: "public" } } }];
  const reel = {
    canonical_path: "/watch",
    video_title: "Answer",
    post_title: "Question",
    professional_name: "Full Professional Name",
    video_content: "Description",
    thumbnail_path: "/stable/thumbnail",
    content_path: "/stable/content",
    published_at: "2026-01-01T00:00:00Z",
    hls_url: "https://private.invalid/signed",
  };
  const entries = await load({ rows, reel }).sitemapEntries("videos", 0);
  assert.equal(entries[0].video.title, "Answer | Full Professional Name");
  assert.equal(entries[0].video.content, "/stable/content");
  assert.ok(!JSON.stringify(entries).includes("signed"));
  assert.deepEqual(await load({ rows }).sitemapEntries("videos", 0), []);
  assert.deepEqual(
    await load({
      rows,
      reel: {
        ...reel,
        video_content: " ",
        post_content: "",
        post_title: "",
      },
    }).sitemapEntries("videos", 0),
    [],
  );
  await assert.rejects(load({ rows, fail: true }).sitemapEntries("videos", 0), /unavailable/);
});
