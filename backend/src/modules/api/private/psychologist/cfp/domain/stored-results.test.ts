import assert from "node:assert/strict";
import test from "node:test";
import type { CfpResult } from "../DTOs/ICfpDTO";
import { asStoredRaw, extractStoredResults } from "./stored-results";

const result: CfpResult = {
  active: true,
  data_inscricao: "01/01/2020",
  key: "local-unit-key",
  nome: "Unidade local",
  nome_regional: "LOCAL",
  registro: "000123",
  situacao: "ATIVO",
};

test("resultado armazenado mantém chave e normaliza registro sem mutar entrada", () => {
  const raw = { provider: "infosimples", normalized_results: [result] };
  const before = structuredClone(raw);
  assert.deepEqual(extractStoredResults({ raw }), [{ ...result, registro: "123" }]);
  assert.deepEqual(raw, before);
});

test("extração mantém compatibilidade com resposta legada sem lista normalizada", () => {
  const results = extractStoredResults({
    raw: { provider: "infosimples", response: { data: [{ resultados: [result] }] } },
  });
  assert.equal(results.length, 1);
  assert.equal(results[0].registro, "123");
  assert.equal(results[0].active, true);
  assert.equal(results[0].key, "123_local_01-01-2020_unidade-local_0");
});

test("lista normalizada vazia não ressuscita resultado da resposta antiga", () => {
  assert.deepEqual(
    extractStoredResults({
      raw: {
        provider: "infosimples",
        normalized_results: [],
        response: { resultados: [result] },
      },
    }),
    [],
  );
});

test("checagem de revisão humana não vira resultado automático", () => {
  const raw = { provider: "manual_admin", normalized_results: [result] };
  assert.equal(asStoredRaw(raw), null);
  assert.deepEqual(extractStoredResults({ raw }), []);
});

test("atividade falsa do registro armazenado permanece falsa", () => {
  const results = extractStoredResults({
    raw: {
      provider: "infosimples",
      normalized_results: [{ ...result, active: false }],
    },
  });
  assert.equal(results[0].active, false);
});

test("ausência de evidência retorna lista vazia, sem provider ou fallback externo", () => {
  for (const raw of [null, [], "invalid", 1, {}]) {
    assert.equal(asStoredRaw(raw), null);
    assert.deepEqual(extractStoredResults({ raw }), []);
  }
});
