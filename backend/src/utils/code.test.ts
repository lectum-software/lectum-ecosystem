import assert from "node:assert/strict";
import { test } from "node:test";
import { code, isCodeWithinValidity } from "./code";

test("código numérico gerado tem exatamente seis dígitos", () => {
  for (let index = 0; index < 20; index++) assert.match(code(), /^[0-9]{6}$/);
});

test("janela do código expira exatamente no limite, sem arredondar minutos", () => {
  const now = Date.UTC(2026, 8, 11);
  assert.equal(isCodeWithinValidity(new Date(now), 1, now), true);
  assert.equal(isCodeWithinValidity(new Date(now - 59_999), 1, now), true);
  assert.equal(isCodeWithinValidity(new Date(now - 60_000), 1, now), false);
  assert.equal(isCodeWithinValidity(new Date(now - 61_000), 1, now), false);
});

test("data futura, inválida ou ausente não autoriza confirmação", () => {
  const now = Date.UTC(2026, 8, 11);
  for (const issuedAt of [undefined, null, new Date(NaN), new Date(now + 1)]) {
    assert.equal(isCodeWithinValidity(issuedAt, 1, now), false);
  }
  for (const minutes of [0, -1, NaN, Infinity]) {
    assert.equal(isCodeWithinValidity(new Date(now), minutes, now), false);
  }
});
