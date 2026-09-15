import "../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";

const { default: keys } = await import("../../cache/keys.ts");
const { createVotePostOptions, applyVoteToCounts } = await import("./vote.ts");
const { createSavePostOptions } = await import("./post-mutations.ts");
const { createSaveReplyOptions } = await import("./reply-mutations.ts");

// Local cache contract only: real production lifecycle callbacks + real QueryClient.
// No mutationFn/queryFn is executed or replaced, no HTTP/server/DB/provider is simulated.
// These minimal, ephemeral cache values are test inputs, not integration evidence.
const postId = "cache-post";
const detailKey = keys.posts.detail(postId);
const pageKey = keys.posts.replies(postId, { page: 1 });
const secondPageKey = keys.posts.replies(postId, { page: 2 });
const threadKey = ["posts", postId, "reply-thread", "a"];
const leafThreadKey = ["posts", postId, "reply-thread", "b"];
const reply = (id, replies = []) => ({
  id,
  content: `cache ${id}`,
  current_user_vote: null,
  upvotes_count: 10,
  downvotes_count: 3,
  saved: false,
  replies,
});
const root = () => reply("a", [reply("b"), reply("c")]);

function cache(t) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  t.after(() => client.clear());
  client.setQueryData(detailKey, { post: { ...reply(postId), saves_count: 4 } });
  client.setQueryData(pageKey, { data: [root()], page: 1, pages: 2, count: 2 });
  client.setQueryData(secondPageKey, { data: [root()], page: 2, pages: 2, count: 2 });
  client.setQueryData(threadKey, { reply: root() });
  client.setQueryData(leafThreadKey, { reply: reply("b") });
  return client;
}

function findReply(replies, id) {
  for (const item of replies) {
    if (item.id === id) return item;
    const found = findReply(item.replies, id);
    if (found) return found;
  }
}
function entity(client, id, queryKey = id ? pageKey : detailKey) {
  const data = client.getQueryData(queryKey);
  return id ? findReply(data.data ?? [data.reply], id) : data.post;
}
function voteState(item) {
  return [item.current_user_vote, item.upvotes_count, item.downvotes_count];
}
function targetKeys(id) {
  return id === "b"
    ? [pageKey, secondPageKey, threadKey, leafThreadKey]
    : [pageKey, secondPageKey, threadKey];
}
function expectVote(client, id, expected) {
  for (const key of id ? targetKeys(id) : [detailKey]) {
    assert.deepEqual(voteState(entity(client, id, key)), expected, JSON.stringify(key));
  }
}
function expectSaved(client, id, saved) {
  for (const key of id ? targetKeys(id) : [detailKey]) {
    assert.equal(entity(client, id, key).saved, saved, JSON.stringify(key));
  }
}
function operation(client, kind, id, input = kind === "vote" ? 1 : false) {
  const options =
    kind === "vote"
      ? createVotePostOptions(client, postId)
      : id
        ? createSaveReplyOptions(client, postId, id)
        : createSavePostOptions(client, postId);
  const variables = kind === "vote" ? { value: input, ...(id ? { replyId: id } : {}) } : input;
  const callbackContext = { client, meta: undefined, mutationKey: undefined };
  let context;
  return {
    async start() {
      context = await options.onMutate(variables, callbackContext);
    },
    async fail() {
      await options.onError(new Error("local cache failure"), variables, context, callbackContext);
    },
    async success(patch = {}) {
      const data = {
        post_id: postId,
        target_type: id ? "reply" : "post",
        reply_id: id ?? null,
        ...(kind === "vote"
          ? { value: 1, upvotes_count: 21, downvotes_count: 2 }
          : { saved: true, saves_count: 9 }),
        ...patch,
      };
      await options.onSuccess(data, variables, context, callbackContext);
    },
    async settled() {
      await options.onSettled(undefined, null, variables, context, callbackContext);
    },
  };
}

