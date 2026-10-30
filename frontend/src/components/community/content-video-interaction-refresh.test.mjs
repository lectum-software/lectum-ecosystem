import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { registerContentVideoInteractionSyncCases } from "./content-video-interaction-sync-cases.mjs";

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

const {
  refreshContentVideoInteraction,
  subscribeContentVideoDiscussionChanges,
  contentVideoInteractionFailureState,
  isContentVideoInteractionBlocking,
} = await import("./content-video-interaction-refresh.ts");
const {
  contentVideoKey,
  updateContentVideoInteractionState,
  invalidateContentVideoDiscussion,
  appendContentVideoPage,
} = await import("./content-video-queue-interactions.ts");
const { createVotePostOptions } = await import("../../api/callers/posts/vote.ts");
const { createSaveReplyOptions } = await import("../../api/callers/posts/reply-mutations.ts");
const { default: keys } = await import("@/api/cache/keys");

registerContentVideoInteractionSyncCases();

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

test("refresh keeps all video descendants separate from direct children and sibling videos", async () => {
  const { client, target, entity, reads } = setup("video");
  entity.replies_count = 1;
  entity.descendants_count = 2;
  const sibling = { ...target, reply_id: "sibling-video", replies_count: 9, descendants_count: 30 };
  const queue = [{ ...target, replies_count: 1, descendants_count: 1 }, sibling];
  try {
    for (const total of [2, 3, 1, 0]) {
      entity.descendants_count = total;
      entity.replies_count = total ? 1 : 0;
      const patch = await refreshContentVideoInteraction(
        client,
        target,
        new AbortController().signal,
      );
      queue[0] = { ...queue[0], ...patch };
      assert.equal(queue[0].descendants_count, total, "canonical total follows creation/deletion");
      assert.equal(
        queue[0].replies_count,
        entity.replies_count,
        "direct count is not rewritten as total",
      );
      assert.equal(queue[1], sibling);
      assert.equal(queue[1].descendants_count, 30);
      assert.deepEqual(reads.at(-1), ["post", "video"]);
      const cached = client.getQueryData(["posts", "post", "reply-thread", "video"]);
      assert.equal(cached.reply.descendants_count, total);
    }
    const slide = readFileSync(new URL("./content-video-slide.tsx", import.meta.url), "utf8");
    assert.match(slide, /item\.descendants_count \?\? item\.replies_count/);
  } finally {
    client.clear();
  }
});

test("old backend counts and original video posts remain compatible", async () => {
  for (const replyId of ["video", null]) {
    const { client, target, entity } = setup(replyId);
    try {
      entity.replies_count = 12;
      const patch = await refreshContentVideoInteraction(
        client,
        target,
        new AbortController().signal,
      );
      assert.equal(patch.descendants_count, 12);
      assert.equal(patch.replies_count, 12);
    } finally {
      client.clear();
    }
  }
});

test("nested create/delete revalidates ancestor and original post only when activated without sibling counts", async () => {
  const { client, entity } = setup("b");
  const video = (id, replyId, total, postId = "post") => ({
    ...entity,
    id,
    post_id: postId,
    reply_id: replyId,
    media_item_id: replyId ? null : id,
    replies_count: 0,
    descendants_count: total,
  });
  let state = {
    items: [
      video("a", "a", 1),
      video("b", "b", 0),
      video("post-media", null, 2),
      video("sibling", "sibling", 0),
      video("unrelated", "unrelated", 9, "other-post"),
    ],
    revision: 0,
    staleInteractions: {},
  };
  const reads = [];
  let totals = { a: 2, b: 1, post: 3, sibling: 0 };
  globalThis.contentVideoRefreshApi.getPostReplyThread = async (postId, id) => {
    reads.push(id);
    assert.equal(postId, "post");
    return { reply: { ...entity, id, replies_count: 1, descendants_count: totals[id] } };
  };
  globalThis.contentVideoRefreshApi.getPostDetail = async (id) => {
    reads.push(id);
    return { post: { ...entity, id, replies_count: totals.post } };
  };
  const refresh = async (index, acknowledge = true) => {
    const item = state.items[index];
    const key = contentVideoKey(item);
    const token = state.staleInteractions[key];
    if (acknowledge && token === undefined) return;
    const patch = await refreshContentVideoInteraction(client, item, new AbortController().signal);
    state = updateContentVideoInteractionState(state, key, patch, acknowledge ? token : undefined);
  };
  try {
    for (const nextTotals of [
      { a: 2, b: 1, post: 3, sibling: 0 },
      { a: 1, b: 0, post: 2, sibling: 0 },
    ]) {
      totals = nextTotals;
      await refresh(1, false); // The sheet/inline composer has committed a nested create or delete.
      assert.equal(state.items[1].descendants_count, totals.b);
      assert.equal(state.items[4].descendants_count, 9);
      assert.equal(state.staleInteractions[contentVideoKey(state.items[4])], undefined);
      const revision = state.revision;
      const before = reads.length;
      await refresh(0);
      assert.equal(state.items[0].descendants_count, totals.a);
      await refresh(0);
      assert.equal(reads.length, before + 1, "returning to a fresh video does not fetch again");
      await refresh(2);
      assert.equal(state.items[2].descendants_count, totals.post);
      await refresh(3);
      assert.equal(
        state.items[3].descendants_count,
        0,
        "siblings use their own thread, not ancestor totals",
      );
      assert.equal(
        state.revision,
        revision,
        "activation reads cannot invalidate each other forever",
      );
      assert.deepEqual(state.staleInteractions, {});
    }
    assert.deepEqual(reads, ["b", "a", "post", "sibling", "b", "a", "post", "sibling"]);
  } finally {
    client.clear();
  }
});

