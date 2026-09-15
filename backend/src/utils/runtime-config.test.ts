import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getTrustProxySetting,
  isDisposableRuntime,
  isPublishedRuntime,
  isTrustProxyEnabled,
  parsePositiveInteger,
} from "./runtime-config";

describe("parsePositiveInteger", () => {
  it("aceita inteiros positivos dentro do limite", () => {
    assert.equal(parsePositiveInteger("12", 5, { max: 20 }), 12);
  });

  it("usa o valor seguro para entradas vazias, fracionadas ou fora do limite", () => {
    assert.equal(parsePositiveInteger("", 5), 5);
    assert.equal(parsePositiveInteger("1.5", 5), 5);
    assert.equal(parsePositiveInteger("21", 5, { max: 20 }), 5);
  });
});

describe("published runtime", () => {
  it("protege produção, homologação e staging com seus aliases operacionais", () => {
    for (const value of [
      "production",
      "prod",
      "prd",
      "homolog",
      "homologation",
      "homol",
      "hml",
      "stage",
      "staging",
      "stg",
    ]) {
      assert.equal(isPublishedRuntime(value), true);
    }
  });

  it("não classifica ambientes descartáveis ou desconhecidos como publicados", () => {
    for (const value of [undefined, "", "development", "dev", "test", "custom"]) {
      assert.equal(isPublishedRuntime(value), false);
    }
  });
});

describe("disposable runtime", () => {
  it("mantém aliases de boot e operações locais coerentes", () => {
    for (const value of ["ci", "dev", "development", "local", "test", "testing"]) {
      assert.equal(isDisposableRuntime(value), true);
      assert.equal(isPublishedRuntime(value), false);
    }
  });

  it("não classifica ambiente publicado ou desconhecido como descartável", () => {
    for (const value of [undefined, "", "homolog", "staging", "production", "custom"]) {
      assert.equal(isDisposableRuntime(value), false);
    }
  });
});

describe("trust proxy", () => {
  const withTrustProxy = (value: string | undefined, assertion: () => void) => {
    const previous = process.env.TRUST_PROXY;

    try {
      if (value === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = value;

      assertion();
    } finally {
      if (previous === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = previous;
    }
  };

  it("mantém headers encaminhados desabilitados sem configuração explícita", () => {
    withTrustProxy(undefined, () => {
      assert.equal(getTrustProxySetting(), false);
      assert.equal(isTrustProxyEnabled(), false);
    });
  });

  it("aceita booleano ou quantidade explícita de proxies", () => {
    withTrustProxy("true", () => assert.equal(getTrustProxySetting(), true));
    withTrustProxy("1", () => {
      assert.equal(getTrustProxySetting(), 1);
      assert.equal(isTrustProxyEnabled(), true);
    });
  });

  it("rejeita valores ambíguos", () => {
    withTrustProxy("yes", () => assert.equal(getTrustProxySetting(), false));
    withTrustProxy("-1", () => assert.equal(getTrustProxySetting(), false));
  });
});
