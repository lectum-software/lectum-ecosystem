import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicCommunityFocusedReplyThreadHref } from "./public-routes.ts";
import { findFocusedReplyContinuation } from "./reply-focus-navigation.ts";
import "./reply-tree-layout.test.mjs";
import "./reply-menu-position.test.mjs";

const branch = (depth, level = 0) => ({
  id: `reply-${level}`,
  replies: level < depth ? [branch(depth, level + 1)] : [],
});

test("shallow replies stay on the original post, including the boundary", () => {
  for (let depth = 0; depth <= 3; depth++) {
    assert.equal(findFocusedReplyContinuation([branch(8)], `reply-${depth}`, 3), null);
  }
});

test("deep replies resolve the same continuation as the tree links", () => {
  for (const depth of [4, 5, 6]) {
    assert.equal(findFocusedReplyContinuation([branch(10)], `reply-${depth}`, 3), "reply-3");
  }
  for (const depth of [7, 8, 9]) {
    assert.equal(findFocusedReplyContinuation([branch(10)], `reply-${depth}`, 3), "reply-6");
  }
  assert.equal(findFocusedReplyContinuation([branch(10)], "reply-10", 3), "reply-9");
});

test("focus resolution follows the correct root among siblings and tolerates missing targets", () => {
  const replies = [{ id: "other", replies: [] }, branch(5)];
  replies[1].replies.unshift({ id: "sibling", replies: [] });
  assert.equal(findFocusedReplyContinuation(replies, "reply-5", 3), "reply-3");
  assert.equal(findFocusedReplyContinuation(replies, "removed", 3), null);
  assert.equal(findFocusedReplyContinuation([], "reply-5", 3), null);
  assert.equal(findFocusedReplyContinuation(replies, "reply-5", 0), null);
});

test("continuation URL keeps both context root and exact focus", () => {
  assert.equal(
    publicCommunityFocusedReplyThreadHref("saude", "post", "parent", "target"),
    "/comunidades/saude/publicacao/post/resposta/parent?focusReplyId=target#reply-target",
  );
});

test("post resolves the focused API path before discarding lookup, and thread consumes focus", () => {
  const base = "../app/app/community/[slug]/post/[id]/views/";
  const controller = readFileSync(
    new URL(`${base}post-detail-controller.ts`, import.meta.url),
    "utf8",
  );
  const thread = readFileSync(new URL(`${base}reply-thread.tsx`, import.meta.url), "utf8");
  assert.match(controller, /focusLookupReplyId === focusReplyIdFromUrl/);
  assert.match(controller, /findFocusedReplyContinuation\(\s*focusReplyLookupQuery\.data\.data/);
  assert.match(controller, /router\.replace\(\s*publicCommunityFocusedReplyThreadHref/);
  assert.match(controller, /\{ scroll: false \}/);
  assert.match(thread, /searchParams\.get\("focusReplyId"\)/);
  assert.match(thread, /setActiveFocusReplyId\(focusReplyIdFromUrl\)/);
  assert.match(thread, /focusReplyId=\{activeFocusReplyId\}/);
});
