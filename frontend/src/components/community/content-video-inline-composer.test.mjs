import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      /^next\/(link|image|navigation|dynamic|script)$/.test(specifier)
        ? `${specifier}.js`
        : specifier,
      context,
    );
  },
});

const { ReplyComposer } = await import(
  "../../app/app/community/[slug]/post/[id]/components/reply-composer.tsx"
);
const { ReplyComposerSubmitButton } = await import(
  "../../app/app/community/[slug]/post/[id]/components/reply-composer-submit-button.tsx"
);
const { ContentVideoInlineComposer } = await import("./content-video-inline-composer.tsx");
const { resolvePostError, resolveReplyPublishError } = await import(
  "../../app/app/community/[slug]/post/[id]/modules/reply-support.ts"
);
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const inline = source("./content-video-inline-composer.tsx");
const composer = source("../../app/app/community/[slug]/post/[id]/components/reply-composer.tsx");
const renderComposer = (props = {}) =>
  renderToStaticMarkup(
    createElement(ReplyComposer, {
      appearance: "reels",
      mediaPermission: { canAttach: true, showControl: true, reason: null },
      onSubmit() {},
      replyTarget: null,
      variant: "embedded",
      ...props,
    }),
  );

test("real reels composer retains camera, field and real file input without a fixed footer", () => {
  const html = renderComposer();
  assert.match(html, /data-reply-composer-appearance="reels"/);
  assert.match(html, /role="textbox"/);
  assert.match(html, /data-reply-media-trigger="true"/);
  assert.equal((html.match(/type="file"/g) ?? []).length, 1);
  assert.match(html, /video\/quicktime/);
  assert.match(html, /bg-media-control\/92/);
  assert.match(html, /text-media-foreground/);
  assert.match(html, /px-3 py-2.5/);
  assert.match(html, /border-transparent/);
  const guidanceClass = html.match(/<p class="([^"]*)">Comente com respeito e empatia/)?.[1];
  assert.ok(guidanceClass);
  assert.match(guidanceClass, /text-media-foreground\/70/);
  assert.match(guidanceClass, /\bhidden\b/);
  assert.match(guidanceClass, /group-has-\[\[role=textbox\]:focus\]\/reels:block/);
  assert.doesNotMatch(guidanceClass, /sr-only/);
  assert.doesNotMatch(html, /data-fixed-bottom-recovery="true"|fixed inset-x-0 bottom-0/);
});

test("post composer guidance remains visible outside reels", () => {
  const html = renderComposer({ appearance: "default" });
  const guidanceClass = html.match(/<p class="([^"]*)">Comente com respeito e empatia/)?.[1];
  assert.ok(guidanceClass);
  assert.doesNotMatch(guidanceClass, /hidden|group-has/);
});

test("reels pointer submit preserves focus until click without changing keyboard activation", () => {
  const submit = source(
    "../../app/app/community/[slug]/post/[id]/components/reply-composer-submit-button.tsx",
  );
  assert.match(submit, /onClick=\{onClick\}/);
  assert.match(submit, /appearance === "reels" && event.button === 0\) event.preventDefault\(\)/);
  assert.doesNotMatch(submit, /onKeyDown|onMouseDown/);
});

test("reels honors actual patient media permissions", () => {
  const html = renderComposer({
    mediaPermission: { canAttach: false, showControl: false, reason: null },
  });
  assert.doesNotMatch(html, /data-reply-media-trigger="true"/);
  assert.match(html, /role="textbox"/);
});

test("pending reels disables editing, native picker, media trigger and send", () => {
  const html = renderComposer({ disabled: true });
  assert.match(html, /contentEditable="false"/i);
  assert.match(html, /aria-disabled="true"/);
  const input = html.match(/<input[^>]*type="file"[^>]*>/)?.[0];
  assert.match(input ?? "", /disabled=""/);
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  assert.ok(buttons.length >= 2);
  assert.ok(buttons.every((button) => button.includes('disabled=""')));
});

test("reels send is dark when disabled and blue when enabled; defaults remain unchanged", () => {
  for (const disabled of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(ReplyComposerSubmitButton, {
        appearance: "reels",
        disabled,
        loading: false,
        onClick() {},
      }),
    );
    assert.match(html, /bg-primary/);
    assert.match(html, /hover:bg-primary-hover/);
    assert.match(html, /disabled:bg-media-control\/92/);
    assert.equal(html.includes('disabled=""'), disabled);
  }
  const html = renderComposer({ appearance: "default" });
  assert.match(html, /bg-surface/);
  assert.doesNotMatch(html, /bg-media-control\/92|disabled:bg-media-control\/92/);
});

