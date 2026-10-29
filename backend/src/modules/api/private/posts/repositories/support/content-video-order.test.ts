import assert from "node:assert/strict";
import test from "node:test";
import {
  type ContentVideoReplyNode,
  focusContentVideo,
  normalizeContentVideosPagination,
  orderContentVideoReplies,
} from "./content-video-order";

const node = (
  id: string,
  parent: string | null = null,
  votes = 0,
  author = "professional",
): ContentVideoReplyNode => ({
  id,
  parent_reply_id: parent,
  author_id: author,
  upvotes_count: votes,
  createdAt: new Date("2026-10-28T10:00:00Z"),
});

test("preorder includes arbitrary depths and preserves sibling relevance", () => {
  assert.deepEqual(
    orderContentVideoReplies(
      [
        node("root", null, 10),
        node("second", null, 1),
        node("child", "root", 2),
        node("deep", "child"),
        node("child-second", "root", 1),
      ],
      new Set(["professional"]),
      new Map(),
    ),
    ["root", "child", "deep", "child-second", "second"],
  );
});

test("professional root promotion and mentor ties match the post tree", () => {
  assert.deepEqual(
    orderContentVideoReplies(
      [
        node("patient", null, 100, "patient"),
        node("pro", null, 1, "professional"),
        node("ranked", "pro", 1, "ranked"),
        node("unranked", "pro", 1, "professional"),
      ],
      new Set(["professional", "ranked"]),
      new Map([["ranked", { position: 1 }]]),
    ),
    ["pro", "ranked", "unranked", "patient"],
  );
});

test("missing/deleted ancestors and cycles cannot leak descendants", () => {
  assert.deepEqual(
    orderContentVideoReplies(
      [
        node("visible"),
        node("orphan", "deleted"),
        node("deep-orphan", "orphan"),
        node("cycle-a", "cycle-b"),
        node("cycle-b", "cycle-a"),
      ],
      new Set(),
      new Map(),
    ),
    ["visible"],
  );
});

test("very deep discussions do not overflow the call stack", () => {
  const nodes = Array.from({ length: 12000 }, (_, i) => node(String(i), i ? String(i - 1) : null));
  const ids = orderContentVideoReplies(nodes.reverse(), new Set(), new Map());
  assert.equal(ids.length, 12000);
  assert.equal(ids.at(-1), "11999");
});

test("focus is promoted before slicing every page, without repeated or missing videos", () => {
  const items = [
    { reply_id: null },
    ...Array.from({ length: 55 }, (_, i) => ({ reply_id: String(i) })),
  ];
  const result = [1, 2, 3].flatMap((page) => {
    const { skip, limit } = normalizeContentVideosPagination({ page, limit: 20 });
    return focusContentVideo(items, "45").slice(skip, skip + limit);
  });
  assert.equal(result[0]?.reply_id, "45");
  assert.equal(result[1]?.reply_id, null);
  assert.equal(result.length, 56);
  assert.equal(new Set(result.map((item) => item.reply_id)).size, 56);
  assert.deepEqual(focusContentVideo(items, "missing"), items);
});

test("pagination defaults, cap and empty/out-of-range pages", () => {
  assert.deepEqual(normalizeContentVideosPagination({}), { page: 1, limit: 20, skip: 0 });
  assert.deepEqual(normalizeContentVideosPagination({ page: 2, limit: 999 }), {
    page: 2,
    limit: 30,
    skip: 30,
  });
  assert.deepEqual(normalizeContentVideosPagination({ page: Infinity, limit: -1 }), {
    page: 1,
    limit: 20,
    skip: 0,
  });
  assert.deepEqual(focusContentVideo([], "missing"), []);
});
