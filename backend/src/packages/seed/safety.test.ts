import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertSafeSeedTarget } from "./safety";

const localEnvironment = {
  DATABASE_URL: "postgresql://lectum:password@localhost:5432/lectum_dev",
  LECTUM_CONFIRM_DB_RESET: "1",
  NODE_ENV: "development",
};

describe("assertSafeSeedTarget", () => {
  it("aceita somente um banco local confirmado", () => {
    assert.doesNotThrow(() => assertSafeSeedTarget(localEnvironment));
  });

  it("bloqueia ambiente publicado, alvo remoto e ausência de confirmação", () => {
    assert.throws(
      () => assertSafeSeedTarget({ ...localEnvironment, NODE_ENV: "production" }),
      /ambiente publicado/,
    );
    assert.throws(
      () => assertSafeSeedTarget({ ...localEnvironment, NODE_ENV: "homolog" }),
      /ambiente publicado/,
    );
    assert.throws(
      () =>
        assertSafeSeedTarget({
          ...localEnvironment,
          DATABASE_URL: "postgresql://lectum:password@10.0.0.8:5432/lectum_dev",
        }),
      /somente bancos locais/,
    );
    assert.throws(
      () => assertSafeSeedTarget({ ...localEnvironment, LECTUM_CONFIRM_DB_RESET: undefined }),
      /confirmação explícita/,
    );
    assert.throws(
      () => assertSafeSeedTarget({ ...localEnvironment, NODE_ENV: undefined }),
      /ambiente descartável não identificado/,
    );
    assert.throws(
      () =>
        assertSafeSeedTarget({
          ...localEnvironment,
          DATABASE_URL: "postgresql://lectum:password@db:5432/lectum_dev",
          NODE_ENV: undefined,
        }),
      /ambiente descartável não identificado/,
    );
  });

  it("bloqueia nomes de homologação mesmo em host local", () => {
    assert.throws(
      () =>
        assertSafeSeedTarget({
          ...localEnvironment,
          DATABASE_URL: "postgresql://lectum:password@localhost:5432/lectum_homolog",
        }),
      /homologação ou produção/,
    );
  });
});
