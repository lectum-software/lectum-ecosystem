import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function service({
  missingPost = false,
  selected = true,
  stream = false,
  playbackStatus = 200,
} = {}) {
  const calls = [];
  const post = {
    title: "Original",
    content: "Public context",
    createdAt: new Date("2026-11-23T12:00:00Z"),
  };
  const item = {
    id: "video1",
    reply_id: "video1",
    media_url: stream ? "asset:stream" : "https://cdn.test/video.mp4",
    thumbnail_url: "https://cdn.test/poster.jpg",
    title: "Reply",
    content: "Reply text",
    author: { name: "Professional" },
  };
  const dependencies = {
    "@/helpers/return": { send: (_res, data) => data, error500: () => ({ status: 500 }) },
    "@/helpers/translate": { error: () => ({ success: false }), msg: () => ({ success: true }) },
    "@/infra/database/prisma": {
      default: {
        community_post: {
          findFirst: async (query) => {
            calls.push(query);
            return missingPost ? null : post;
          },
        },
        post_reply: { findFirst: async () => ({ createdAt: new Date("2026-11-23T13:00:00Z") }) },
      },
    },
    "@/infra/video-stream/reference": {
      videoAssetIdFromReference: () => (stream ? "asset1" : null),
    },
    "@/modules/api/private/posts/repositories/queries/PostContentVideoRepository": {
      PostContentVideoRepository: class {
        async list(query) {
          calls.push(query);
          return { data: selected ? [item] : [] };
        }
      },
    },
    "@/modules/video-assets/captions/service": {
      readPublicCaptions: async (url) => {
        calls.push(url);
        return { reviewed: false, cues: [{ text: "Public transcript" }] };
      },
    },
    "@/modules/video-assets/service": {
      authorizePublicVideoAssetPlayback: async (...args) => {
        calls.push(args);
        return playbackStatus === 200
          ? {
              status: 200,
              data: {
                hls_url: "https://stream.test/manifest.m3u8",
                thumbnail_url: "https://stream.test/poster.jpg",
              },
            }
          : { status: playbackStatus };
      },
    },
  };
  const source = readFileSync(
    new URL("../src/modules/api/public/seo/community-post/use-cases/reel.ts", import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (!(name in dependencies)) throw new Error(name);
    return dependencies[name];
  }, exports);
  return { ...exports, calls };
}
test("watch uses published post and existing video eligibility, with exact transcript and date", async () => {
  const api = service();
  const result = await api.readPublicReel("geral", "post1", "video1");
  assert.deepEqual(api.calls[0].where, {
    id: "post1",
    deleted: false,
    status: "publicado",
    community: { slug: "geral", active: true, deleted: false },
  });
  assert.equal(api.calls[1].q.focusReplyId, "video1");
  assert.equal(result.post_content, "Public context");
  assert.equal(result.published_at, "2026-11-23T13:00:00.000Z");
  assert.equal(result.captions.cues[0].text, "Public transcript");
  assert.equal(
    result.canonical_path,
    "/comunidades/geral/publicacao/post1?reel=video1&reelPost=post1&reelReply=video1",
  );
  assert.equal("user_id" in result, false);
});
test("missing post, ineligible video and mismatched video fail closed", async () => {
  for (const options of [{ missingPost: true }, { selected: false }])
    assert.equal(await service(options).readPublicReel("geral", "post1", "video1"), null);
  assert.equal(await service().readPublicReel("geral", "post1", "different"), null);
});
test("stream retains guest authorization and never publishes signed playback as permanent contentUrl", async () => {
  const api = service({ stream: true });
  const result = await api.readPublicReel("geral", "post1", "video1");
  assert.deepEqual(api.calls[2], ["asset1"]);
  assert.equal(result.content_url, null);
  assert.match(result.thumbnail_path, /videos\/video1\/thumbnail$/);
  assert.equal(
    await service({ stream: true, playbackStatus: 404 }).readPublicReel("geral", "post1", "video1"),
    null,
  );
  await assert.rejects(
    service({ stream: true, playbackStatus: 503 }).readPublicReel("geral", "post1", "video1"),
  );
});
