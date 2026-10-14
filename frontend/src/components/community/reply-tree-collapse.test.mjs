import assert from "node:assert/strict";
import test from "node:test";
import { Children, createElement, isValidElement } from "react";
import { ReplyBranchFooter } from "../../app/app/community/[slug]/post/[id]/components/reply-branch-footer.tsx";
import { ReplyCard } from "../../app/app/community/[slug]/post/[id]/components/reply-card.tsx";
import { restoreCollapsedReplyFocus } from "../../app/app/community/[slug]/post/[id]/modules/reply-support.ts";
import { resolveReplyBranchAction } from "../../utils/reply-branch-disclosure.ts";

export const registerReplyTreeCollapseTests = ({ renderRelations, AppRouterContext }) => {
  const render = (children) =>
    renderRelations({
      children: createElement(AppRouterContext.Provider, { value: {} }, children),
    });
  const node = (id, replies = [], role = "paciente") => ({
    id,
    replies,
    content: id,
    created_at: "2026-10-01T12:00:00Z",
    replies_count: replies.length,
    descendants_count: replies.reduce((sum, child) => sum + 1 + child.descendants_count, 0),
    upvotes_count: 0,
    current_user_vote: null,
    saved: false,
    author: { id: `author-${id}`, name: id, role, type_label: role, verified: false },
  });
  const tree = node("root", [
    node("child", [node("target", [node("closed", [node("leaf")])], "psicologo")]),
  ]);
  const card = (reply, extra = {}) =>
    createElement(ReplyCard, {
      postId: "post",
      postSourceText: "Question",
      reply,
      inlineReplyTargets: {},
      mediaPermission: { canAttach: false, showControl: false, reason: "" },
      onCancelInlineReplyTarget() {},
      onDeleteReply() {},
      onReply() {},
      onReportReply() {},
      onShare() {},
      onSubmitReply() {},
      onVote() {},
      threadHrefBase: "/comunidades/topic/publicacao/post/resposta",
      ...extra,
    });
  test("deep focused tree has one collapse footer and preserves unopened nested branches", () => {
    const html = render(card(tree, { focusReplyId: "target" }));
    assert.equal((html.match(/>Ocultar respostas</g) ?? []).length, 1);
    assert.match(html, /aria-controls="reply-children-root"/);
    assert.match(html, /id="reply-focus-root" tabindex="-1"/);
    assert.match(html, /Ver 2 respostas/);
    assert.ok(html.indexOf('id="reply-target"') < html.indexOf(">Ocultar respostas<"));
    assert.doesNotMatch(html, /id="reply-closed"/);
  });
  test("another root stays collapsed and continuation treats its displayed parent as the root", () => {
    const html = render(
      createElement(
        "section",
        null,
        card(tree, { focusReplyId: "target" }),
        card(node("other", [node("other-child")]), { focusReplyId: "target" }),
      ),
    );
    assert.equal((html.match(/>Ocultar respostas</g) ?? []).length, 1);
    assert.doesNotMatch(html, /id="reply-other-child"/);
    const continuation = render(card(tree.replies[0], { focusReplyId: "target" }));
    assert.equal((continuation.match(/>Ocultar respostas</g) ?? []).length, 1);
    assert.match(continuation, /aria-controls="reply-children-child"/);
  });
  test("root collapse remains available with more replies; nested levels never repeat it", () => {
    let visibleCount = 3;
    const props = () => ({
      action: resolveReplyBranchAction(visibleCount, 8),
      canCollapseTree: visibleCount > 0,
      canRevealLoadedChildren: true,
      descendantsCount: 15,
      depth: 0,
      replyId: "root",
      threadHref: null,
      visibleCount,
      onCollapse: () => {
        visibleCount = 0;
      },
      onExpand: () => {
        visibleCount = 3;
      },
    });
    const initial = ReplyBranchFooter(props());
    const html = render(initial);
    assert.match(html, /Ver mais 5 respostas/);
    assert.equal((html.match(/>Ocultar respostas</g) ?? []).length, 1);
    const buttons = [];
    const visit = (element) => {
      if (!isValidElement(element)) return;
      if (element.type === "button") buttons.push(element);
      Children.forEach(element.props.children, visit);
    };
    visit(initial);
    let stopped = 0;
    buttons
      .find((button) => button.props["aria-label"].startsWith("Ocultar"))
      .props.onClick({ stopPropagation: () => stopped++ });
    assert.equal(visibleCount, 0);
    assert.equal(stopped, 1);
    const collapsed = render(createElement(ReplyBranchFooter, props()));
    assert.match(collapsed, /Ver 15 respostas/);
    assert.match(collapsed, /aria-expanded="false"/);
    assert.doesNotMatch(collapsed, /Ocultar respostas/);
    for (const depth of [1, 2, 3]) {
      assert.equal(
        ReplyBranchFooter({
          ...props(),
          action: resolveReplyBranchAction(1, 1),
          canCollapseTree: true,
          depth,
        }),
        null,
      );
      const unopened = render(
        createElement(ReplyBranchFooter, {
          ...props(),
          depth,
          canRevealLoadedChildren: false,
          threadHref: "/continuation",
        }),
      );
      assert.match(unopened, /href="\/continuation"/);
      assert.match(unopened, /Ver 15 respostas/);
      assert.doesNotMatch(unopened, /Ocultar respostas/);
    }
  });
  test("collapse restores root focus below the header without smooth scrolling or changing URL", () => {
    const previousDocument = globalThis.document;
    const previousWindow = globalThis.window;
    const calls = [];
    try {
      globalThis.document = {
        getElementById(id) {
          assert.equal(id, "reply-focus-root");
          return {
            focus: (options) => calls.push(["focus", options]),
            getBoundingClientRect: () => ({ top: 180 }),
          };
        },
        querySelector: () => ({ getBoundingClientRect: () => ({ height: 64 }) }),
      };
      globalThis.window = {
        scrollY: 200,
        matchMedia: () => ({ matches: true }),
        scrollTo: (options) => calls.push(["scroll", options]),
      };
      restoreCollapsedReplyFocus("root");
      assert.deepEqual(calls, [
        ["focus", { preventScroll: true }],
        ["scroll", { behavior: "instant", top: 306 }],
      ]);
    } finally {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });
};
