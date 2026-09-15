import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPendingAccountRequirement } from "./account-requirements";

describe("pré-requisitos da conta privada", () => {
  it("recusa confirmação ausente ou pendente sem depender de redirecionamento", () => {
    for (const state of [undefined, null, {}, { confirmed: false }, { confirmed: null }]) {
      assert.equal(getPendingAccountRequirement(state), "email_confirmation_required");
    }
  });
  it("exige troca da senha temporária antes do uso privado", () => {
    assert.equal(
      getPendingAccountRequirement({ confirmed: true, need_reset: true }),
      "password_reset_required",
    );
    assert.equal(
      getPendingAccountRequirement({ confirmed: false, need_reset: true }),
      "password_reset_required",
    );
  });
  it("preserva acesso confirmado sem redefinição pendente", () => {
    assert.equal(getPendingAccountRequirement({ confirmed: true, need_reset: false }), null);
    assert.equal(getPendingAccountRequirement({ confirmed: true }), null);
  });
});
