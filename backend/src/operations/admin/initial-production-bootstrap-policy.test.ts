import assert from "node:assert/strict";
import test from "node:test";

import {
  assertInitialProductionBootstrapFlags,
  assertInitialProductionBootstrapTarget,
} from "./initial-production-bootstrap-policy";

test("aceita somente a origem canônica de produção", () => {
  assert.doesNotThrow(() =>
    assertInitialProductionBootstrapTarget({
      BASE: "https://api.lectum.com.br",
      NODE_ENV: "production",
    }),
  );

  for (const environment of [
    { BASE: "https://homolog-api.lectum.com.br", NODE_ENV: "production" },
    { BASE: "https://api.lectum.com.br.evil.example", NODE_ENV: "production" },
    { BASE: "https://api.lectum.com.br", NODE_ENV: "homolog" },
  ]) {
    assert.throws(() => assertInitialProductionBootstrapTarget(environment));
  }
});

test("exige confirmação e senha exclusiva via stdin", () => {
  assert.doesNotThrow(() =>
    assertInitialProductionBootstrapFlags({ confirm: "production", passwordSource: "stdin" }),
  );

  assert.throws(() =>
    assertInitialProductionBootstrapFlags({ confirm: "production", passwordSource: "environment" }),
  );
  assert.throws(() =>
    assertInitialProductionBootstrapFlags({ confirm: undefined, passwordSource: "stdin" }),
  );
});
