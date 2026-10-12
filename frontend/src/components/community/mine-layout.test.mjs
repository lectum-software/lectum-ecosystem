import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("mine reply identity follows origin link without old context line", () => {
  const source = readFileSync(
    new URL("../../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.indexOf("<OriginLink") < source.indexOf("<AuthorIdentityLine"));
  assert.ok(source.includes("name={getCommunityAuthorDisplayName(reply.author)}"));
  assert.ok(source.includes("community={item.post.community}"));
  assert.ok(source.includes("reply.author.id === item.post.author.id"));
  assert.doesNotMatch(source, /interactionCopy.contextLabel|OriginPreview/);
});

test("mine reply menu layers above controls and restores their separator", () => {
  const source = readFileSync(
    new URL("../../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes('className="relative z-30 flex min-w-0 items-start gap-3"'));
  assert.ok(source.includes('className="relative z-20 border-t border-border/80 pt-3"'));
});

test("mine header uses the same fixed-height header as saved publications", async () => {
  const { MyPostsHeader } = await import("../../app/app/posts/mine/components/header.tsx");
  const { AppPageHeader } = await import("../ui/app-page-header.tsx");
  const props = {
    backHref: "/app/perfil",
    backLabel: "Voltar para perfil",
    title: "Minhas publica\u00e7\u00f5es",
  };
  const actual = renderToStaticMarkup(
    createElement(MyPostsHeader, { interactionCopy: { screenTitle: props.title } }),
  );
  const expected = renderToStaticMarkup(createElement(AppPageHeader, props));
  assert.equal(actual, expected);
  assert.match(actual, /grid h-14 grid-cols/);
});

test("mine posts and replies remove answered chip and align owner menus with first line", () => {
  const mine = readFileSync(new URL("../../app/app/posts/mine/logic.tsx", import.meta.url), "utf8");
  const reply = readFileSync(
    new URL("../../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  for (const source of [mine, reply]) {
    assert.doesNotMatch(source, /ProfessionalAnsweredBadge|hasVerifiedProfessionalReply/);
    assert.match(source, /className="-mt-2 -mr-1"/);
  }
  assert.match(mine, /authorHeaderExtra=/);
  assert.doesNotMatch(mine, /\sheaderExtra=/);
});

const { OriginLink } = await import("../../app/app/posts/mine/components/origin-preview.tsx");

test("mine original publication link is transparent and opens the actual source", () => {
  const post = {
    id: "post",
    title: "Hidden origin title",
    content: "Hidden origin content",
    community: { slug: "topic" },
  };
  const render = (reply) =>
    renderToStaticMarkup(createElement(OriginLink, { item: { post, reply } }));
  const direct = render({ parent_reply_id: null });
  assert.match(direct, /href="\/comunidades\/topic\/publicacao\/post"/);
  assert.match(direct, /bg-transparent/);
  assert.match(direct, /Ver publica.*original/);
  assert.doesNotMatch(direct, /Hidden origin|bg-primary|<img|<video/);
  const nested = render({ id: "own", parent_reply_id: "parent" });
  assert.match(nested, /focusReplyId=parent#reply-parent/);
  assert.doesNotMatch(nested, /focusReplyId=own/);
});
