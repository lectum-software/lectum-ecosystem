import assert from "node:assert/strict";
import test from "node:test";
import { buildLocationCaptureResult } from "./response";

test("location capture publica somente o resultado necessário ao cliente", () => {
  const result = buildLocationCaptureResult({
    authenticated: true,
    captured: false,
    linked: true,
    reason: "frequency",
  });

  assert.deepEqual(result, {
    authenticated: true,
    captured: false,
    linked: true,
    reason: "frequency",
  });
  assert.equal("source" in result, false);
  assert.equal("session" in result, false);
});
