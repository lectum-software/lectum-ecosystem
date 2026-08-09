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
  assert.equal(isSafePublicErrorMessage("At least one policy returned UNAUTHORIZED."), false);
  assert.equal(
    isSafePublicErrorMessage(
      "The template with id e2c13c5c96d34a499c377ddadeeb38f2 does not exist",
    ),
    false,
  );
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

test("remove PII e credenciais de mensagens sem apagar mensagens de domínio", () => {
  const unsafeMessages = [
    "Conta patient@example.com já existe.",
    "CPF 123.456.789-01 recusado.",
    "Telefone +55 (11) 99999-9999 inválido.",
    "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
    "token=super-secret-value",
    "Falha com chave sk-proj-AbCdEfGhIjKlMnOpQrStUvWx",
    "postgresql://user:password@database.internal/lectum",
  ];

  for (const message of unsafeMessages) {
    assert.equal(isSafePublicErrorMessage(message), false);
  }

  assert.equal(isSafePublicErrorMessage("O e-mail informado já está cadastrado."), true);
  assert.equal(isSafePublicErrorMessage("O telefone informado é inválido."), true);
});

test("não permite fallback técnico nem objetos não simples em erros públicos", () => {
  assert.equal(
    sanitizePublicErrorMessage("Prisma P2002", "database_url=postgresql://secret"),
    "Não foi possível concluir a solicitação agora.",
  );
  assert.equal(sanitizePublicErrorData(Buffer.from("segredo")), "[REDACTED]");
  assert.equal(sanitizePublicErrorData(new Date("2026-08-08T00:00:00.000Z")), "[REDACTED]");
  assert.equal(sanitizePublicErrorData(new Map([["secret", "value"]])), "[REDACTED]");
});

test("interrompe ciclos em dados de erro públicos", () => {
  const circular: Record<string, unknown> = {
    binary: Buffer.from("segredo"),
    id: "d9428888-122b-4a47-a2c2-8f6c4cbe1234",
    message: "Valor inválido.",
    model: "psychologist_profile",
  };
  circular.self = circular;

  assert.deepEqual(sanitizePublicErrorData(circular), {
    binary: "[REDACTED]",
    id: "Valor inválido.",
    message: "Valor inválido.",
    self: "[REDACTED]",
  });
});
