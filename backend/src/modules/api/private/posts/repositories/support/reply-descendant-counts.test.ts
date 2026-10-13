import assert from "node:assert/strict";
import test from "node:test";
import { countReplyDescendants } from "./reply-descendant-counts";

test("counts all levels without including the root or unrelated branches", () => {
  const counts = countReplyDescendants([
    { id: "root", parent_reply_id: null },
    { id: "child", parent_reply_id: "root" },
    { id: "sibling", parent_reply_id: "root" },
    { id: "deep", parent_reply_id: "child" },
    { id: "continuation", parent_reply_id: "deep" },
    { id: "other", parent_reply_id: null },
  ]);
  assert.equal(counts.get("root"), 4);
  assert.equal(counts.get("child"), 2);
  assert.equal(counts.get("deep"), 1);
  assert.equal(counts.get("continuation"), 0);
  assert.equal(counts.get("other"), 0);
});

test("does not reconnect descendants across excluded/deleted parents", () => {
  const counts = countReplyDescendants([
    { id: "root", parent_reply_id: null },
    { id: "orphan", parent_reply_id: "deleted" },
    { id: "leaf", parent_reply_id: "orphan" },
  ]);
  assert.equal(counts.get("root"), 0);
  assert.equal(counts.get("orphan"), 1);
  assert.equal(counts.has("deleted"), false);
});

test("handles empty lists and very deep chains without stack overflow", () => {
  assert.equal(countReplyDescendants([]).size, 0);
  const counts = countReplyDescendants(
    Array.from({ length: 10000 }, (_, index) => ({
      id: String(index),
      parent_reply_id: index ? String(index - 1) : null,
    })).reverse(),
  );
  assert.equal(counts.get("0"), 9999);
  assert.equal(counts.get("9999"), 0);
});
