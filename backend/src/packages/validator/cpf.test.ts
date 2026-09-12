import assert from "node:assert/strict";
import { before, test } from "node:test";
import { createInstance } from "i18next";
import zodMessages from "../../../locales/pt/zod.json";
import { setI18n } from "./i18n";
import cpf from "./schema/_internal/validations/functions/cpf";

before(async () => {
  const i18n = createInstance();
  await i18n.init({ lng: "pt", resources: { pt: { zod: zodMessages } } });
  setI18n(i18n, "pt");
});

// Apenas sequências intencionalmente inválidas, sem documentos pessoais ou geradores.
for (let digit = 0; digit <= 9; digit++) {
  test(`CPF rejeita sequência repetida do dígito ${digit}`, () => {
    const group = String(digit).repeat(3);
    const input = `${group}.${group}.${group}-${String(digit).repeat(2)}`;
    const result = cpf({ key: "cpf" }).safeParse(input);
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.error.issues[0]?.message, "CPF deve ser válido");
    assert.equal(JSON.stringify(result.error.issues).includes(input), false);
  });
}

test("CPF preserva máscara estrita, dígitos verificadores e tipo string", () => {
  const schema = cpf({ key: "cpf" });
  for (const input of [
    "00000000000",
    "000.000.000-01",
    "000.000.001-00",
    "000.000.000-0",
    "000.000.000-000",
    "000/000/000-00",
    "aaa.aaa.aaa-aa",
    " 000.000.000-00",
    "000.000.000-00\n",
    0,
    false,
    {},
    [],
  ]) {
    assert.equal(schema.safeParse(input).success, false);
  }
});

test("CPF mantém vazio legado no helper e wrappers optional/nullable", () => {
  const schema = cpf({ key: "cpf" });
  assert.equal(schema.parse(""), "");
  assert.equal(schema.safeParse(undefined).success, false);
  assert.equal(schema.safeParse(null).success, false);
  assert.equal(schema.optional().parse(undefined), undefined);
  assert.equal(schema.optional().safeParse(null).success, false);
  assert.equal(schema.nullable().parse(null), null);
  assert.equal(schema.nullable().safeParse(undefined).success, false);
  assert.equal(schema.optional().nullable().parse(undefined), undefined);
  assert.equal(schema.optional().nullable().parse(null), null);
});