test("inactive boundary prevents controller mounting and keys drafts to the video target", () => {
  // No router/query/auth providers: an inactive slide must not invoke the controller at all.
  assert.equal(
    renderToStaticMarkup(createElement(ContentVideoInlineComposer, { active: false })),
    "",
  );
  assert.match(inline, /active \? \(\s*<ActiveContentVideoInlineComposer/s);
  assert.match(inline, /\) : null;/);
  assert.match(inline, /key=\{`\$\{props.item.post_id\}:\$\{props.item.reply_id/);
  assert.match(inline, /usePostDetailController\(\{ postId: item.post_id, embedded: true \}\)/);
  assert.doesNotMatch(inline, /initialFocusReplyId:/);
});

test("real submit targets the video reply and preserves conversion drafts", () => {
  assert.match(
    inline,
    /controller.submitReply\(values, item.reply_id, mediaFile, videoUploadOperation\)/,
  );
  assert.match(
    inline,
    /if \(!conversion.isAuthenticated\)[\s\S]*requestConversion[\s\S]*throw new Error\(\)/,
  );
  assert.match(inline, /type: item.reply_id \? "reply_comment" : "comment_post"/);
  assert.match(inline, /await controller.submitReply[\s\S]*void refreshAfterSubmit\(\)/);
  assert.doesNotMatch(inline, /\bfetch\(|<textarea|contentEditable|useCreatePostReply/);
});

test("focus, media preparation, picker, dirty draft and upload report independent state", () => {
  assert.match(
    composer,
    /const busy =[\s\S]*composerActive \|\|[\s\S]*hasDiscardableDraft \|\|[\s\S]*mediaPickerActive \|\|[\s\S]*mediaUpgradeModalOpen \|\|[\s\S]*hook.formState.isSubmitting;/,
  );
  assert.match(composer, /submitting: isPreparingVideo \|\| hook.formState.isSubmitting/);
  assert.match(composer, /addEventListener\("cancel", endMediaPickerInteraction\)/);
  assert.match(
    inline,
    /const publishing = composerState.submitting \|\| submitting \|\| mutationPending/,
  );
  assert.match(inline, /onStateChange\?\.\(\{ busy, hasDraft, submitting: publishing \}\)/);
  assert.match(
    inline,
    /onStateChange\?\.\(\{ busy: false, hasDraft: false, submitting: false \}\)/,
  );
  assert.match(inline, /if \(event.key !== "Tab"\) event.stopPropagation\(\)/);
  assert.match(inline, /onPointerDown=\{\(event\) => event.stopPropagation\(\)\}/);
});

test("load retries retain mounted composer; count retries do not publish twice", () => {
  assert.match(inline, /controller.postQuery.refetch\(\)/);
  assert.match(inline, /onClick=\{\(\) => void refreshAfterSubmit\(\)\}/);
  const refreshStart = inline.indexOf("const refreshAfterSubmit");
  const refresh = inline.slice(refreshStart, inline.indexOf("  return (", refreshStart));
  assert.match(refresh, /await onSubmitted\(\)/);
  assert.match(refresh, /catch/);
  assert.doesNotMatch(refresh, /submitReply/);
  assert.match(inline, /max-h-\[min\(44dvh,320px\)\]/);
});

test("Tab bubbles to the viewer focus trap while navigation keys remain contained", () => {
  const handler = inline.match(/onKeyDown=\{\(event\) => \{([\s\S]*?)\}\}/)?.[1];
  assert.ok(handler);
  assert.match(handler, /if \(event.key !== "Tab"\) event.stopPropagation\(\)/);
  assert.doesNotMatch(handler, /preventDefault|shiftKey/);
});

test("reels suppresses reply context even when targeting an author", () => {
  assert.match(composer, /const shouldShowGuidance = !isReels &&/);
  const html = renderComposer({ replyTarget: { id: "video-reply", name: "Author" } });
  assert.doesNotMatch(html, /Respondendo/);
});

test("internal submission guards carry no technical text even if passed to public resolvers", () => {
  assert.doesNotMatch(inline, /Composer unavailable|Authentication required/);
  assert.equal((inline.match(/throw new Error\(\);/g) ?? []).length, 2);
  assert.equal(resolvePostError(new Error()), "Não foi possível carregar este post agora.");
  assert.equal(
    resolveReplyPublishError(new Error()),
    "Não foi possível publicar sua resposta agora.",
  );
  const submitCatch = composer.match(
    /await onSubmit[\s\S]*?catch \(error\) \{([\s\S]*?)\} finally/,
  )[1];
  assert.doesNotMatch(submitCatch, /error.message|setError|setReplyError/);
});
