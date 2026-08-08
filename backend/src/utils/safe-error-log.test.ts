import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toSafeErrorLog } from "./safe-error-log";

describe("toSafeErrorLog", () => {
  it("mantém somente o nome seguro do erro", () => {
    const error = new Error("segredo que não pode ir ao log");
    error.name = "ProviderError";

    assert.deepEqual(toSafeErrorLog(error), { name: "ProviderError" });
  });

  it("usa fallback sem serializar valores desconhecidos", () => {
    assert.deepEqual(toSafeErrorLog({ message: "dado sensível" }, "FallbackError"), {
      name: "FallbackError",
    });
  });
});