for (const kind of ["vote", "save"]) {
  for (const id of [undefined, "a", "b"]) {
    test(`control: isolated ${kind} ${id ?? "post"} rollback restores its fields`, async (t) => {
      const client = cache(t);
      const before = structuredClone(client.getQueriesData({ queryKey: ["posts"] }));
      const op = operation(client, kind, id);
      await op.start();
      if (kind === "vote") expectVote(client, id, [1, 11, 3]);
      else expectSaved(client, id, true);
      await op.fail();
      assert.deepEqual(client.getQueriesData({ queryKey: ["posts"] }), before);
    });
    test(`control: isolated ${kind} ${id ?? "post"} success applies response`, async (t) => {
      const client = cache(t);
      const op = operation(client, kind, id);
      await op.start();
      await op.success();
      if (kind === "vote") expectVote(client, id, [1, 21, 2]);
      else {
        expectSaved(client, id, true);
        if (!id) assert.equal(entity(client).saves_count, 9);
      }
    });
  }
}

for (const [aKind, aId, bKind, bId] of [
  ["vote", "a", "vote", "b"],
  ["vote", "b", "vote", "a"],
  ["vote", undefined, "vote", "b"],
  ["vote", "b", "vote", undefined],
  ["save", "a", "save", "b"],
  ["save", "b", "save", "a"],
  ["vote", undefined, "save", undefined],
  ["save", undefined, "vote", undefined],
  ["vote", "b", "save", "b"],
  ["save", "b", "vote", "b"],
  ["save", "a", "vote", "b"],
  ["vote", "a", "save", "b"],
]) {
  test(`regression: ${aKind}/${aId ?? "post"} failure preserves ${bKind}/${bId ?? "post"} success`, async (t) => {
    const client = cache(t);
    const a = operation(client, aKind, aId);
    const b = operation(client, bKind, bId);
    await a.start();
    await b.start();
    await b.success();
    await a.fail();
    if (bKind === "vote") expectVote(client, bId, [1, 21, 2]);
    else {
      expectSaved(client, bId, true);
      if (!bId) assert.equal(entity(client).saves_count, 9);
    }
    if (aKind === "vote") expectVote(client, aId, [null, 10, 3]);
    else expectSaved(client, aId, false);
  });
}

for (const kind of ["vote", "save"]) {
  for (const id of [undefined, "b"]) {
    for (const olderResult of ["fail", "success"]) {
      test(`generation: older ${kind}/${id ?? "post"} ${olderResult} cannot undo newer success`, async (t) => {
        const client = cache(t);
        const older = operation(client, kind, id);
        const newer = operation(client, kind, id);
        await older.start();
        await newer.start();
        await newer.success();
        await older[olderResult](
          kind === "vote"
            ? { value: -1, upvotes_count: 2, downvotes_count: 8 }
            : { saved: false, saves_count: 2 },
        );
        if (kind === "vote") expectVote(client, id, [1, 21, 2]);
        else expectSaved(client, id, true);
      });
    }
    for (const order of [
      [0, 1],
      [1, 0],
    ]) {
      test(`generation: overlapping ${kind}/${id ?? "post"} both fail in order ${order}`, async (t) => {
        const client = cache(t);
        const before = structuredClone(client.getQueriesData({ queryKey: ["posts"] }));
        const ops = [operation(client, kind, id), operation(client, kind, id)];
        await ops[0].start();
        await ops[1].start();
        await ops[order[0]].fail();
        await ops[order[1]].fail();
        assert.deepEqual(client.getQueriesData({ queryKey: ["posts"] }), before);
      });
    }
    test(`generation: newer ${kind}/${id ?? "post"} failure restores older successful response`, async (t) => {
      const client = cache(t);
      const older = operation(client, kind, id);
      const newer = operation(client, kind, id);
      await older.start();
      await newer.start();
      await older.success();
      await newer.fail();
      if (kind === "vote") expectVote(client, id, [1, 21, 2]);
      else {
        expectSaved(client, id, true);
        if (!id) assert.equal(entity(client).saves_count, 9);
      }
    });
  }
}

