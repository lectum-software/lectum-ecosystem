import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSafeErrorLog } from "./safe-error-log";

describe("toSafeErrorLog", () => {
  it("não revela o nome técnico do erro", () => {
    const error = new Error("segredo que não pode ir ao log");
    error.name = "PrismaClientKnownRequestError";

    assert.deepEqual(toSafeErrorLog(error, "DatabaseOperationError"), {
      name: "DatabaseOperationError",
    });
  });

  it("usa fallback sem serializar valores desconhecidos", () => {
    assert.deepEqual(toSafeErrorLog({ message: "dado sensível" }, "FallbackError"), {
      name: "FallbackError",
    });
  });

  it("recusa classificações dinâmicas fora do formato controlado", () => {
    assert.deepEqual(toSafeErrorLog(new Error(), "provider:error/message"), {
      name: "UnknownError",
    });
  });
});