test("late activation tokens cannot acknowledge newer mutations and vote/save patches do not dirty counts", () => {
  const first = {
    id: "a",
    post_id: "post",
    reply_id: "a",
    media_item_id: null,
    replies_count: 1,
    descendants_count: 1,
  };
  const second = { ...first, id: "b", reply_id: "b", replies_count: 0, descendants_count: 0 };
  let state = { items: [first, second], revision: 0, staleInteractions: {} };
  state = updateContentVideoInteractionState(state, contentVideoKey(second), { saved: true });
  assert.equal(state.revision, 0);
  assert.deepEqual(state.staleInteractions, {});
  state = updateContentVideoInteractionState(state, contentVideoKey(second), {
    descendants_count: 1,
  });
  const oldRevision = state.staleInteractions[contentVideoKey(first)];
  state = updateContentVideoInteractionState(state, contentVideoKey(second), {
    descendants_count: 2,
  });
  assert.equal(
    updateContentVideoInteractionState(
      state,
      contentVideoKey(first),
      { descendants_count: 2 },
      oldRevision,
    ),
    state,
  );
  const token = state.staleInteractions[contentVideoKey(first)];
  state = updateContentVideoInteractionState(
    state,
    contentVideoKey(first),
    { descendants_count: 3 },
    token,
  );
  assert.deepEqual(state.staleInteractions, {});
  const revision = state.revision;
  state = updateContentVideoInteractionState(state, contentVideoKey(second), {
    descendants_count: 2,
  });
  assert.equal(
    state.revision,
    revision,
    "opening and closing an unchanged sheet does not dirty other videos",
  );
});

test("a mismatched thread cannot overwrite the video's interaction or total", async () => {
  const { client, target, entity } = setup("video");
  globalThis.contentVideoRefreshApi.getPostReplyThread = async () => ({
    reply: { ...entity, id: "sibling-video", descendants_count: 99 },
  });
  try {
    await assert.rejects(
      refreshContentVideoInteraction(client, target, new AbortController().signal),
      /Unexpected content video interaction target/,
    );
  } finally {
    client.clear();
  }
});

test("pagination begun before a mutation marks newly appended videos stale without changing order", () => {
  const video = (id, postId = "post") => ({
    id,
    post_id: postId,
    reply_id: id,
    media_item_id: null,
    replies_count: 0,
    descendants_count: 0,
  });
  const first = video("a");
  const initial = { items: [first], revision: 0, staleInteractions: {} };
  const requestedRevision = initial.revision;
  const changed = invalidateContentVideoDiscussion(initial, "post");
  const appended = appendContentVideoPage(
    changed,
    [video("b"), video("c"), video("other", "other-post")],
    requestedRevision,
  );
  assert.deepEqual(
    appended.items.map((item) => item.id),
    ["a", "b", "c", "other"],
  );
  assert.equal(appended.items[0], first);
  for (const item of appended.items.slice(0, 3))
    assert.equal(appended.staleInteractions[contentVideoKey(item)], changed.revision);
  assert.equal(appended.staleInteractions[contentVideoKey(appended.items[3])], undefined);
  const freshPage = appendContentVideoPage(appended, [video("fresh")], changed.revision);
  assert.equal(freshPage.staleInteractions[contentVideoKey(freshPage.items.at(-1))], undefined);
});

