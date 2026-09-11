import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { withInvalidatedRecovery } from "./account-credentials";

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
});
