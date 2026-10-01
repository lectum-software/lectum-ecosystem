import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { publicationInteractionData } from "./community-post-card-support.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === "next/link" ? "next/link.js" : specifier, context);
  },
});
const { ProfileReplyQuestion } = await import("./profile-reply-question.tsx");
const { ProfileReplyVideoQuestion, getContainedQuestionFrame } = await import(
  "./profile-reply-video-question.tsx"
);

test("question uses the contained video plane for inline, fullscreen and rotated layouts", () => {
  assert.deepEqual(getContainedQuestionFrame(320, 640, 1080, 1920), {
    width: 320,
    height: (320 * 16) / 9,
    left: 0,
    top: (640 - (320 * 16) / 9) / 2,
  });
  const expanded = getContainedQuestionFrame(393, 852, 1080, 1920);
  assert.equal(expanded.width, 393);
  assert.equal(expanded.height / expanded.width, 16 / 9);
  const landscape = getContainedQuestionFrame(1280, 720, 1080, 1920);
  assert.deepEqual(landscape, { width: 405, height: 720, left: 437.5, top: 0 });
  assert.deepEqual(getContainedQuestionFrame(320, 640, 0, 0), getContainedQuestionFrame(320, 640));
});

test("question position, typography, padding and radius scale together with the video", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileReplyVideoQuestion, { title: "Question" }),
  );
  assert.match(html, /top-\[4%\]/);
  assert.match(html, /container-type:size/);
  for (const token of ["text-[5cqw]", "text-[4.375cqw]", "p-[5cqw]", "rounded-[3.75cqw]"]) {
    assert.ok(html.includes(token));
  }
  assert.doesNotMatch(html, /top-\[13%\]|text-base|text-sm/);
});

test("profile video art has only the question label and full title, without branding or context", () => {
  const title = "Como a gente se prepara pra perder alguem?";
  const html = renderToStaticMarkup(createElement(ProfileReplyVideoQuestion, { title }));
  assert.ok(html.includes(title));
  assert.match(html, />Pergunta<\/div>/);
  assert.match(html, /data-profile-video-question/);
  assert.doesNotMatch(html, /<img|<svg|<a\b|<button|Lectum|Ver contexto|ver mais|line-clamp/);
  assert.match(html, /overflow-y-auto/);
});

test("profile question overlay stays inside the player shell and is opt-in for reply videos", () => {
  const source = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.match(source, /primaryReply && displayMediaType === "video" && displayMediaUrl/);
  assert.match(
    source,
    /showProfileVideoQuestion \?\s*\(?\s*<ProfileReplyVideoQuestion title=\{post.title\}/,
  );
  assert.doesNotMatch(source, /ProfileReplyQuestionContext|Ver contexto da pergunta/);
  const media = readFileSync(new URL("./community-media-frame.tsx", import.meta.url), "utf8");
  assert.match(media, /overlay=\{videoOverlay\}/);
  const player = readFileSync(new URL("../ui/vertical-video-player.tsx", import.meta.url), "utf8");
  assert.ok(player.indexOf("<VerticalVideoPlayerShell") < player.indexOf("{overlay}"));
  assert.ok(player.indexOf("{overlay}") < player.indexOf("</VerticalVideoPlayerShell>"));
});

test("profile question renders the complete title and description without author or navigation", () => {
  const title =
    "A complete question title that must remain visible even when it spans several lines";
  const content = "The original question description.";
  const html = renderToStaticMarkup(
    createElement(ProfileReplyQuestion, {
      title,
      content,
      author: { name: "Patient identity must not appear" },
    }),
  );
  assert.ok(html.includes(title));
  assert.ok(html.includes(content));
  assert.doesNotMatch(html, /<a\b|href=|line-clamp|Patient identity/);
});

test("profile question accepts an empty description without an empty preview", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileReplyQuestion, { title: "Question", content: "  " }),
  );
  assert.match(html, /<h3[^>]*>Question<\/h3>/);
  assert.doesNotMatch(html, /<p\b|<button\b/);
});

test("only profile replies show the question above the reply and do not open the post on card click", () => {
  const source = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /primaryReply && !showProfileVideoQuestion \?\s*\(?\s*<ProfileReplyQuestion/,
  );
  assert.ok(source.indexOf("{communityContextLabel}") < source.indexOf("<ProfileReplyQuestion"));
  assert.ok(source.indexOf("<ProfileReplyQuestion") < source.indexOf("<AuthorAvatar"));
  assert.ok(source.indexOf("<AuthorAvatar") < source.indexOf("<CommunityMediaBlock"));
  assert.ok(source.indexOf("<ProfileReplyQuestion") < source.indexOf("<CommunityMediaBlock"));
  const profile = readFileSync(
    new URL("../../app/app/psychologist/[id]/components/publications.tsx", import.meta.url),
    "utf8",
  );
  assert.match(profile, /openPostOnCardClick=\{post.contribution_type !== "reply"\}/);
});

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

test("profile reply media uses community spacing without an empty text block", () => {
  const source = readFileSync(new URL("./community-post-card.tsx", import.meta.url), "utf8");
  assert.ok(
    source.includes("const showDisplayText = !primaryReply || Boolean(displayContent.trim())"),
  );
  assert.match(source, /\{showDisplayText \? \(/);
  assert.ok(source.includes('primaryReply ? (showDisplayText ? "mb-2" : "mb-0") : "mb-3"'));
  assert.ok(source.includes('primaryReply ? "mt-3" : "mt-4"'));
  for (const path of [
    "./community-post-card-reply-preview.tsx",
    "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx",
  ]) {
    const reference = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(reference, /<CommunityMediaBlock[\s\S]*?className="mt-3"/);
  }
});

test("read-only vote controls also respect the hidden upvote label", () => {
  const source = readFileSync(new URL("./community-action-bar.tsx", import.meta.url), "utf8");
  assert.ok(source.includes('{showUpvoteText ? "Útil" : null}'));
});
