import assert from "node:assert/strict";
import test from "node:test";
import mocks from "./index";

test("gera valores de apoio sem dependências exclusivas de desenvolvimento", () => {
  assert.match(mocks.cep(), /^\d{5}-\d{3}$/);
  assert.match(mocks.cnpj(), /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
  assert.match(mocks.cpf(), /^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
  assert.match(mocks.phone(), /^\d{10,14}$/);
  assert.ok(Number.isInteger(mocks.numeric()));
});

test("gera senha com os quatro grupos mínimos", () => {
  const password = mocks.password();

  assert.equal(password.length, 12);
  assert.match(password, /[a-z]/);
  assert.match(password, /[A-Z]/);
  assert.match(password, /\d/);
  assert.match(password, /[^A-Za-z0-9]/);
});
