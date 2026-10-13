import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { findFocusedReplyContinuation } from "./reply-focus-navigation.ts";
import {
  getReplyLayerToolbarWidths,
  getReplyTreeInlineDepth,
  hasInlineReplySecondaryActions,
} from "./reply-tree-layout.ts";

test("the complete toolbar determines the same boundary for every sibling", () => {
  assert.equal(getReplyTreeInlineDepth(350, 3), 3);
  assert.equal(getReplyTreeInlineDepth(320, 3), 2);
  assert.equal(getReplyTreeInlineDepth(700, 3, 16, true), 3);
  assert.equal(getReplyTreeInlineDepth(350, 1), 1);
  assert.equal(getReplyTreeInlineDepth(350, 0), 0);
  assert.equal(getReplyTreeInlineDepth(280, 3), 1);
  assert.equal(getReplyTreeInlineDepth(350, 3, 20), 1);
  assert.equal(getReplyTreeInlineDepth(350, 3, 16, false, [260, 260, 260, 260]), 1);
});

test("mixed siblings move together and a deep focus resolves to a wider continuation", () => {
  const nodes = [
    {
      id: "root",
      replies: [
        {
          id: "parent",
          replies: [
            { id: "patient", replies: [] },
            { id: "professional", replies: [] },
          ],
        },
      ],
    },
  ];
  for (const id of ["patient", "professional"]) {
    assert.equal(
      findFocusedReplyContinuation(nodes, id, getReplyTreeInlineDepth(280, 3)),
      "parent",
    );
    assert.equal(findFocusedReplyContinuation(nodes, id, getReplyTreeInlineDepth(700, 3)), null);
  }
});

const node = (id, overrides = {}) => ({
  id,
  author: { role: "psicologo", whatsapp_url: "https://wa.me/5511999999999" },
  upvotes_count: 0,
  media_url: null,
  replies: [],
  ...overrides,
});

test("text-only professional replies move secondary actions into the menu", () => {
  for (const role of ["paciente", "psicologo", null]) {
    for (const media_url of [null, "", "answer.mp4", "answer.jpg"]) {
      assert.equal(
        hasInlineReplySecondaryActions(
          node("target", {
            author: { role },
            media_url,
          }),
        ),
        role === "psicologo" && Boolean(media_url),
      );
    }
  }
});

test("moving text actions preserves the extra layer without shrinking icons or WhatsApp", () => {
  const tree = [
    node("root", {
      media_url: "root.mp4",
      replies: [
        node("first", {
          replies: [
            node("second", {
              replies: [node("patient", { author: { role: "paciente" } }), node("professional")],
            }),
          ],
        }),
      ],
    }),
  ];
  const widths = getReplyLayerToolbarWidths(tree);
  assert.deepEqual(widths, [192, 160, 160, 160]);
  assert.equal(getReplyTreeInlineDepth(350, 3, 16, false, [224, 224, 224, 224]), 2);
  assert.equal(getReplyTreeInlineDepth(350, 3, 16, false, widths), 3);
  assert.equal(getReplyTreeInlineDepth(320, 3, 16, false, widths), 3);
  for (const id of ["patient", "professional"]) {
    assert.equal(findFocusedReplyContinuation(tree, id, 3), null);
  }
  tree[0].replies[0].replies[0].replies.push(node("video", { media_url: "answer.mp4" }));
  const mixedWidths = getReplyLayerToolbarWidths(tree);
  assert.deepEqual(mixedWidths, [192, 160, 160, 192]);
  const depth = getReplyTreeInlineDepth(320, 3, 16, false, mixedWidths);
  assert.equal(depth, 2);
  for (const id of ["patient", "professional", "video"]) {
    assert.equal(findFocusedReplyContinuation(tree, id, depth), "second");
  }
});

test("budget is per layer, uses the widest sibling and grows for long counts", () => {
  assert.deepEqual(
    getReplyLayerToolbarWidths([
      node("patient", { author: { role: "paciente" } }),
      node("professional", { author: { role: "psicologo" } }),
    ]),
    [128],
  );
  assert.deepEqual(
    getReplyLayerToolbarWidths([
      node("patient", { author: { role: "paciente" } }),
      node("professional"),
    ]),
    [160],
  );
  const widths = getReplyLayerToolbarWidths([node("popular", { upvotes_count: 1_000_000 })]);
  assert.ok(widths[0] > 160);
});

test("width boundaries cannot be bypassed by a focused descendant", () => {
  const card = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(card, /canRenderChildren = depth < visualMaxDepth;/);
  assert.doesNotMatch(card, /:flex-wrap/);
  assert.match(card, /maxInlineDepth=\{maxInlineDepth\}/);
  assert.match(card, /!canRevealLoadedChildren && threadHref/);
  const list = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/replies-list.tsx", import.meta.url),
    "utf8",
  );
  assert.match(list, /maxInlineDepth=\{responsiveDepth\}/);
});
