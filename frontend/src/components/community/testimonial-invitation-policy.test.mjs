import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { canInvitePostAuthorToTestify } from "./testimonial-invitation-policy.ts";

const directReply = {
  parent_reply_id: null,
  media_url: "/video.mp4",
  media_type: "video",
  author: { id: "professional", role: "psicologo" },
};
const owner = {
  currentUserId: "patient",
  currentUserRole: "paciente",
  postAuthorId: "patient",
  reply: directReply,
};

test("only the original patient author sees a direct professional video testimonial action", () => {
  assert.equal(canInvitePostAuthorToTestify(owner), true);
  for (const override of [
    { currentUserId: "other" },
    { currentUserId: null },
    { postAuthorId: null },
    { postAuthorId: "" },
    { currentUserRole: "psicologo" },
    { reply: { ...directReply, parent_reply_id: "parent" } },
    { reply: { ...directReply, parent_reply_id: undefined } },
    { reply: { ...directReply, media_type: "image" } },
    { reply: { ...directReply, media_url: null } },
    { reply: { ...directReply, author: { id: "patient", role: "psicologo" } } },
    { reply: { ...directReply, author: { id: "other", role: "paciente" } } },
  ])
    assert.equal(canInvitePostAuthorToTestify({ ...owner, ...override }), false);
});

test("post action retains server eligibility and passes original owner through reply trees", () => {
  const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
  const invitation = read("./post-testimonial-invitation.tsx");
  assert.match(invitation, /canInvitePostAuthorToTestify/);
  assert.match(invitation, /<TestimonialInvitation/);
  assert.match(invitation, /appearance="inline"/);
  const card = read("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx");
  assert.match(card, /endSlot=\{<PostTestimonialInvitation/);
  assert.match(card, /postAuthorId=\{postAuthorId\}/);
  const preview = read("./community-post-card-reply-preview.tsx");
  assert.doesNotMatch(preview, /TestimonialInvitation/);
  const feed = read("./community-post-card.tsx");
  assert.match(feed, /testimonialReply = primaryReply \?\? highlightedProfessionalReply/);
  assert.match(feed, /renderPostTestimonialSlot\(post, testimonialReply, footerExtra\)/);
  const menu = read("../../app/app/profile/logic.tsx");
  assert.equal((menu.match(/label: "Meus Depoimentos"/g) || []).length, 2);
});

test("both post card implementations mount the same owner-gated action in the toolbar", () => {
  for (const [file, reply, extra] of [
    ["./community-post-card.tsx", "testimonialReply", "footerExtra"],
    ["../../app/app/community/[slug]/components/post-card.tsx", "highlightedReply", "null"],
  ]) {
    const source = readFileSync(new URL(file, import.meta.url), "utf8");
    assert.match(source, /import \{ renderPostTestimonialSlot \} from/);
    assert.ok(source.includes(`endSlot={renderPostTestimonialSlot(post, ${reply}, ${extra})}`));
    assert.ok(
      source.indexOf("<CommunityActionBar") < source.indexOf("endSlot={renderPostTestimonialSlot"),
    );
  }
  for (const file of ["community-feed", "community-detail"]) {
    const source = readFileSync(
      new URL(`../../app/app/community/[slug]/views/${file}.tsx`, import.meta.url),
      "utf8",
    );
    assert.match(
      source,
      /import \{ InfinitePostLoader, PostCard \} from "\.\.\/components\/post-card"/,
    );
    assert.match(source, /<PostCard/);
  }
  const helper = readFileSync(
    new URL("./post-testimonial-invitation.tsx", import.meta.url),
    "utf8",
  );
  assert.match(helper, /postAuthorId=\{post.author.id\} reply=\{reply\}/);
});

test("anonymous display identities cannot grant ownership or relax the direct-parent requirement", () => {
  assert.equal(canInvitePostAuthorToTestify(owner), true);
  assert.equal(
    canInvitePostAuthorToTestify({ ...owner, postAuthorId: "anonymous:other-reader" }),
    false,
  );
  for (const parent_reply_id of [undefined, "", "parent-comment"]) {
    assert.equal(
      canInvitePostAuthorToTestify({ ...owner, reply: { ...directReply, parent_reply_id } }),
      false,
    );
  }
});
