import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSafeApiErrorMessage, getSafePublicErrorMessage } from "./errors.ts";

test("erros padrão de validação externos usam orientação PT-BR", () => {
  for (const message of [
    "Invalid field",
    "Invalid input: expected string, received undefined",
    "Invalid email address",
    "Too small: expected string to have >=3 characters",
    "Too big: expected array to have <=10 items",
    "Validation error",
  ]) {
    assert.equal(getSafePublicErrorMessage(message, "Revise este campo."), "Revise este campo.");
    assert.equal(
      getSafeApiErrorMessage({ status: 400, error: message }, "Revise os dados informados."),
      "Revise os dados informados.",
    );
  }
});

test("mensagens de domínio PT-BR preservam instruções úteis", () => {
  for (const message of [
    "E-mail inválido.",
    "Informe os 6 dígitos do código.",
    "Texto deve conter pelo menos 3 caracteres.",
    "Envie um vídeo de até 300MB.",
  ]) {
    assert.equal(getSafePublicErrorMessage(message), message);
    assert.equal(getSafeApiErrorMessage({ status: 400, error: message }), message);
  }
});

test("aviso de conexão Google não expõe configuração técnica", () => {
  const source = readFileSync(
    new URL("../app/app/settings/account/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /OAuth não está configurado|bloqueado neste ambiente/);
  assert.match(source, /Não é possível conectar sua conta ao Google agora\./);
});