test("control: vote toggle arithmetic keeps original semantics and clamps counts", () => {
  for (const current of [null, 1, -1]) {
    for (const value of [1, -1]) {
      const next = current === value ? null : value;
      assert.deepEqual(
        applyVoteToCounts(current, value, { upvotes_count: 10, downvotes_count: 3 }),
        {
          nextVote: next,
          upvotes_count: 10 + Number(next === 1) - Number(current === 1),
          downvotes_count: 3 + Number(next === -1) - Number(current === -1),
        },
      );
    }
  }
  assert.deepEqual(applyVoteToCounts(1, 1, { upvotes_count: 0 }), {
    nextVote: null,
    upvotes_count: 0,
    downvotes_count: 0,
  });
});

for (const kind of ["vote", "save"]) {
  test(`regression: ${kind} rollback preserves edits, pagination and inserted descendants`, async (t) => {
    const client = cache(t);
    const op = operation(client, kind, "a");
    await op.start();
    client.setQueryData(pageKey, (old) => ({
      ...old,
      count: 7,
      data: [
        { ...old.data[0], content: "new content", replies: [...old.data[0].replies, reply("new")] },
      ],
    }));
    await op.fail();
    assert.equal(client.getQueryData(pageKey).count, 7);
    assert.equal(entity(client, "a").content, "new content");
    assert.ok(entity(client, "new"));
  });
  for (const id of [undefined, "b"]) {
    test(`regression: ${kind}/${id ?? "post"} rollback does not resurrect removed query`, async (t) => {
      const client = cache(t);
      const key = id ? pageKey : detailKey;
      const op = operation(client, kind, id);
      await op.start();
      client.removeQueries({ queryKey: key, exact: true });
      await op.fail();
      assert.equal(client.getQueryData(key), undefined);
    });
    test(`regression: ${kind}/${id ?? "post"} rollback preserves newer cache fields`, async (t) => {
      const client = cache(t);
      const op = operation(client, kind, id);
      await op.start();
      const key = id ? pageKey : detailKey;
      const data = structuredClone(client.getQueryData(key));
      const item = id ? findReply(data.data, id) : data.post;
      Object.assign(
        item,
        kind === "vote"
          ? { current_user_vote: -1, upvotes_count: 33, downvotes_count: 7 }
          : { saved: false, saves_count: 30 },
      );
      client.setQueryData(key, data);
      await op.fail();
      assert.deepEqual(client.getQueryData(key), data);
    });
  }
}

test("control: uncached targets stay uncached on rollback/success", async (t) => {
  const client = cache(t);
  client.clear();
  for (const kind of ["vote", "save"]) {
    for (const id of [undefined, "b"]) {
      const failed = operation(client, kind, id);
      await failed.start();
      await failed.fail();
      const succeeded = operation(client, kind, id);
      await succeeded.start();
      await succeeded.success();
    }
  }
  assert.deepEqual(client.getQueriesData({}), []);
});

test("control: settled keeps existing invalidation families without network reads", async (t) => {
  const client = cache(t);
  client.setQueryData(keys.community.root(), []);
  client.setQueryData(keys.posts.saved(), []);
  client.setQueryData(keys.directory.psychologistRoot("local"), {});
  for (const [kind, id] of [
    ["vote", undefined],
    ["save", undefined],
    ["save", "b"],
  ]) {
    const op = operation(client, kind, id);
    await op.start();
    await op.success();
    await op.settled();
  }
  for (const key of [
    detailKey,
    pageKey,
    threadKey,
    keys.community.root(),
    keys.posts.saved(),
    keys.directory.psychologistRoot("local"),
  ]) {
    assert.equal(client.getQueryState(key).isInvalidated, true);
  }
});

