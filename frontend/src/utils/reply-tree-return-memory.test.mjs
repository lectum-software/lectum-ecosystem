import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

const {
  captureReplyTreeReturn,
  findReplyTreeReturnSnapshot,
  REPLY_TREE_RETURN_KEY,
  readReplyTreeReturnRaw,
  rememberReplyTreeReturn,
  replyTreeReturnScope,
  resolveReplyTreeReturnScroll,
} = await import("./reply-tree-return-memory.ts");

const previousWindow = globalThis.window;
let values;
const post = "/comunidades/topic/publicacao/post";
const scope = replyTreeReturnScope("viewer", post);
const snapshot = (extra = {}) => ({
  scope,
  createdAt: Date.now(),
  pageCount: 3,
  branches: {
    root: { count: 8, contentExpanded: true },
    child: { count: 1, contentExpanded: false },
    closed: { count: 0, contentExpanded: false },
  },
  anchorId: "reply-branch-child",
  anchorTop: 420,
  scrollY: 2400,
  ...extra,
});
beforeEach(() => {
  values = new Map();
  globalThis.window = {
    scrollY: 100,
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  };
});
after(() => {
  globalThis.window = previousWindow;
});

test("return stores exact open/closed branches, expanded text and loaded root pages", () => {
  const saved = snapshot();
  assert.equal(rememberReplyTreeReturn(saved), true);
  assert.deepEqual(findReplyTreeReturnSnapshot(readReplyTreeReturnRaw(), scope), saved);
  assert.equal(
    findReplyTreeReturnSnapshot(readReplyTreeReturnRaw(), replyTreeReturnScope("other", post)),
    null,
  );
  assert.equal(
    findReplyTreeReturnSnapshot(
      readReplyTreeReturnRaw(),
      replyTreeReturnScope("viewer", `${post}?focusReplyId=new`),
    ),
    null,
  );
});
test("successive continuations retain independent snapshots including parent post", () => {
  for (const path of [post, `${post}/resposta/child`, `${post}/resposta/grandchild`]) {
    rememberReplyTreeReturn(snapshot({ scope: replyTreeReturnScope("viewer", path) }));
  }
  for (const path of [post, `${post}/resposta/child`, `${post}/resposta/grandchild`]) {
    assert.equal(
      findReplyTreeReturnSnapshot(readReplyTreeReturnRaw(), replyTreeReturnScope("viewer", path))
        .pageCount,
      3,
    );
  }
  assert.equal(replyTreeReturnScope("viewer", `${post}#reply-old`), scope);
});
test("captures actual rendered disclosure, replacing stale branches after manual collapse", () => {
  rememberReplyTreeReturn(snapshot());
  captureReplyTreeReturn(
    {
      querySelectorAll: () => [
        {
          dataset: { replyBranchId: "root", replyVisibleCount: "0", replyContentExpanded: "false" },
        },
      ],
    },
    { id: "reply-branch-root", getBoundingClientRect: () => ({ top: 250 }) },
    scope,
    2,
  );
  const saved = findReplyTreeReturnSnapshot(readReplyTreeReturnRaw(), scope);
  assert.deepEqual(saved.branches, { root: { count: 0, contentExpanded: false } });
  assert.equal(saved.pageCount, 2);
  assert.equal(saved.anchorTop, 250);
  assert.equal(saved.scrollY, 100);
});
test("storage is bounded, expiring and rejects invalid state without crashing", () => {
  for (let i = 0; i < 15; i++) rememberReplyTreeReturn(snapshot({ scope: `scope-${i}` }));
  assert.equal(JSON.parse(readReplyTreeReturnRaw()).length, 12);
  assert.equal(findReplyTreeReturnSnapshot(readReplyTreeReturnRaw(), "scope-0"), null);
  const now = Date.now();
  for (const invalid of [
    snapshot({ createdAt: now - 31 * 60 * 1000 }),
    snapshot({ createdAt: now + 1000 }),
    snapshot({ branches: { root: { count: -1 } } }),
    snapshot({ pageCount: 1001 }),
    snapshot({ scrollY: -1 }),
    snapshot({ branches: null }),
  ])
    assert.equal(findReplyTreeReturnSnapshot(JSON.stringify([invalid]), scope, now), null);
  assert.equal(findReplyTreeReturnSnapshot("broken", scope), null);
  Object.defineProperty(window, "sessionStorage", {
    get() {
      throw Error("denied");
    },
  });
  assert.equal(readReplyTreeReturnRaw(), null);
  assert.equal(rememberReplyTreeReturn(snapshot()), false);
});
test("restores anchor viewport offset even when media above it changes height", () => {
  assert.equal(
    resolveReplyTreeReturnScroll(snapshot(), { getBoundingClientRect: () => ({ top: 600 }) }),
    280,
  );
  assert.equal(resolveReplyTreeReturnScroll(snapshot(), null), 2400);
  assert.equal(
    resolveReplyTreeReturnScroll(snapshot(), { getBoundingClientRect: () => ({ top: 0 }) }),
    0,
  );
});
test("memory persists no reply content, credentials or media URLs", () => {
  rememberReplyTreeReturn(snapshot());
  assert.equal(values.has(REPLY_TREE_RETURN_KEY), true);
  assert.doesNotMatch(readReplyTreeReturnRaw(), /content":|token|media_url|email/);
});
