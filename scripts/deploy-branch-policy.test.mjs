import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateDeployPush } from "./deploy-branch-policy.mjs";

const SHA = "a".repeat(40);
const REMOTE_SHA = "b".repeat(40);

describe("deploy branch policy", () => {
  it("aceita somente homolog para homolog com input íntegro", () => {
    assert.deepEqual(
      evaluateDeployPush({
        branch: "homolog",
        input: `refs/heads/homolog ${SHA} refs/heads/homolog ${REMOTE_SHA}\n`,
      }),
      { allowed: true, reason: "homolog_only" },
    );
  });

  it("bloqueia main, ref remota diferente e exclusão", () => {
    assert.equal(
      evaluateDeployPush({
        branch: "main",
        input: `refs/heads/main ${SHA} refs/heads/main ${REMOTE_SHA}`,
      }).allowed,
      false,
    );
    assert.equal(
      evaluateDeployPush({
        branch: "homolog",
        input: `refs/heads/homolog ${SHA} refs/heads/main ${REMOTE_SHA}`,
      }).allowed,
      false,
    );
    assert.equal(
      evaluateDeployPush({
        branch: "homolog",
        input: `(delete) ${"0".repeat(40)} refs/heads/homolog ${REMOTE_SHA}`,
      }).allowed,
      false,
    );
  });

  it("falha fechado com stdin não-TTY vazio ou malformado", () => {
    assert.deepEqual(evaluateDeployPush({ branch: "homolog", input: "" }), {
      allowed: false,
      reason: "invalid_input",
    });
    assert.deepEqual(evaluateDeployPush({ branch: "homolog", input: "malformed" }), {
      allowed: false,
      reason: "invalid_input",
    });
  });

  it("permite auditoria manual TTY na homolog sem simular refs", () => {
    assert.deepEqual(evaluateDeployPush({ branch: "homolog", stdinIsTTY: true }), {
      allowed: true,
      reason: "manual_check",
    });
  });
});