for (const kind of ["vote", "save"]) {
  for (const id of [undefined, "b"]) {
    test(`generation: three overlapping ${kind}/${id ?? "post"} operations, every completion order/outcome`, async (t) => {
      const orders = [
        [0, 1, 2],
        [0, 2, 1],
        [1, 0, 2],
        [1, 2, 0],
        [2, 0, 1],
        [2, 1, 0],
      ];
      for (const order of orders) {
        for (let outcomes = 0; outcomes < 8; outcomes++) {
          const client = cache(t);
          const ops = Array.from({ length: 3 }, () => operation(client, kind, id));
          for (const op of ops) await op.start();
          const responses = Array.from({ length: 3 }, (_, index) =>
            kind === "vote"
              ? {
                  value: index === 1 ? -1 : 1,
                  upvotes_count: 20 + index,
                  downvotes_count: 5 + index,
                }
              : { saved: index !== 1, saves_count: 20 + index },
          );
          for (const index of order) {
            if (outcomes & (1 << index)) await ops[index].success(responses[index]);
            else await ops[index].fail();
          }
          const lastSuccess = [2, 1, 0].find((index) => outcomes & (1 << index));
          const expected = responses[lastSuccess];
          if (kind === "vote")
            expectVote(
              client,
              id,
              expected
                ? [expected.value, expected.upvotes_count, expected.downvotes_count]
                : [null, 10, 3],
            );
          else {
            expectSaved(client, id, expected?.saved ?? false);
            if (!id) assert.equal(entity(client).saves_count, expected?.saves_count ?? 4);
          }
          client.clear();
        }
      }
    });
    test(`regression: ${kind}/${id ?? "post"} does not restore snapshot into recreated query`, async (t) => {
      const client = cache(t);
      const key = id ? pageKey : detailKey;
      const op = operation(client, kind, id);
      await op.start();
      const recreated = structuredClone(client.getQueryData(key));
      client.removeQueries({ queryKey: key, exact: true });
      client.setQueryData(key, recreated);
      await op.fail();
      assert.deepEqual(client.getQueryData(key), recreated);
    });
    test(`regression: ${kind}/${id ?? "post"} invalidates both card list families`, async (t) => {
      const client = cache(t);
      const listKeys = [keys.posts.mine({ page: 1 }), keys.posts.saved({ page: 2 })];
      for (const key of listKeys) client.setQueryData(key, { items: [] });
      const op = operation(client, kind, id);
      await op.start();
      await op.fail();
      await op.settled();
      for (const key of listKeys) assert.equal(client.getQueryState(key).isInvalidated, true);
    });
  }
}

test("regression: rollback restores each query's own vote counts, not another page snapshot", async (t) => {
  const client = cache(t);
  const before = structuredClone(client.getQueryData(secondPageKey));
  before.data[0].replies[0].upvotes_count = 80;
  client.setQueryData(secondPageKey, before);
  const op = operation(client, "vote", "b");
  await op.start();
  await op.fail();
  assert.deepEqual(client.getQueryData(secondPageKey), before);
  assert.deepEqual(voteState(entity(client, "b")), [null, 10, 3]);
});

test("regression: overlapping clients and posts do not share generations", async (t) => {
  const first = cache(t);
  const second = cache(t);
  const older = operation(first, "vote", "b");
  const otherClient = operation(second, "vote", "b");
  await older.start();
  await otherClient.start();
  await otherClient.success();
  await older.fail();
  expectVote(first, "b", [null, 10, 3]);
  expectVote(second, "b", [1, 21, 2]);
  first.setQueryData(keys.posts.detail("another-post"), {
    post: { ...reply("another-post"), saves_count: 4 },
  });
  const same = operation(first, "save", undefined);
  const other = createSavePostOptions(first, "another-post");
  await same.start();
  const context = await other.onMutate(false, { client: first });
  await other.onSuccess(
    { post_id: "another-post", target_type: "post", reply_id: null, saved: true, saves_count: 40 },
    false,
    context,
    { client: first },
  );
  await same.fail();
  expectSaved(first, undefined, false);
  assert.equal(first.getQueryData(keys.posts.detail("another-post")).post.saves_count, 40);
});

