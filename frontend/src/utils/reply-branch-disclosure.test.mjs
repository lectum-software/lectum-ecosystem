import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getNextReplyBranchVisibleCount,
  getReplyBranchVisibleCount,
  resolveReplyBranchAction,
} from "./reply-branch-disclosure.ts";

test("abre tres respostas e avanca em lotes de cinco", () => {
  assert.equal(getNextReplyBranchVisibleCount(0, 12), 3);
  assert.equal(getNextReplyBranchVisibleCount(3, 12), 8);
  assert.equal(getNextReplyBranchVisibleCount(8, 12), 12);
  assert.equal(getNextReplyBranchVisibleCount(0, 2), 2);
});

test("exibe uma unica acao coerente com o estado do ramo", () => {
  assert.deepEqual(resolveReplyBranchAction(0, 12), { count: 12, kind: "expand" });
  assert.deepEqual(resolveReplyBranchAction(3, 12), { count: 9, kind: "more" });
  assert.deepEqual(resolveReplyBranchAction(12, 12), { count: 0, kind: "collapse" });
  assert.equal(resolveReplyBranchAction(0, 0), null);
});

test("link para resposta abre ancestrais sem impedir ocultar e reabrir", () => {
  const visible = (state, focus = "target", loaded = 12) =>
    getReplyBranchVisibleCount(state, focus, true, loaded);
  assert.equal(visible(null), 12);
  assert.deepEqual(resolveReplyBranchAction(visible(null), 12), { count: 0, kind: "collapse" });
  const collapsed = { focusReplyId: "target", count: 0 };
  assert.equal(visible(collapsed), 0);
  assert.equal(visible(collapsed, "target", 15), 0);
  const reopened = { ...collapsed, count: getNextReplyBranchVisibleCount(visible(collapsed), 12) };
  assert.equal(visible(reopened), 3);
  assert.deepEqual(resolveReplyBranchAction(visible(reopened), 12), { count: 9, kind: "more" });
  assert.equal(visible(collapsed, "other-target"), 12);
  assert.equal(visible(reopened, "target", 1), 1);
  assert.equal(getReplyBranchVisibleCount(null, null, false, 12), 0);
  assert.equal(getReplyBranchVisibleCount({ focusReplyId: null, count: 3 }, null, false, 12), 3);
});

test("cada ancestral focado possui controle independente do caminho aberto", () => {
  const root = { focusReplyId: "target", count: 0 };
  assert.equal(getReplyBranchVisibleCount(root, "target", true, 8), 0);
  assert.equal(getReplyBranchVisibleCount(null, "target", true, 5), 5);
  const source = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /getReplyBranchVisibleCount\(/);
  assert.match(source, /const branchAction = resolveReplyBranchAction\(/);
  assert.match(source, /setBranchVisibility\(\{/);
  assert.doesNotMatch(source, /branchAction = hasFocusedDescendant/);
});

test("controle do ramo permanece compacto, bold, cinza e termina na curva", () => {
  const source = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasBranchConnector = hasTreeContinuation \|\| showBranchAction/);
  assert.match(source, /rounded-bl-\[8px\] border-b-\[1\.5px\] border-l-\[1\.5px\]/);
  assert.match(source, /!text-\[10px\] !font-bold !leading-none text-muted/);
  assert.match(source, /text-\[10px\] font-bold leading-none text-muted/);
  assert.match(source, /isNestedReply \? "ml-3 pl-\[10px\]"/);
  assert.match(source, /Chevron(?:Down|Up) className="h-2\.5 w-2\.5"/);
  assert.match(source, /heartClassName=\{isNestedReply \? "h-2\.5 w-2\.5" : "h-3 w-3"\}/);
});
