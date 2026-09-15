import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { credentialSnapshotWhere, withInvalidatedRecovery } from "./account-credentials";

describe("invalidação da recuperação ao mudar credenciais", () => {
  it("remove vínculo de recuperação em troca de senha ou e-mail, incluindo updates Prisma", () => {
    for (const credential of [
      { password: "new-hash" },
      { password: null },
      { password: { set: "new-hash" } },
      { email: "new@example.com" },
      { email: { set: "new@example.com" } },
    ]) {
      const input = { ...credential, recovery_code: "previous-link", recovery_date: new Date(0) };
      const result = withInvalidatedRecovery(input);
      assert.equal(result.recovery_code, null);
      assert.equal(result.recovery_date, null);
      assert.equal(input.recovery_code, "previous-link");
    }
  });
  it("não muda a confirmação do e-mail nem apaga links por atualização sem credenciais", () => {
    const input = { password: undefined, confirmed: false, recovery_code: "current-link" };
    assert.deepEqual(withInvalidatedRecovery(input), input);
    assert.equal(
      withInvalidatedRecovery({ password: "new-hash", confirmed: false }).confirmed,
      false,
    );
  });
  it("preserva a nova confirmação administrativa ao invalidar a recuperação anterior", () => {
    const issuedAt = new Date();
    const input = {
      email: "new@example.com",
      confirm_code: "012345",
      confirm_date: issuedAt,
      confirmed: false,
      confirmed_date: null,
    };
    assert.deepEqual(withInvalidatedRecovery(input), {
      ...input,
      recovery_code: null,
      recovery_date: null,
    });
    assert.equal(Object.hasOwn(input, "recovery_code"), false);
  });
  it("vincula a emissão ao endereço, hash e conta não excluída, inclusive contas sem senha", () => {
    for (const password of ["stored-hash", null]) {
      const snapshot = { email: "audit@example.com", password };
      assert.deepEqual(credentialSnapshotWhere(snapshot), { ...snapshot, deleted: false });
      assert.equal(Object.hasOwn(snapshot, "deleted"), false);
    }
  });
});
