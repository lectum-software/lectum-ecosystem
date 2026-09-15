import assert from "node:assert/strict";
import test from "node:test";
import { z } from "zod";
import { buildValidationObjectMap } from "./build-object-map";

test("monta o mapa de validação de forma síncrona", () => {
  const result = buildValidationObjectMap([{ key: "name", method: "string", optional: true }], {
    string: () => z.string(),
  });

  assert.equal(result.name.safeParse(undefined).success, true);
  assert.equal(result.name.safeParse("Lectum").success, true);
});

test("propaga configuração inválida antes de processar a requisição", () => {
  assert.throws(
    () => buildValidationObjectMap([{ key: "name", method: "missing" }], {}),
    /Método "missing" não encontrado/,
  );
});
