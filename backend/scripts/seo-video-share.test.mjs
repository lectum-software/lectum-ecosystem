import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function load(mediaType = "video", mediaId = "media1") {
  const calls = [];
  const media = {
    id: mediaId,
    media_type: mediaType,
    media_url: "video-asset:asset1",
    thumbnail_url: null,
  };
  const post = {
    ...media,
    title: "Post",
    content: "Description",
    community: { slug: "general" },
    media_items: [media],
    createdAt: new Date(),
    updatedAt: new Date(),
    author: null,
  };
  const dependencies = {
    "@/helpers/translate": { error: () => ({}), msg: () => ({}) },
    "@/infra/database/prisma": {
      default: {
        community_post: { findFirst: async () => post },
        post_reply: { findFirst: async () => ({ ...post, post }) },
      },
    },
    "@/infra/video-stream": { isVideoAssetPlaybackReference: () => true },
    "@/utils/professional-name": { buildProfessionalFullDisplayName: () => "Professional" },
    "./transcripts": { readPostTranscripts: async () => [] },
    "@/modules/video-assets/captions/service": { readPublicCaptions: async () => null },
    "./reel": {
      readPublicReel: async (...args) => {
        calls.push(args);
        return {
          thumbnail_path: `/api/public/seo/community-post/${args[0]}/${args[1]}/videos/${args[2]}/thumbnail`,
        };
      },
    },
  };
  const source = readFileSync(
    new URL("../src/modules/api/public/seo/community-post/use-cases/services.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", compiled)(
    (name) => {
      assert.ok(dependencies[name], name);
      return dependencies[name];
    },
    module,
    module.exports,
  );
  return { ...module.exports, calls, post };
}

test("post video share uses authorized stable thumbnail without captions or invented dimensions", async () => {
  const service = load();
  const { data } = await service.showPost({ id: "post1", slug: "general" });
  assert.deepEqual(service.calls, [["general", "post1", "media1"]]);
  assert.equal(
    data.og_image_url,
    "/api/public/seo/community-post/general/post1/videos/media1/thumbnail",
  );
  assert.equal(data.og_image_height, null);
  assert.equal(data.og_image_width, null);
  assert.deepEqual(data.transcripts, []);
  service.post.media_items = [];
  await service.showPost({ id: "post1", slug: "general" });
  assert.equal(service.calls[1][2], "post1");
});

test("reply video uses its own thumbnail and does not borrow the parent image", async () => {
  const service = load();
  const { data } = await service.showReply({ id: "post1", slug: "general", replyId: "reply1" });
  assert.deepEqual(service.calls, [["general", "post1", "reply1"]]);
  assert.ok(data.og_image_url.endsWith("/reply1/thumbnail"));
});

test("image and text posts preserve their existing preview without a video lookup", async () => {
  for (const type of ["image", null]) {
    const service = load(type);
    const { data } = await service.showPost({ id: "post1", slug: "general" });
    assert.equal(data.og_image_url, type === "image" ? "video-asset:asset1" : null);
    assert.deepEqual(service.calls, []);
  }
});
