import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getNextReplyBranchVisibleCount,
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

test("controle do ramo permanece compacto, cinza e conectado em qualquer profundidade", () => {
  const source = readFileSync(
    new URL("../app/app/community/[slug]/post/[id]/components/reply-card.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /hasBranchConnector = hasTreeContinuation \|\| Boolean\(branchAction\)/);
  assert.match(source, /text-\[11px\] font-semibold text-muted/);
  assert.match(source, /data-comment-collapse-ignore="true"[\s\S]*?<svg[\s\S]*?H22/);
  assert.match(source, /isNestedReply[\s\S]*?"ml-3 pl-\[18px\]"/);
  assert.match(source, /viewBox="0 -2 22 22"/);
  assert.match(source, /heartClassName=\{isNestedReply \? "h-2\.5 w-2\.5" : "h-3 w-3"\}/);
});
