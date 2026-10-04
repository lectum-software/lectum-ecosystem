import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  hasSeenPsychologistReplyTip,
  isReplyTipPost,
  markPsychologistReplyTipSeen,
  prioritizeReplyTipPost,
} from "./psychologist-reply-tip.ts";

const post = (id, role = "paciente", overrides = {}) => ({
  id,
  author: { role },
  status: "publicado",
  muted_by_current_user: false,
  ...overrides,
});

test("only published, unmuted patient posts can anchor the reply tip", () => {
  assert.equal(isReplyTipPost(post("patient")), true);
  assert.equal(isReplyTipPost(post("professional", "psicologo")), false);
  assert.equal(isReplyTipPost(post("removed", "paciente", { status: "removido" })), false);
  assert.equal(isReplyTipPost(post("muted", "paciente", { muted_by_current_user: true })), false);
});

test("target is first without duplication, mutating data or changing the remaining order", () => {
  const posts = [post("professional", "psicologo"), post("patient"), post("another")];
  const original = posts.slice();
  assert.deepEqual(
    prioritizeReplyTipPost(posts, "patient").map((p) => p.id),
    ["patient", "professional", "another"],
  );
  assert.deepEqual(posts, original);
  assert.equal(prioritizeReplyTipPost(posts, null), posts);
  assert.equal(prioritizeReplyTipPost(posts, "missing"), posts);
  assert.equal(prioritizeReplyTipPost(posts, "professional"), posts);
  assert.deepEqual(prioritizeReplyTipPost([], "patient"), []);
});

test("completion survives remount and is isolated by account, even when storage is unavailable", () => {
  const previousWindow = globalThis.window;
  const storage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => storage.get(key),
      setItem: (key, value) => storage.set(key, value),
    },
    dispatchEvent() {},
  };
  try {
    assert.equal(hasSeenPsychologistReplyTip("first"), false);
    markPsychologistReplyTipSeen("first");
    assert.equal(hasSeenPsychologistReplyTip("first"), true);
    assert.equal(hasSeenPsychologistReplyTip("second"), false);
    assert.equal(hasSeenPsychologistReplyTip(null), false);
    assert.equal(storage.get("lectum:psychologist-reply-tip:v1:first"), "1");
    window.localStorage.getItem = () => {
      throw Error("unavailable");
    };
    window.localStorage.setItem = () => {
      throw Error("unavailable");
    };
    markPsychologistReplyTipSeen("blocked-storage");
    assert.equal(hasSeenPsychologistReplyTip("blocked-storage"), true);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("feed and community wire the same tip and completion into actual post navigation", () => {
  const source = (file) =>
    readFileSync(new URL(`../app/app/community/[slug]/${file}`, import.meta.url), "utf8");
  for (const view of ["community-feed", "community-detail"]) {
    const code = source(`views/${view}.tsx`);
    assert.match(code, /usePsychologistReplyTip\(/);
    assert.match(
      code,
      /onOpen=\{post.id === replyTip.targetPostId \? replyTip.dismiss : undefined\}/,
    );
    assert.match(code, /<PsychologistReplyOnboarding onDismiss=\{replyTip.dismiss\}/);
  }
  const card = source("components/post-card.tsx");
  assert.match(card, /rememberCommunityFeedScrollPosition\(post.id\);\s*onOpen\?\.\(\)/);
  const target = card.indexOf("data-psychologist-tip-target=");
  assert.ok(target < card.indexOf("<AuthorAvatar", target));
  assert.ok(target < card.indexOf("<InlineExpandableText", target));
  assert.doesNotMatch(
    source("post/[id]/views/post-detail.tsx"),
    /ActionableCoachMark|PsychologistReplyTip/,
  );
  assert.doesNotMatch(
    source("post/[id]/views/post-detail-controller.ts"),
    /has_seen_psychologist_reply_tip/,
  );
});
