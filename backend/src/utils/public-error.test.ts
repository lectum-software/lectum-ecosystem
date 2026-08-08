import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafePublicErrorMessage,
  sanitizePublicErrorData,
  sanitizePublicErrorMessage,
} from "./public-error";

test("preserva mensagens de domínio próprias para usuários", () => {
  const message = "O CPF informado já está cadastrado.";

  assert.equal(isSafePublicErrorMessage(message), true);
  assert.equal(sanitizePublicErrorMessage(message), message);
});

test("remove detalhes de infraestrutura e rastros internos", () => {
  assert.equal(isSafePublicErrorMessage("Prisma P2002 unique constraint failed"), false);
  assert.equal(
    sanitizePublicErrorMessage("TypeError at /app/dist/index.js:10"),
    "Não foi possível concluir a solicitação agora.",
  );
});

test("limpa mensagens técnicas aninhadas sem apagar campos de validação", () => {
  assert.deepEqual(
    sanitizePublicErrorData({
      body: {
        cpf: "CPF inválido.",
        email: "Request failed with status code 500",
      },
    }),
    {
      body: {
        cpf: "CPF inválido.",
        email: "Valor inválido.",
      },
    },
  );
});