test("confirmed zero-net create/delete events invalidate all branches even when ancestor total stays unchanged", async () => {
  const { client, entity } = setup("a");
  let state = {
    items: ["a", "b", "c"].map((id) => ({
      ...entity,
      id,
      post_id: "post",
      reply_id: id,
      media_item_id: null,
      descendants_count: 2,
    })),
    revision: 0,
    staleInteractions: {},
  };
  const unsubscribe = subscribeContentVideoDiscussionChanges(client, (postId) => {
    state = invalidateContentVideoDiscussion(state, postId);
  });
  try {
    for (const [action, variables] of [
      ["create-reply", { id: "post", body: { parent_reply_id: "b" } }],
      ["delete-reply", { postId: "post", replyId: "child-of-c" }],
    ]) {
      await client
        .getMutationCache()
        .build(client, { mutationKey: ["posts", action], mutationFn: async () => ({}) })
        .execute(variables);
    }
    assert.equal(state.revision, 2);
    const keyA = contentVideoKey(state.items[0]);
    state = updateContentVideoInteractionState(
      state,
      keyA,
      { descendants_count: 2 },
      state.staleInteractions[keyA],
    );
    assert.equal(state.staleInteractions[keyA], undefined);
    assert.equal(state.staleInteractions[contentVideoKey(state.items[1])], 2);
    assert.equal(state.staleInteractions[contentVideoKey(state.items[2])], 2);
    const unchanged = state;
    await client
      .getMutationCache()
      .build(client, { mutationKey: ["posts", "save-reply"], mutationFn: async () => ({}) })
      .execute({ postId: "post" });
    await assert.rejects(
      client
        .getMutationCache()
        .build(client, {
          mutationKey: ["posts", "delete-reply"],
          mutationFn: async () => {
            throw new Error("Rejected");
          },
        })
        .execute({ postId: "post" }),
    );
    assert.equal(state, unchanged, "failed writes and save/vote events cannot dirty counts");
    const mutations = readFileSync(
      new URL("../../api/callers/posts/reply-mutations.ts", import.meta.url),
      "utf8",
    );
    assert.match(mutations, /mutationKey: \["posts", "create-reply"\]/);
    assert.match(mutations, /mutationKey: \["posts", "delete-reply"\]/);
  } finally {
    unsubscribe();
    client.clear();
  }
});

test("deleted queued video's 404 is unavailable rather than a navigation-blocking retry loop", async () => {
  const { client, target } = setup("deleted-video");
  globalThis.contentVideoRefreshApi.getPostReplyThread = async () => {
    throw { response: { status: 404 } };
  };
  try {
    let failure;
    try {
      await refreshContentVideoInteraction(client, target, new AbortController().signal);
    } catch (error) {
      failure = error;
    }
    assert.ok(failure);
    const state = contentVideoInteractionFailureState(failure);
    assert.equal(state, "unavailable");
    assert.equal(isContentVideoInteractionBlocking(state), false);
    assert.equal(
      isContentVideoInteractionBlocking(
        contentVideoInteractionFailureState({ response: { status: 503 } }),
      ),
      true,
    );
    const slide = readFileSync(new URL("./content-video-slide.tsx", import.meta.url), "utf8");
    assert.match(slide, /isContentVideoInteractionBlocking\(interactionSync\)/);
    assert.match(slide, /activeRef.current = active && !unavailable/);
    assert.match(slide, /active=\{active && !unavailable\}/);
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
  const source = [
    "./content-video-viewer.tsx",
    "./content-video-slide.tsx",
    "./content-video-interaction-refresh.ts",
  ]
    .map((file) => readFileSync(new URL(file, import.meta.url), "utf8"))
    .join("\n");
  assert.match(source, /const \{ current_user_vote: vote, upvotes_count: upvotes, saved \} = item/);
  assert.match(source, /panel === "comments" && next !== "comments"/);
  assert.match(
    source,
    /if \(closingComments && !interactionRevision\) void refreshInteractions\(\)/,
  );
  assert.match(source, /onInteraction\(patch, token\)/);
  assert.match(source, /queue\.updateItem\(contentVideoKey\(video\), patch, revision\)/);
  assert.match(
    source,
    /interactionRevision=\{queue.staleInteractions\[contentVideoKey\(video\)\] \?\? 0\}/,
  );
  assert.match(
    source,
    /useContentVideoInteractionRevalidation\(active, revision, refreshInteractions/,
  );
  const refreshSource = readFileSync(
    new URL("./content-video-interaction-refresh.ts", import.meta.url),
    "utf8",
  );
  assert.match(refreshSource, /if \(!active \|\| !revision\) return/);
  assert.match(source, /onInteraction\(patch, token\)/);
  assert.match(
    source,
    /disabled=\{voteMutation\.isPending \|\| syncingInteractions \|\| unavailable\}/,
  );
  assert.match(source, /postSave\.isPending \|\| replySave\.isPending \|\| syncingInteractions/);
  assert.match(source, /syncController\.current\?\.abort\(\)/);
  assert.doesNotMatch(source, /useState\(item\.(current_user_vote|upvotes_count|saved)\)/);
});
