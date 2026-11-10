import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrismaErrorCode,
  isPrismaErrorCode,
  isSerializableRetryableError,
} from "./prisma-error";

test("identifica códigos conhecidos do Prisma sem depender da classe do erro", () => {
  const error = { code: "P2002", meta: { target: ["email"] } };

  assert.equal(getPrismaErrorCode(error), "P2002");
  assert.equal(isPrismaErrorCode(error, "P2002"), true);
  assert.equal(isPrismaErrorCode(error, ["P2025", "P2034"]), false);
});

test("rejeita formatos de erro sem código textual", () => {
  assert.equal(getPrismaErrorCode(null), null);
  assert.equal(getPrismaErrorCode(new Error("failure")), null);
  assert.equal(getPrismaErrorCode({ code: 2002 }), null);
});

test("retry Serializable reconhece conflito estruturado do adapter sem analisar mensagens", () => {
  for (const code of ["P2002", "P2034"]) {
    assert.equal(isSerializableRetryableError({ code }), true);
  }
  const adapterError = {
    name: "DriverAdapterError",
    cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
  };
  assert.equal(isSerializableRetryableError(adapterError), true);
  assert.equal(getPrismaErrorCode(adapterError), null, "não remapeia códigos de outros callers");
});

test("retry Serializable não repete resultado incerto, autenticação, timeout ou erro genérico", () => {
  for (const error of [
    null,
    undefined,
    "40001",
    new Error("TransactionWriteConflict 40001"),
    { code: "40001" },
    { code: "P2025" },
    { name: "DriverAdapterError" },
    { name: "Error", cause: { kind: "TransactionWriteConflict", originalCode: "40001" } },
    { name: "DriverAdapterError", cause: null },
    { name: "DriverAdapterError", cause: "40001" },
    { name: "DriverAdapterError", cause: { kind: "SocketTimeout", originalCode: "40001" } },
    { name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict" } },
    {
      name: "DriverAdapterError",
      cause: { kind: "TransactionWriteConflict", originalCode: 40001 },
    },
    {
      name: "DriverAdapterError",
      cause: { kind: "TransactionWriteConflict", originalCode: "28000" },
    },
    {
      name: "DriverAdapterError",
      cause: { kind: "TransactionWriteConflict", originalCode: "57014" },
    },
  ]) {
    assert.equal(isSerializableRetryableError(error), false);
  }
});

test("only P2010 with explicit PostgreSQL serialization SQLSTATE is retryable", () => {
  assert.equal(isSerializableRetryableError({ code: "P2010", meta: { code: "40001" } }), true);
  for (const error of [
    { code: "P2010", meta: { code: "23505" } },
    { code: "P2010", meta: { code: "40P01" } },
    { code: "P2010", meta: { code: "42601" } },
    { code: "P2010", meta: { code: 40001 } },
    { code: "P2010", message: "40001", meta: {} },
    { code: "P2010" },
    { code: "P1001", meta: { code: "40001" } },
    { code: "40001" },
    null,
  ])
    assert.equal(isSerializableRetryableError(error), false);
});

test("existing Prisma and adapter-pg conflict handling is preserved", () => {
  for (const code of ["P2002", "P2034"]) assert.equal(isSerializableRetryableError({ code }), true);
  assert.equal(
    isSerializableRetryableError({
      name: "DriverAdapterError",
      cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
    }),
    true,
  );
});

test("P2010 accepts the adapter-pg serialization envelope observed in the real row-lock regression", () => {
  const wrapped = (kind: string, originalCode: unknown) => ({
    code: "P2010",
    meta: { driverAdapterError: { name: "DriverAdapterError", cause: { kind, originalCode } } },
  });
  assert.equal(isSerializableRetryableError(wrapped("TransactionWriteConflict", "40001")), true);
  for (const error of [
    wrapped("TransactionWriteConflict", "57014"),
    wrapped("SocketTimeout", "40001"),
    wrapped("TransactionWriteConflict", 40001),
    { code: "P2010", meta: { driverAdapterError: new Error("40001") } },
  ])
    assert.equal(isSerializableRetryableError(error), false);
});
