import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function service(pages, unavailable = new Set(), broken = false) {
  const queries = [],
    reads = [];
  const dependencies = {
    "@/infra/database/prisma": {
      default: {
        post_reply: {
          findMany: async (query) => {
            queries.push(query);
            return pages.shift() ?? [];
          },
        },
      },
    },
    "@/modules/video-assets/captions/service": {
      readPublicCaptions: async (reference) => {
        reads.push(reference);
        if (broken) throw new Error("database unavailable");
        return unavailable.has(reference)
          ? null
          : { language: "pt", reviewed: false, cues: [{ text: `Transcript ${reference}` }] };
      },
    },
  };
  const code = ts.transpileModule(
    readFileSync(
      new URL(
        "../src/modules/api/public/seo/community-post/use-cases/transcripts.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  ).outputText;
  const exports = {};
  new Function("require", "exports", code)((name) => {
    if (!(name in dependencies)) throw new Error(name);
    return dependencies[name];
  }, exports);
  return { ...exports, queries, reads };
}
const video = (id) => ({ id, title: id, media_type: "video", media_url: `asset:${id}` });
const post = {
  title: "Original post",
  media_type: "video",
  media_url: "asset:legacy",
  media_items: [video("a"), video("b"), { ...video("image"), media_type: "image" }],
};

test("all media and all reply pages are included, with no 30-item truncation", async () => {
  const api = service([Array.from({ length: 100 }, (_, i) => video(`r${i}`)), [video("nested")]]);
  const data = await api.readPostTranscripts("post", "general", post);
  assert.equal(data.length, 103);
  assert.equal(data.at(-1).text, "Transcript asset:nested");
  assert.equal(data.at(-1).url, "/comunidades/general/publicacao/post/resposta/nested");
  assert.equal(api.queries[1].cursor.id, "r99");
  assert.equal(api.queries[1].skip, 1);
  assert.equal(api.reads.includes("asset:image"), false);
  assert.equal(api.reads.includes("asset:legacy"), false);
  assert.deepEqual(api.queries[0].where, {
    post_id: "post",
    deleted: false,
    media_type: "video",
    media_url: { not: null },
    author: { active: true, deleted: false },
    post: {
      deleted: false,
      status: "publicado",
      community: { slug: "general", active: true, deleted: false },
    },
  });
  assert.equal("parent_reply_id" in api.queries[0].where, false);
});
test("duplicates and captions denied by the public reader are not exported", async () => {
  const api = service(
    [[video("a"), video("denied"), video("allowed")]],
    new Set(["asset:denied", "asset:b"]),
  );
  const data = await api.readPostTranscripts("post", "general", post);
  assert.deepEqual(
    data.map((item) => item.video_id),
    ["a", "allowed"],
  );
  assert.equal(api.reads.filter((ref) => ref === "asset:a").length, 1);
  assert.equal("professional" in data[0], false);
});
test("legacy media works and operational errors are not silently returned as a partial success", async () => {
  const legacy = { ...post, media_items: [] };
  const data = await service([]).readPostTranscripts("post", "general", legacy);
  assert.equal(data[0].text, "Transcript asset:legacy");
  await assert.rejects(service([], new Set(), true).readPostTranscripts("post", "general", post));
});
