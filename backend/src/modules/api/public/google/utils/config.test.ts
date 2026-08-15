import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createGoogleOAuthLoginUrl,
  isGoogleOAuthConfigured,
  parseGoogleHttpUrl,
  sanitizeGoogleCallbackTarget,
} from "./config";

const withGoogleEnvironment = (
  values: Record<string, string | undefined>,
  assertion: () => void,
) => {
  const previous = new Map(Object.keys(values).map((key) => [key, process.env[key]]));

  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assertion();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
};

describe("Google OAuth URL config", () => {
  it("aceita origens HTTP(S) puras sem credenciais", () => {
    assert.equal(
      parseGoogleHttpUrl("https://api.example.com", { originOnly: true })?.origin,
      "https://api.example.com",
    );
    assert.equal(
      parseGoogleHttpUrl("http://localhost:3001", { originOnly: true })?.origin,
      "http://localhost:3001",
    );
  });

  it("recusa protocolos, credenciais e componentes extras em origens", () => {
    for (const value of [
      "javascript:alert(1)",
      "//example.com",
      "https:///example.com",
      "https:////example.com",
      "https://*.example.com",
      "https:\\example.com",
      "https://user:password@example.com",
      "https://example.com/api",
      "https://example.com?query=1",
      "https://example.com#hash",
    ]) {
      assert.equal(parseGoogleHttpUrl(value, { originOnly: true }), null);
    }
  });

  it("em produção exige HTTPS com hostname externo, sem IP literal", () => {
    assert.equal(
      parseGoogleHttpUrl("http://external.example.com", { productionRuntime: true }),
      null,
    );
    assert.equal(
      parseGoogleHttpUrl("https://external.example.com", { productionRuntime: true })?.origin,
      "https://external.example.com",
    );
    for (const value of [
      "http://localhost:3000",
      "https://localhost",
      "https://127.0.0.1",
      "https://8.8.8.8",
      "https://[2001:4860:4860::8888]",
    ]) {
      assert.equal(parseGoogleHttpUrl(value, { productionRuntime: true }), null);
    }
    assert.equal(
      sanitizeGoogleCallbackTarget("http://external.example.com/auth", "/", {
        productionRuntime: true,
      }),
      "/",
    );
  });

  it("aplica a política publicada também em homologação e staging", () => {
    for (const nodeEnv of ["homolog", "homologation", "stage", "staging"]) {
      withGoogleEnvironment({ NODE_ENV: nodeEnv }, () => {
        assert.equal(parseGoogleHttpUrl("http://external.example.com"), null);
        assert.equal(parseGoogleHttpUrl("https://localhost"), null);
        assert.equal(
          parseGoogleHttpUrl("https://external.example.com")?.origin,
          "https://external.example.com",
        );
      });
    }
  });

  it("normaliza callbacks internos/HTTP(S) e aplica fallback seguro", () => {
    assert.equal(sanitizeGoogleCallbackTarget("/auth/error"), "/auth/error");
    assert.equal(
      sanitizeGoogleCallbackTarget("https://app.example.com/auth/redirect"),
      "https://app.example.com/auth/redirect",
    );

    for (const value of [
      "//attacker.example/path",
      "javascript:alert(1)",
      "https://user:password@app.example.com/path",
      "/auth\\redirect",
    ]) {
      assert.equal(sanitizeGoogleCallbackTarget(value), "/");
    }
  });

  it("só anuncia OAuth configurado quando o callback público também é seguro", () => {
    const baseEnvironment = {
      CALLBACK_URL_API_USER: "https://app.example.com/auth/redirect",
      GOOGLE_CLIENT_ID_API_USER: "client-id",
      GOOGLE_CLIENT_SECRET_API_USER: "client-secret",
      GOOGLE_OAUTH_BASE_URL: "https://api.example.com",
      NODE_ENV: "production",
    };

    withGoogleEnvironment(baseEnvironment, () => {
      assert.equal(isGoogleOAuthConfigured(), true);
    });
    withGoogleEnvironment(
      { ...baseEnvironment, CALLBACK_URL_API_USER: "http://app.example.com/auth/redirect" },
      () => {
        assert.equal(isGoogleOAuthConfigured(), false);
      },
    );
    withGoogleEnvironment(
      { ...baseEnvironment, CALLBACK_URL_API_USER: "javascript:alert(1)" },
      () => {
        assert.equal(isGoogleOAuthConfigured(), false);
      },
    );
  });

  it("gera a URL pública de login Google com o identificador do dispositivo no caminho", () => {
    withGoogleEnvironment(
      {
        GOOGLE_OAUTH_BASE_URL: "https://api.example.com",
        NODE_ENV: "production",
      },
      () => {
        assert.equal(
          createGoogleOAuthLoginUrl("device_identifier_123")?.toString(),
          "https://api.example.com/api/public/google/login/device_identifier_123",
        );
      },
    );
  });
});
