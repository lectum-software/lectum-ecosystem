import "../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { QueryClient } from "@tanstack/react-query";
import keys from "../../cache/keys.ts";
import { updateReplyProfileVisibilityCache } from "./reply-profile-visibility-cache.ts";

// Cache-contract inputs only; no transport or endpoint replacement.
const item = (postId, replyId, hidden = false) => ({
  post: { id: postId, replies_count: 12 },
  reply: replyId ? { id: replyId, hidden_from_profile: hidden, replies_received_count: 3 } : null,
});
const page = (number, items) => ({
  data: items,
  items,
  page: number,
  pages: 2,
  count: 4,
  total: 4,
  limit: 2,
});
const result = (hidden) => ({ post_id: "post", reply_id: "target", hidden_from_profile: hidden });

test("visibility updates both mine aliases without removing replies or changing counts", () => {
  const old = page(1, [item("post", "target"), item("post", "sibling")]);
  const before = structuredClone(old);
  const hidden = updateReplyProfileVisibilityCache(old, result(true));
  for (const alias of ["data", "items"]) {
    assert.equal(hidden[alias][0].reply.hidden_from_profile, true);
    assert.equal(hidden[alias][1], old[alias][1]);
    assert.equal(hidden[alias][0].post, old[alias][0].post);
    assert.equal(hidden[alias][0].reply.replies_received_count, 3);
    assert.equal(hidden[alias].length, 2);
  }
  for (const key of ["page", "pages", "count", "total", "limit"])
    assert.equal(hidden[key], old[key]);
  assert.deepEqual(old, before);
  const shown = updateReplyProfileVisibilityCache(hidden, result(false));
  assert.equal(shown.data[0].reply.hidden_from_profile, false);
  assert.equal(shown.items[0].reply.hidden_from_profile, false);
});

test("post and reply ids must both match; post publications and siblings remain untouched", () => {
  const entries = [item("other-post", "target"), item("post", "other-reply"), item("post", null)];
  const updated = updateReplyProfileVisibilityCache(page(1, entries), result(true));
  for (const [index, original] of entries.entries()) {
    assert.equal(updated.data[index], original);
    assert.equal(updated.items[index], original);
  }
});

test("real QueryClient updates flat and infinite mine caches, not saved or public caches", () => {
  const client = new QueryClient();
  const flatKey = keys.posts.mine({ type: "replies" });
  const infiniteKey = keys.posts.mine({ type: "all", mode: "infinite" });
  const savedKey = keys.posts.saved({ type: "replies" });
  const publicKey = keys.directory.psychologist("professional");
  const first = page(1, [item("post", "sibling")]);
  const second = page(2, [item("post", "target")]);
  client.setQueryData(flatKey, second);
  client.setQueryData(infiniteKey, { pages: [first, second], pageParams: [1, 2] });
  client.setQueryData(savedKey, second);
  client.setQueryData(publicKey, second);
  try {
    for (const hidden of [true, false]) {
      client.setQueriesData({ queryKey: keys.posts.mine() }, (old) =>
        updateReplyProfileVisibilityCache(old, result(hidden)),
      );
      assert.equal(client.getQueryData(flatKey).items[0].reply.hidden_from_profile, hidden);
      const infinite = client.getQueryData(infiniteKey);
      assert.equal(infinite.pages[1].data[0].reply.hidden_from_profile, hidden);
      assert.equal(infinite.pages[1].items[0].reply.hidden_from_profile, hidden);
      assert.equal(infinite.pages[0].items[0].reply.hidden_from_profile, false);
      assert.deepEqual(infinite.pageParams, [1, 2]);
      assert.equal(infinite.pages[1].total, 4);
      assert.equal(client.getQueryData(savedKey).items[0].reply.hidden_from_profile, false);
      assert.equal(client.getQueryData(publicKey).items[0].reply.hidden_from_profile, false);
    }
  } finally {
    client.clear();
  }
});

test("empty caches and legacy replies without visibility remain compatible", () => {
  assert.equal(updateReplyProfileVisibilityCache(undefined, result(true)), undefined);
  assert.deepEqual(updateReplyProfileVisibilityCache(page(1, []), result(true)), page(1, []));
  const infinite = { pages: [], pageParams: [] };
  assert.deepEqual(updateReplyProfileVisibilityCache(infinite, result(true)), infinite);
  const legacy = { post: { id: "post" }, reply: { id: "target" } };
  const updated = updateReplyProfileVisibilityCache(page(1, [legacy]), result(true));
  assert.equal(updated.items[0].reply.hidden_from_profile, true);
  assert.equal(legacy.reply.hidden_from_profile, undefined);
});

test("successful mutation cancels stale mine queries before patching and invalidates profile and mine", () => {
  const source = readFileSync(new URL("./reply-profile-visibility.ts", import.meta.url), "utf8");
  assert.match(source, /mutationFn: setReplyProfileVisibility/);
  assert.match(source, /onSuccess: async \(data\)/);
  assert.ok(
    source.indexOf("await queryClient.cancelQueries") <
      source.indexOf("queryClient.setQueriesData"),
  );
  assert.match(source, /updateReplyProfileVisibilityCache\(old, data\)/);
  assert.match(source, /invalidateDirectoryPsychologistQueries\(queryClient\)/);
  assert.match(
    source,
    /await queryClient.invalidateQueries\(\{ queryKey: keys.posts.mine\(\) \}\)/,
  );
  assert.doesNotMatch(source, /onMutate|setQueryData.*directory/);
  const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");
  assert.match(queries, /query.queryKey\[0\] === "directory_psychologist"/);
});

test("request contract is PUT hidden and rejects mismatched response identity or visibility", () => {
  const source = readFileSync(
    new URL("../../req/posts/reply-profile-visibility.ts", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /route: "\/api\/private\/posts\/:id\/replies\/:replyId\/profile-visibility"/,
  );
  assert.match(source, /method: "PUT"/);
  assert.match(source, /body: \{ hidden: input.hidden \}/);
  assert.match(source, /response.post_id !== input.postId/);
  assert.match(source, /response.reply_id !== input.replyId/);
  assert.match(source, /response.hidden_from_profile !== input.hidden/);
  assert.match(source, /hideError: true/);
});