test("control: nullable response counts retain cached values and unsave remains clamped", async (t) => {
  const client = cache(t);
  for (const id of [undefined, "b"]) {
    const vote = operation(client, "vote", id, -1);
    await vote.start();
    await vote.success({ value: -1, upvotes_count: 10, downvotes_count: null });
    expectVote(client, id, [-1, 10, 4]);
  }
  client.setQueryData(detailKey, (old) => ({ post: { ...old.post, saved: true, saves_count: 0 } }));
  const unsave = operation(client, "save", undefined, true);
  await unsave.start();
  await unsave.success({ saved: false, saves_count: null });
  assert.equal(entity(client).saves_count, 0);
  expectSaved(client, undefined, false);
});

for (const kind of ["vote", "save"]) {
  for (const id of [undefined, "b"]) {
    for (const lifecycle of ["remove", "clear"]) {
      test(`lifecycle: late ${kind}/${id ?? "post"} success ignores query recreated after ${lifecycle}`, async (t) => {
        const client = cache(t);
        const key = id ? pageKey : detailKey;
        const fresh = structuredClone(client.getQueryData(key));
        const op = operation(client, kind, id);
        await op.start();
        if (lifecycle === "clear") client.clear();
        else client.removeQueries({ queryKey: key, exact: true });
        client.setQueryData(key, fresh);
        await op.success();
        assert.deepEqual(client.getQueryData(key), fresh);
        await op.settled();
        assert.equal(client.getQueryState(key).isInvalidated, true);
        if (id && lifecycle === "remove") {
          const retained = entity(client, id, threadKey);
          if (kind === "vote") assert.deepEqual(voteState(retained), [1, 21, 2]);
          else assert.equal(retained.saved, true);
        }
      });
    }
    test(`lifecycle: ${kind}/${id ?? "post"} success leaves query first cached after begin to refetch`, async (t) => {
      const client = cache(t);
      const fresh = structuredClone(client.getQueryData(id ? pageKey : detailKey));
      const key = id ? keys.posts.replies(postId, { page: 3 }) : detailKey;
      if (!id) client.removeQueries({ queryKey: detailKey, exact: true });
      const op = operation(client, kind, id);
      await op.start();
      client.setQueryData(key, fresh);
      await op.success();
      assert.deepEqual(client.getQueryData(key), fresh);
      await op.settled();
      assert.equal(client.getQueryState(key).isInvalidated, true);
    });
    test(`lifecycle: ${kind}/${id ?? "post"} rollback never inherits predecessor receipt from another query lifetime`, async (t) => {
      const client = cache(t);
      const key = id ? pageKey : detailKey;
      const fresh = structuredClone(client.getQueryData(key));
      const older = operation(client, kind, id);
      await older.start();
      client.clear();
      client.setQueryData(key, fresh);
      const newer = operation(client, kind, id);
      await newer.start();
      await older.success();
      await newer.fail();
      assert.deepEqual(client.getQueryData(key), fresh);
    });
  }
}

for (const kind of ["vote", "save"]) {
  for (const id of [undefined, "a", "b"]) {
    for (const mismatch of [
      { post_id: "another-post" },
      { target_type: id ? "post" : "reply" },
      { reply_id: id ? "another-reply" : "unexpected-reply" },
    ]) {
      test(`receipt: ${kind}/${id ?? "post"} rejects ${Object.keys(mismatch)[0]} mismatch`, async (t) => {
        const client = cache(t);
        const before = structuredClone(client.getQueriesData({ queryKey: ["posts"] }));
        const op = operation(client, kind, id);
        await op.start();
        await op.success(mismatch);
        assert.deepEqual(client.getQueriesData({ queryKey: ["posts"] }), before);
        await op.settled();
        const valid = operation(client, kind, id);
        await valid.start();
        await valid.success();
        if (kind === "vote") expectVote(client, id, [1, 21, 2]);
        else expectSaved(client, id, true);
      });
    }
  }
}
