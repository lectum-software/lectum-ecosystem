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
const { ReplyBranchFooter } = await import(
  "../../app/app/community/[slug]/post/[id]/components/reply-branch-footer.tsx"
);
const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const postSource = (path) => source(`../../app/app/community/[slug]/post/[id]/${path}`);

test("sheet uses the real post controller, tree and composer with no parallel editor", () => {
  const sheet = source("./content-video-comments-sheet.tsx");
  assert.match(sheet, /usePostDetailController\(\{/);
  assert.match(sheet, /embedded: true/);
  assert.match(sheet, /<RepliesList/);
  assert.match(sheet, /<ReplyComposer/);
  assert.match(sheet, /variant="embedded"/);
  assert.match(sheet, /mediaPermission=\{controller.mediaPermission\}/);
  assert.match(sheet, /usePostReplyThread\(/);
  assert.match(sheet, /controller\.submitReply\(/);
  assert.doesNotMatch(sheet, /<textarea|contentEditable|\bfetch\(/);
});

test("embedding does not read another post's URL focus or restore its window scroll", () => {
  const controller = postSource("views/post-detail-controller.ts");
  assert.match(controller, /explicitPostId \?\?/);
  assert.match(controller, /!embedded && searchParams.get\("focusReplyId"\)/);
  assert.match(controller, /embedded \? null : routeTreeReturn/);
  assert.match(controller, /continuationRoot && post && !embedded/);
  assert.match(controller, /embedded \? null : activeFocusReplyId/);
  const tree = postSource("components/replies-list.tsx");
  assert.match(tree, /embedded \? null : routeSnapshot/);
  assert.match(tree, /<ContentVideoPost postId=\{postId\} disabled=\{embedded\}>/);
  assert.match(tree, /enableCommunityAutoplay=\{!embedded\}/);
});

test("real embedded composer preserves fields and hides patient attachments", () => {
  const html = renderToStaticMarkup(
    createElement(ReplyComposer, {
      mediaPermission: { canAttach: false, showControl: false, reason: null },
      onSubmit() {},
      replyTarget: null,
      variant: "embedded",
    }),
  );
  assert.match(html, /role="textbox"/);
  assert.match(html, /Adicionar comentário/);
  assert.match(html, /text-sm font-semibold/);
  assert.match(html, /Comente com respeito e empatia/);
  assert.doesNotMatch(html, /data-reply-media-trigger="true"|data-fixed-bottom-recovery="true"/);
  assert.doesNotMatch(html, /fixed inset-x-0 bottom-0 z-\[60\]/);
});

test("real composer keeps the professional media gate, not a new upload control", () => {
  for (const canAttach of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(ReplyComposer, {
        mediaPermission: {
          canAttach,
          showControl: true,
          reason: "Mídia disponível apenas para psicólogos verificados.",
        },
        onSubmit() {},
        replyTarget: null,
        variant: "embedded",
      }),
    );
    assert.match(html, /data-reply-media-trigger="true"/);
    assert.match(html, /Enviar resposta/);
    assert.match(html, /text-sm font-semibold/);
  }
});

test("deep continuation retains the real footer but opens inside the sheet", () => {
  const calls = [];
  const footer = ReplyBranchFooter({
    action: { kind: "expand", count: 2 },
    canCollapseTree: false,
    canRevealLoadedChildren: false,
    descendantsCount: 2,
    depth: 2,
    onCollapse() {},
    onExpand() {},
    onOpenThread: () => calls.push("thread"),
    replyId: "reply-1",
    threadHref: "/comunidades/test/publicacao/post/resposta/reply-1",
    visibleCount: 0,
  });
  assert.ok(footer);
  const reveal = footer.props.children[0].props.children;
  reveal.props.onClick({
    stopPropagation: () => calls.push("stop"),
    preventDefault: () => calls.push("prevent"),
  });
  assert.deepEqual(calls, ["stop", "prevent", "thread"]);
});

test("nested reply menus remain inside native dialog top layer", () => {
  const menu = source("./reply-menu-surface.tsx");
  assert.match(menu, /triggerRef.current\?\.closest\("dialog"\) \?\? document.body/);
  assert.match(menu, /createPortal\(/);
  assert.match(menu, /portalHost,/);
});
