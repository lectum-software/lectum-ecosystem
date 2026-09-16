import assert from "node:assert/strict";
import test from "node:test";

const { varyCommunityFeedItems } = await import("./community-feed-variation.ts");

const createPost = (id) => ({
  created_at: "2026-09-15T00:00:00.000Z",
  id,
  status: "publicado",
});

test("mantem ordem original do feed sem seed de apresentacao", () => {
  const posts = ["post-1", "post-2", "post-3", "post-4"].map(createPost);

  assert.deepEqual(
    varyCommunityFeedItems(posts, 0).map((post) => post.id),
    ["post-1", "post-2", "post-3", "post-4"],
  );
});

test("aplica variacao leve em janelas sem remover posts do feed", () => {
  const posts = Array.from({ length: 10 }, (_, index) => createPost(`post-${index + 1}`));
  const varied = varyCommunityFeedItems(posts, 17);

  assert.equal(varied.length, posts.length);
  assert.deepEqual(
    [...varied.map((post) => post.id)].sort(),
    [...posts.map((post) => post.id)].sort(),
  );
  assert.notDeepEqual(
    varied.slice(0, 8).map((post) => post.id),
    posts.slice(0, 8).map((post) => post.id),
  );
  assert.deepEqual([...varied.slice(0, 4).map((post) => post.id)].sort(), [
    "post-1",
    "post-2",
    "post-3",
    "post-4",
  ]);
  assert.deepEqual([...varied.slice(4, 8).map((post) => post.id)].sort(), [
    "post-5",
    "post-6",
    "post-7",
    "post-8",
  ]);
});
