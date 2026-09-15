import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertDisposableLocalDatabaseTarget } from "./local-database-safety";

const localEnvironment = {
  DATABASE_URL: "postgresql://lectum:password@localhost:5432/lectum_dev",
  NODE_ENV: "development",
};

describe("disposable local database safety", () => {
  it("aceita bootstrap somente em ambiente descartável e banco local", () => {
    assert.doesNotThrow(() =>
      assertDisposableLocalDatabaseTarget(localEnvironment, "Bootstrap administrativo"),
    );
  });

  it("bloqueia ambiente ausente/publicado e banco remoto antes de qualquer operação", () => {
    assert.throws(
      () =>
        assertDisposableLocalDatabaseTarget(
          { ...localEnvironment, NODE_ENV: undefined },
          "Bootstrap administrativo",
        ),
      /ambiente descartável não identificado/,
    );
    assert.throws(
      () =>
        assertDisposableLocalDatabaseTarget(
          { ...localEnvironment, NODE_ENV: "production" },
          "Bootstrap administrativo",
        ),
      /ambiente publicado/,
    );
    assert.throws(
      () =>
        assertDisposableLocalDatabaseTarget(
          {
            ...localEnvironment,
            DATABASE_URL: "postgresql://lectum:password@database.example.com:5432/lectum_dev",
          },
          "Bootstrap administrativo",
        ),
      /somente bancos locais/,
    );
  });

  it("não considera host interno suficiente sem NODE_ENV descartável explícito", () => {
    assert.throws(
      () =>
        assertDisposableLocalDatabaseTarget(
          {
            DATABASE_URL: "postgresql://lectum:password@db:5432/lectum_dev",
          },
          "Bootstrap administrativo",
        ),
      /ambiente descartável não identificado/,
    );
  });
});
