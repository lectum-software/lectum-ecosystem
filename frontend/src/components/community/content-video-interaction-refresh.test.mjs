import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

// Keep the real queries, mutation lifecycle and cache; replace only the network boundary.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/api/req/posts")
      return { url: "content-video-test:api", shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === "content-video-test:api")
      return {
        format: "module",
        shortCircuit: true,
        source: ["getPostDetail", "getPostReplyThread", "votePost", "saveReply", "unsaveReply"]
          .map(
            (name) =>
              `export const ${name} = (...args) => globalThis.contentVideoRefreshApi.${name}(...args);`,
          )
          .join("\n"),
      };
    return nextLoad(url, context);
  },
});

const { refreshContentVideoInteraction } = await import("./content-video-interaction-refresh.ts");
const { createVotePostOptions } = await import("../../api/callers/posts/vote.ts");
const { createSaveReplyOptions } = await import("../../api/callers/posts/reply-mutations.ts");
const { default: keys } = await import("@/api/cache/keys");

const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const setup = (replyId = "reply") => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const target = { post_id: "post", reply_id: replyId };
  const entity = {
    id: replyId ?? "post",
    current_user_vote: null,
    upvotes_count: 4,
    downvotes_count: 0,
    saved: false,
    replies_count: 2,
    replies: [],
  };
  const queryKey = replyId ? ["posts", "post", "reply-thread", replyId] : keys.posts.detail("post");
  client.setQueryData(queryKey, replyId ? { reply: { ...entity } } : { post: { ...entity } });
  const reads = [];
  globalThis.contentVideoRefreshApi = {
    getPostReplyThread: async (postId, id) => {
      reads.push([postId, id]);
      return { reply: { ...entity } };
    },
    getPostDetail: async (postId) => {
      reads.push([postId]);
      return { post: { ...entity } };
    },
    votePost: async () => {
      entity.current_user_vote = entity.current_user_vote === 1 ? null : 1;
      entity.upvotes_count += entity.current_user_vote === 1 ? 1 : -1;
      return {
        post_id: "post",
        reply_id: replyId,
        target_type: replyId ? "reply" : "post",
        value: entity.current_user_vote,
        upvotes_count: entity.upvotes_count,
        downvotes_count: 0,
      };
    },
    saveReply: async () => {
      entity.saved = true;
      return { saved: true, post_id: "post", reply_id: replyId, target_type: "reply" };
    },
    unsaveReply: async () => {
      entity.saved = false;
      return { saved: false, post_id: "post", reply_id: replyId, target_type: "reply" };
    },
  };
  return { client, target, entity, reads };
};

for (const replyId of ["reply", null]) {
  test(`comment vote then rail uses canonical state and intentional undo (${replyId ?? "post"})`, async () => {
    const { client, target, entity, reads } = setup(replyId);
    const queue = [{ ...target, ...entity }];
    try {
      const sheetVote = client
        .getMutationCache()
        .build(client, createVotePostOptions(client, "post"));
      await sheetVote.execute({ value: 1, ...(replyId ? { replyId } : {}) });
      assert.equal(queue[0].current_user_vote, null);
      const patch = await refreshContentVideoInteraction(
        client,
        target,
        new AbortController().signal,
      );
      queue[0] = { ...queue[0], ...patch };
      assert.equal(queue[0].current_user_vote, 1);
      assert.equal(queue[0].upvotes_count, 5);
      assert.equal(reads.length, 1);
      const railVote = client
        .getMutationCache()
        .build(client, createVotePostOptions(client, "post"));
      const receipt = await railVote.execute({ value: 1, ...(replyId ? { replyId } : {}) });
      queue[0] = {
        ...queue[0],
        current_user_vote: receipt.value,
        upvotes_count: receipt.upvotes_count,
      };
      assert.equal(queue[0].current_user_vote, null);
      assert.equal(queue[0].upvotes_count, 4);
    } finally {
      client.clear();
    }
  });
}

test("closing comments waits for pending save before reading; rail unsaves instead of saving again", async () => {
  const { client, target, reads } = setup();
  const gate = deferred();
  const started = deferred();
  const save = globalThis.contentVideoRefreshApi.saveReply;
  globalThis.contentVideoRefreshApi.saveReply = async () => {
    started.resolve();
    await gate.promise;
    return save();
  };
  try {
    const options = createSaveReplyOptions(client, "post", "reply");
    const pending = client.getMutationCache().build(client, options).execute(false);
    await started.promise;
    const refresh = refreshContentVideoInteraction(client, target, new AbortController().signal);
    await Promise.resolve();
    assert.equal(reads.length, 0);
    gate.resolve();
    await pending;
    const patch = await refresh;
    assert.equal(patch.saved, true);
    const receipt = await client.getMutationCache().build(client, options).execute(patch.saved);
    assert.equal(receipt.saved, false);
  } finally {
    client.clear();
  }
});

test("failed canonical read does not return the stale cached snapshot and can retry", async () => {
  const { client, target, entity } = setup();
  try {
    globalThis.contentVideoRefreshApi.getPostReplyThread = async () => {
      throw new Error("Offline");
    };
    await assert.rejects(
      refreshContentVideoInteraction(client, target, new AbortController().signal),
      /Offline/,
    );
    globalThis.contentVideoRefreshApi.getPostReplyThread = async () => ({
      reply: { ...entity, current_user_vote: 1, upvotes_count: 5, saved: true },
    });
    const result = await refreshContentVideoInteraction(
      client,
      target,
      new AbortController().signal,
    );
    assert.equal(result.saved, true);
    assert.equal(result.current_user_vote, 1);
  } finally {
    client.clear();
  }
});

test("unmount abort rejects a late result so it cannot patch another video", async () => {
  const { client, target, entity } = setup();
  const gate = deferred();
  const started = deferred();
  globalThis.contentVideoRefreshApi.getPostReplyThread = async () => {
    started.resolve();
    await gate.promise;
    return { reply: entity };
  };
  try {
    const controller = new AbortController();
    const refresh = refreshContentVideoInteraction(client, target, controller.signal);
    await started.promise;
    controller.abort();
    gate.resolve();
    await assert.rejects(refresh, { name: "AbortError" });
  } finally {
    client.clear();
  }
});

test("viewer refreshes on comments close, renders queue state and blocks stale toggles", () => {
  const source = ["./content-video-viewer.tsx", "./content-video-slide.tsx"]
    .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");
  assert.match(source, /const \{ current_user_vote: vote, upvotes_count: upvotes, saved \} = item/);
  assert.match(source, /panel === "comments" && next !== "comments"/);
  assert.match(source, /if \(closingComments\) void refreshInteractions\(\)/);
  assert.match(source, /onInteraction\(patch\)/);
  assert.match(
    source,
    /onInteraction=\{\(patch\) => queue\.updateItem\(contentVideoKey\(video\), patch\)\}/,
  );
  assert.match(source, /disabled=\{voteMutation\.isPending \|\| syncingInteractions\}/);
  assert.match(source, /postSave\.isPending \|\| replySave\.isPending \|\| syncingInteractions/);
  assert.match(source, /syncController\.current\?\.abort\(\)/);
  assert.doesNotMatch(source, /useState\(item\.(current_user_vote|upvotes_count|saved)\)/);
});
