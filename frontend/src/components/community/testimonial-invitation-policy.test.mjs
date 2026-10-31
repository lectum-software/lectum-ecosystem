import assert from "node:assert/strict";
import "./testimonial-push.test.mjs";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { canInvitePostAuthorToTestify } from "./testimonial-invitation-policy.ts";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const elements = (source, tag) => {
  const file = ts.createSourceFile(
    "card.tsx",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const result = [];
  const visit = (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === tag
    )
      result.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
};
const attribute = (element, name) =>
  element.attributes.properties
    .find((property) => ts.isJsxAttribute(property) && property.name.getText() === name)
    ?.initializer?.getText();

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

test("reply action retains server eligibility and passes original owner through reply trees", () => {
  const invitation = read("./post-testimonial-invitation.tsx");
  assert.match(invitation, /canInvitePostAuthorToTestify/);
  assert.match(invitation, /<TestimonialInvitation/);
  assert.match(invitation, /appearance="inline"/);
  const card = read("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx");
  assert.match(card, /endSlot=\{<PostTestimonialInvitation/);
  assert.match(card, /postAuthorId=\{postAuthorId\}/);
  const action = read("../reviews/testimonial-invitation-action.tsx");
  assert.match(
    action,
    /useReviewEligibility\(psychologistId, hasToken && user\?\.role === "paciente"\)/,
  );
  assert.match(action, /!eligibility.data\?\.eligible/);
  const feed = read("./community-post-card.tsx");
  assert.match(feed, /profilePublicationMode && contributionType === "reply"/);
  assert.match(feed, /renderReplyTestimonialSlot\(post, primaryReply, footerExtra\)/);
  const menu = read("../../app/app/profile/logic.tsx");
  assert.equal((menu.match(/label: "Meus Depoimentos"/g) || []).length, 2);
});

test("original post toolbars never receive the highlighted reply invitation", () => {
  const shared = read("./community-post-card.tsx");
  const community = read("../../app/app/community/[slug]/components/post-card.tsx");
  const [sharedBar] = elements(shared, "CommunityActionBar");
  const [communityBar] = elements(community, "CommunityActionBar");
  assert.equal(elements(shared, "CommunityActionBar").length, 1);
  assert.equal(elements(community, "CommunityActionBar").length, 1);
  assert.equal(attribute(communityBar, "endSlot"), undefined);
  assert.equal(
    attribute(sharedBar, "endSlot"),
    "{renderReplyTestimonialSlot(post, primaryReply, footerExtra)}",
  );
  assert.doesNotMatch(shared + community, /renderPostTestimonialSlot|testimonialReply/);
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
  assert.match(helper, /\{existing\}/);
  assert.match(helper, /\{reply \? <PostTestimonialInvitation/);
});

test("highlighted previews never invent an isolated invitation or another action bar", () => {
  const shared = read("./community-post-card-reply-preview.tsx");
  const community = read("../../app/app/community/[slug]/components/post-card.tsx");
  assert.doesNotMatch(shared + community, /TestimonialInvitation|ProfessionalReplyTestimonialRow/);
  assert.equal(elements(shared, "CommunityActionBar").length, 0);
  assert.equal(elements(community, "CommunityActionBar").length, 1, "only original post controls");
  assert.doesNotMatch(read("./post-testimonial-invitation.tsx"), /ProfessionalReplyTestimonialRow/);
  assert.match(shared, /href=\{postHref\}/);
  assert.match(community, /href=\{postHref\}/);
});

test("actual reply controls and profile primary reply retain the eligible direct-reply invitation", () => {
  const card = read("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx");
  const [bar] = elements(card, "CommunityActionBar");
  assert.equal(
    attribute(bar, "endSlot"),
    "{<PostTestimonialInvitation postAuthorId={postAuthorId} reply={reply} />}",
  );
  const profile = read("../../app/app/psychologist/[id]/components/publications.tsx");
  assert.match(profile, /<CommunityPostCard/);
  assert.match(profile, /profilePublicationMode/);
  assert.equal(canInvitePostAuthorToTestify(owner), true);
  assert.equal(
    canInvitePostAuthorToTestify({
      ...owner,
      reply: { ...directReply, parent_reply_id: "parent" },
    }),
    false,
  );
});

test("inline invitation keeps a 44px target and mobile icon-only presentation", () => {
  const source = read("../reviews/testimonial-invitation-action.tsx");
  assert.match(source, /min-h-\[44px\] min-w-\[44px\]/);
  assert.match(source, /inline && "max-sm:sr-only"/);
  assert.match(source, /inline \? "Depoimento" : "Deixar depoimento"/);
  assert.match(source, /aria-label="Deixar depoimento"/);
});

test("directory mobile and desktop retain TestimonialsButton with the shared ReviewsIcon", () => {
  const sheet = read("../reviews/testimonials-sheet.tsx");
  assert.match(sheet, /<ReviewsIcon aria-hidden style=\{\{ width: iconSize, height: iconSize \}\}/);
  for (const file of ["desktop-rail", "slide-details"]) {
    const source = read(`../../app/app/psychologists/view/components/${file}.tsx`);
    const [button] = elements(source, "TestimonialsButton");
    assert.ok(button, file);
    assert.ok(attribute(button, "psychologistId"), file);
    assert.equal(elements(source, "PostTestimonialInvitation").length, 0);
  }
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
