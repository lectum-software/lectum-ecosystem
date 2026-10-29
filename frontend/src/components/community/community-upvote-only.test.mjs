import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});

const { CommunityActionBar } = await import("./community-action-bar.tsx");
const { resolveVoteSnapshot } = await import(
  "../../app/app/community/[slug]/modules/feed-support.ts"
);
const { replyVoteRankingScore, compareReplySiblingsByRelevance } = await import(
  "../../app/app/community/[slug]/post/[id]/modules/reply-support.ts"
);

for (const size of ["xs", "sm", "md"]) {
  for (const votePresentation of ["cluster", "inline"]) {
    test(`only upvote is rendered for ${size}/${votePresentation}, including historical votes`, () => {
      for (const currentVote of [null, 1, -1]) {
        for (const interactive of [true, false]) {
          const html = renderToStaticMarkup(
            createElement(CommunityActionBar, {
              size,
              votePresentation,
              showUpvoteText: votePresentation === "cluster",
              currentVote,
              upvotesCount: 7,
              downvotesCount: 99,
              onVote: interactive ? () => {} : undefined,
              reply: { iconOnly: true, onClick: () => {} },
              save: { onClick: () => {} },
              share: { onClick: () => {} },
            }),
          );
          assert.doesNotMatch(html, /downvote|arrow-down|>99</i);
          assert.match(html, /lucide-arrow-up/);
          assert.match(html, /aria-label="Responder"/);
          assert.match(html, /aria-label="Salvar"/);
          assert.match(html, /aria-label="Compartilhar"/);
          if (votePresentation === "cluster") {
            assert.match(html, />Útil</);
            assert.match(html, /rounded-full border border-border/);
          } else {
            assert.doesNotMatch(html, />Útil</);
            assert.match(html, /bg-transparent p-0 ring-0/);
          }
          if (interactive) {
            assert.match(
              html,
              new RegExp(`aria-label="Marcar como útil" aria-pressed="${currentVote === 1}"`),
            );
          }
        }
      }
    });
  }
}

test("disabled upvote stays disabled without a second vote action", () => {
  const html = renderToStaticMarkup(
    createElement(CommunityActionBar, {
      upvotesCount: 7,
      currentVote: 1,
      onVote: () => {},
      disabled: true,
    }),
  );
  assert.equal((html.match(/<button\b/g) ?? []).length, 1);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-pressed="true"/);
});

test("upvote toggles on and off and can replace a historical negative vote", () => {
  for (const currentVote of [null, 1, -1]) {
    const original = { currentVote, downvotes: 3, upvotes: 7, postId: "post" };
    const next = resolveVoteSnapshot(original, 1);
    assert.equal(next.currentVote, currentVote === 1 ? null : 1);
    assert.equal(next.upvotes, currentVote === 1 ? 6 : 8);
    assert.equal(next.downvotes, currentVote === -1 ? 2 : 3);
    const toggled = resolveVoteSnapshot(next, 1);
    assert.equal(toggled.currentVote, currentVote === 1 ? 1 : null);
    assert.equal(toggled.upvotes, 7);
    assert.equal(original.currentVote, currentVote);
  }
});

test("historical downvotes no longer affect local reply relevance", () => {
  const reply = {
    id: "reply",
    upvotes_count: 5,
    downvotes_count: 0,
    created_at: "2026-10-28T12:00:00.000Z",
    author: { featured_badge: null },
  };
  assert.equal(replyVoteRankingScore(reply), 5);
  assert.equal(replyVoteRankingScore({ ...reply, downvotes_count: 100 }), 5);
  assert.equal(compareReplySiblingsByRelevance(reply, { ...reply, downvotes_count: 100 }), 0);
  assert.ok(
    compareReplySiblingsByRelevance({ ...reply, upvotes_count: 6, downvotes_count: 100 }, reply) <
      0,
  );
});
