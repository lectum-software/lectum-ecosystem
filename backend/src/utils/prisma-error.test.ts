import assert from "node:assert/strict";
import test from "node:test";
import { getPrismaErrorCode, isPrismaErrorCode } from "./prisma-error";

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
