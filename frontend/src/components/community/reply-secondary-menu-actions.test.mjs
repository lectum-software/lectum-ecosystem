import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { ReplySecondaryMenuActions } = await import("./reply-secondary-menu-actions.tsx");

test("save state, pending state and share remain accessible in the menu", () => {
  const html = renderToStaticMarkup(
    createElement(ReplySecondaryMenuActions, {
      saved: true,
      savePending: true,
      onToggleSave() {},
      onShare() {},
      onClose() {},
    }),
  );
  assert.match(html, /role="menuitemcheckbox"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /Remover dos salvos/);
  assert.match(html, /Compartilhar comentário/);
});

test("menu commands stop propagation, close and invoke the original handlers", () => {
  const calls = [];
  const event = { stopPropagation: () => calls.push("stop") };
  const element = ReplySecondaryMenuActions({
    saved: false,
    onToggleSave: (received) => {
      assert.equal(received, event);
      calls.push("save");
    },
    onShare: () => calls.push("share"),
    onClose: () => calls.push("close"),
  });
  const [save, share] = element.props.children;
  save.props.onClick(event);
  share.props.onClick(event);
  assert.deepEqual(calls, ["stop", "close", "save", "stop", "close", "share"]);
});

test("both ownership paths render menu actions and the tree toolbar no longer duplicates them", () => {
  const owner = readFileSync(new URL("./reply-owner-action-menu.tsx", import.meta.url), "utf8");
  const other = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/reply-overflow-menu.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const card = readFileSync(
    new URL("../../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(owner, /<ReplySecondaryMenuActions/);
  assert.match(other, /<ReplySecondaryMenuActions/);
  assert.match(other, /secondaryActions=\{secondaryActions\}/);
  const toolbar = card.slice(
    card.indexOf("export const ReplyVoteBar"),
    card.indexOf("export const ReplyCard"),
  );
  assert.doesNotMatch(toolbar, /save=\{|share=\{/);
  assert.match(toolbar, /CommunityWhatsAppCta/);
  assert.match(card, /onToggleSave: toggleSaveReply/);
});
