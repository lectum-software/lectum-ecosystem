import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmationCodeSchema } from "./index";

test("código preserva zeros à esquerda e rejeita formatos fora de seis números", () => {
  assert.equal(confirmationCodeSchema.parse("000012"), "000012");
  for (const value of ["", "12345", "1234567", "12345x", "123456\n", "１２３４５６", 123456]) {
    const result = confirmationCodeSchema.safeParse(value);
    assert.equal(result.success, false);
    if (!result.success && typeof value === "string") {
      assert.equal(result.error.issues[0]?.message, "Informe os 6 números do código.");
    }
  }
});
