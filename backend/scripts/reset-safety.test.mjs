import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyR2ResetTarget, classifyResetRuntimeEnvironment } from "./reset-safety.mjs";

const endpoint = "https://account.r2.cloudflarestorage.com";

describe("classifyR2ResetTarget", () => {
  it("permite bucket inequivocamente descartável", () => {
    assert.equal(
      classifyR2ResetTarget({ bucketName: "lectum-dev-assets", endpoint, prefix: "" }),
      "safe",
    );
  });

  it("permite somente um prefixo dedicado em bucket genérico", () => {
    assert.equal(
      classifyR2ResetTarget({ bucketName: "lectum-assets", endpoint, prefix: "dev/local-reset/" }),
      "safe",
    );
  });

  it("bloqueia bucket remoto genérico sem prefixo descartável", () => {
    assert.equal(
      classifyR2ResetTarget({ bucketName: "lectum-assets", endpoint, prefix: "" }),
      "not_explicitly_disposable",
    );
    assert.equal(
      classifyR2ResetTarget({ bucketName: "lectum-assets", endpoint, prefix: "uploads/" }),
      "not_explicitly_disposable",
    );
  });

  it("bloqueia qualquer marcador de ambiente publicado", () => {
    assert.equal(
      classifyR2ResetTarget({
        bucketName: "lectum-production-assets",
        endpoint,
        prefix: "dev/local-reset/",
      }),
      "published_marker",
    );
  });

  it("bloqueia prefixo ambíguo ou com travessia", () => {
    for (const prefix of ["../dev/", "dev", "test", "development-reset"]) {
      assert.equal(
        classifyR2ResetTarget({ bucketName: "lectum-assets", endpoint, prefix }),
        "not_explicitly_disposable",
        prefix,
      );
    }
  });
});

describe("classifyResetRuntimeEnvironment", () => {
  it("aceita somente ambientes explicitamente descartáveis", () => {
    for (const nodeEnv of ["development", "dev", "local", "test", "testing", "ci"]) {
      assert.equal(classifyResetRuntimeEnvironment(nodeEnv), "safe");
    }
  });

  it("bloqueia ambiente ausente, desconhecido ou publicado", () => {
    assert.equal(classifyResetRuntimeEnvironment(undefined), "not_explicitly_disposable");
    assert.equal(classifyResetRuntimeEnvironment(""), "not_explicitly_disposable");
    assert.equal(classifyResetRuntimeEnvironment("custom"), "not_explicitly_disposable");
    assert.equal(classifyResetRuntimeEnvironment("homologation"), "published");
    assert.equal(classifyResetRuntimeEnvironment("production"), "published");
  });
});
