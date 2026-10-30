import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getSafeApiErrorMessage } from "../../api/errors.ts";

const { canManageReplyProfileVisibility, ReplyProfileVisibilityAction } = await import(
  "./reply-profile-visibility-action.tsx"
);

test("only an opted-in professional owner can manage visibility", () => {
  const author = { id: "owner", role: "psicologo" };
  for (const [allowProfileVisibility, currentUser, expected] of [
    [true, author, true],
    [false, author, false],
    [undefined, author, false],
    [true, null, false],
    [true, undefined, false],
    [true, { id: "other", role: "psicologo" }, false],
    [true, { id: "owner", role: "paciente" }, false],
    [true, { id: "owner", role: "admin" }, false],
    [true, { id: "", role: "psicologo" }, false],
  ]) {
    assert.equal(
      canManageReplyProfileVisibility({ allowProfileVisibility, currentUser, author }),
      expected,
    );
  }
  assert.equal(
    canManageReplyProfileVisibility({
      allowProfileVisibility: true,
      currentUser: author,
      author: { id: "owner", role: "paciente" },
    }),
    false,
  );
  const patient = { id: "patient", role: "paciente" };
  assert.equal(
    canManageReplyProfileVisibility({
      allowProfileVisibility: true,
      currentUser: patient,
      author: patient,
    }),
    false,
  );
});

test("visibility action announces hide and show and toggles to the opposite value", () => {
  for (const hidden of [false, true]) {
    const events = [];
    const props = {
      hidden,
      pending: false,
      disabled: false,
      onToggle: (next) => events.push(next),
    };
    const html = renderToStaticMarkup(createElement(ReplyProfileVisibilityAction, props));
    assert.match(html, /role="menuitem"/);
    assert.match(html, /type="button"/);
    assert.match(html, /aria-busy="false"/);
    assert.ok(html.includes(hidden ? "Exibir no perfil público" : "Ocultar do perfil público"));
    assert.doesNotMatch(html, /disabled=""|animate-spin/);
    ReplyProfileVisibilityAction(props).props.onClick({
      stopPropagation: () => events.push("stop"),
    });
    assert.deepEqual(events, ["stop", !hidden]);
  }
});

test("pending or other busy actions disable toggles, with a pending-only spinner", () => {
  for (const [pending, disabled] of [
    [true, false],
    [false, true],
    [true, true],
  ]) {
    let calls = 0;
    const props = { hidden: false, pending, disabled, onToggle: () => calls++ };
    const html = renderToStaticMarkup(createElement(ReplyProfileVisibilityAction, props));
    assert.match(html, /disabled=""/);
    assert.ok(html.includes(`aria-busy="${pending}"`));
    assert.equal(html.includes("animate-spin"), pending);
    ReplyProfileVisibilityAction(props).props.onClick({ stopPropagation() {} });
    assert.equal(calls, 0);
  }
});

test("menu error path retains retry, clears previous errors and closes only on success", () => {
  const source = readFileSync(new URL("./reply-owner-action-menu.tsx", import.meta.url), "utf8");
  const handler = source.slice(
    source.indexOf("const handleVisibilityToggle"),
    source.indexOf("const handleMuteToggle"),
  );
  assert.match(handler, /setActionError\(null\)/);
  assert.match(handler, /\{ postId: post.id, replyId: reply.id, hidden \}/);
  assert.match(handler, /onSuccess: \(\) => \{\s*setMenuOpen\(false\);\s*onUpdated\?\.\(\);/);
  assert.match(handler, /onError: \(error\) => setActionError\(errorMessageFromUnknown\(error\)\)/);
  assert.equal((handler.match(/setMenuOpen\(false\)/g) ?? []).length, 1);
  assert.match(
    source,
    /getSafeApiErrorMessage\(error, "Não foi possível concluir a ação. Tente novamente."\)/,
  );
  assert.match(source, /<p role="alert"[^>]*>\s*\{actionError\}/);
  assert.match(source, /visibilityMutation.isPending/);
  assert.match(source, /<ReplyProfileVisibilityAction\s+disabled=\{busy\}/);
  const fallback = "Não foi possível concluir a ação. Tente novamente.";
  assert.equal(
    getSafeApiErrorMessage(new Error("DATABASE_URL postgres://internal"), fallback),
    fallback,
  );
  assert.equal(
    getSafeApiErrorMessage({ response: { status: 403 } }, fallback),
    "Você não tem permissão para realizar esta ação.",
  );
  const retry = renderToStaticMarkup(
    createElement(ReplyProfileVisibilityAction, {
      hidden: false,
      disabled: false,
      pending: false,
      onToggle() {},
    }),
  );
  assert.doesNotMatch(retry, /disabled=""/);
  assert.match(retry, /Ocultar do perfil público/);
});

test("only mine opts in; shared owner menu indicator and action both obey the gate", () => {
  const owner = readFileSync(new URL("./reply-owner-action-menu.tsx", import.meta.url), "utf8");
  const mine = readFileSync(
    new URL("../../app/app/posts/mine/components/reply-item-card.tsx", import.meta.url),
    "utf8",
  );
  const overflow = readFileSync(
    new URL(
      "../../app/app/community/[slug]/post/[id]/components/reply-overflow-menu.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(owner, /allowProfileVisibility = false/);
  assert.match(owner, /if \(!isOwnReply\) return null/);
  assert.match(
    owner,
    /canManageReplyProfileVisibility\(\{\s*allowProfileVisibility,\s*author: reply.author,\s*currentUser/,
  );
  assert.match(owner, /canManageProfileVisibility && hiddenFromProfile \? \(/);
  assert.match(owner, /canManageProfileVisibility \? \(\s*<ReplyProfileVisibilityAction/);
  assert.match(owner, /hiddenFromProfile = reply.hidden_from_profile === true/);
  assert.match(owner, /aria-label="Oculta do perfil público"/);
  assert.match(mine, /<ReplyOwnerActionMenu\s+allowProfileVisibility/);
  assert.doesNotMatch(overflow, /allowProfileVisibility/);
});
