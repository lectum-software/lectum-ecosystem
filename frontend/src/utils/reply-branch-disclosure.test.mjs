import assert from "node:assert/strict";
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
