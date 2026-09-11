import assert from "node:assert/strict";
import test from "node:test";
import type { PatientProfileGender } from "@/modules/api/private/patient/profile/DTOs/IProfileDTO";
import { normalizeGender, normalizeKey } from "./gender";

test("BA04: todos os gêneros permitidos têm rótulo, preservando os IDs", () => {
  const labels = {
    feminino: "Feminino",
    masculino: "Masculino",
    nao_binario: "Outro",
    prefiro_nao_dizer: "Prefiro não dizer",
  } satisfies Record<PatientProfileGender, string>;
  for (const [id, label] of Object.entries(labels)) {
    assert.deepEqual(normalizeGender(id), { id, label });
  }
});

test("BA04: preferir não dizer permanece distinto de gênero ausente", () => {
  assert.deepEqual(normalizeGender(" Prefiro não dizer "), {
    id: "prefiro_nao_dizer",
    label: "Prefiro não dizer",
  });
  for (const value of [undefined, null, ""]) {
    assert.deepEqual(normalizeGender(value), { id: "nao_informado", label: "Não informado" });
  }
});

test("BA04: aliases, fallback e chaves de filtros legados são preservados", () => {
  for (const [value, label] of [
    ["female", "Feminino"],
    ["mulher", "Feminino"],
    ["male", "Masculino"],
    ["homem", "Masculino"],
    ["não_binário", "Outro"],
    ["outro", "Outro"],
    ["other", "Outro"],
    [" Valor legado ", "Valor legado"],
  ]) {
    assert.deepEqual(normalizeGender(value), { id: normalizeKey(value), label });
  }
  assert.equal(normalizeKey("  Prefiro NÃO dizer  "), "prefiro_nao_dizer");
  assert.equal(normalizeKey("___"), "");
});

test("BR05: chave herdada recebe fallback textual, nunca função", () => {
  for (const value of ["constructor", " CONSTRUCTOR "]) {
    const gender = normalizeGender(value);
    assert.deepEqual(gender, { id: "constructor", label: value.trim() });
    assert.equal(typeof gender.label, "string");
  }
});

test("BR05: toString normalizado e legado não vazio preservam ID e texto", () => {
  for (const [value, id, label] of [
    [" toString ", "tostring", "toString"],
    [" Valor legado ", "valor_legado", "Valor legado"],
    ["___", "nao_informado", "___"],
  ]) {
    assert.deepEqual(normalizeGender(value), { id, label });
  }
});

test("BR05: vazio e whitespace retornam Não informado", () => {
  for (const value of [undefined, null, "", " ", "\t\n", "\u00a0"]) {
    assert.deepEqual(normalizeGender(value), { id: "nao_informado", label: "Não informado" });
  }
});
