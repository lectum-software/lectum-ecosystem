import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { publicationInteractionData } from "./community-post-card-support.ts";

const post = {
  current_user_vote: 1,
  upvotes_count: 20,
  downvotes_count: 3,
  saved: true,
  saves_count: 8,
  replies_count: 9,
};

test("profile reply controls do not inherit parent votes, saves or comments", () => {
  const reply = {
    current_user_vote: null,
    upvotes_count: 0,
    downvotes_count: 0,
    saved: false,
    saves_count: 0,
    replies_count: 0,
  };
  assert.deepEqual(publicationInteractionData(post, reply), {
    currentVote: null,
    upvotes: 0,
    downvotes: 0,
    saved: false,
    saves: 0,
    comments: 0,
  });
});

test("reply metrics are preserved and older API responses never fall back to the post", () => {
  assert.deepEqual(publicationInteractionData(post, { upvotes_count: 2, saved: false }), {
    currentVote: null,
    upvotes: 2,
    downvotes: 0,
    saved: false,
    saves: 0,
    comments: 0,
  });
  assert.equal(
    publicationInteractionData(post, { ...post, current_user_vote: -1 }).currentVote,
    -1,
  );
});

test("original publications retain original metrics", () => {
  assert.deepEqual(publicationInteractionData(post, null), {
    currentVote: 1,
    upvotes: 20,
    downvotes: 3,
    saved: true,
    saves: 8,
    comments: 9,
  });
});

test("reply mutation, guest intent and thread navigation retain the reply identity", () => {
  const source = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.match(source, /useSaveReply\(post.id, primaryReply\?\.id/);
  assert.match(source, /value, \.\.\.\(primaryReply \? \{ replyId: primaryReply.id \}/);
  assert.match(source, /primaryReply \? "vote_reply" : "vote_post"/);
  assert.match(source, /primaryReply \? "save_reply" : "save_post"/);
  assert.match(source, /\/resposta\/\$\{primaryReply.id\}/);
});

test("profile replies use the compact inline reply toolbar while original posts retain their layout", () => {
  const source = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.match(source, /primaryReply\s*\? "mt-2 sm:mt-3"/);
  assert.match(source, /secondaryActionsPlacement=\{primaryReply \? "inline" : "trailing"\}/);
  assert.match(source, /votePresentation=\{primaryReply \? "inline" : actionBarVotePresentation\}/);
  assert.match(source, /showUpvoteText=\{primaryReply \? false : actionBarShowUpvoteText\}/);
  assert.match(source, /size=\{primaryReply \? "xs" : "sm"\}/);
  for (const counter of ["interactionData.comments", "saveAction.count", "shareCount"]) {
    assert.ok(source.includes(`count: primaryReply ? undefined : ${counter}`));
  }
});

test("read-only vote controls also respect the hidden upvote label", () => {
  const source = readFileSync(new URL("./community-action-bar.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('{showUpvoteText ? "Útil" : null}'));
});
