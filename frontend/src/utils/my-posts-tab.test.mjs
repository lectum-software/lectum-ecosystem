import assert from "node:assert/strict";
import test from "node:test";
import { myPostsTabHref, resolveMyPostsTab } from "./my-posts-tab.ts";

test("honors either explicit tab for both account roles", () => {
  for (const professional of [true, false]) {
    for (const type of ["posts", "replies"]) {
      assert.equal(resolveMyPostsTab(type, professional), type);
    }
  }
});

test("missing and invalid selections use the account default", () => {
  for (const value of [null, "", "all", "invalid"]) {
    assert.equal(resolveMyPostsTab(value, true), "replies");
    assert.equal(resolveMyPostsTab(value, false), "posts");
  }
});

test("the history URL restores a non-default tab and preserves unrelated parameters", () => {
  const original = myPostsTabHref("/app/posts/mine", "other=keep&type=posts", "replies");
  const restored = new URL(original, "https://example.test");
  assert.equal(restored.searchParams.get("other"), "keep");
  assert.deepEqual(restored.searchParams.getAll("type"), ["replies"]);
  assert.equal(resolveMyPostsTab(restored.searchParams.get("type"), false), "replies");
});
