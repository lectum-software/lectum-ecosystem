import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeSensitiveData } from "./sanitize-sensitive";

describe("sanitizeSensitiveData", () => {
  it("remove segredos em snake_case, kebab-case e camelCase", () => {
    const sanitized = sanitizeSensitiveData({
      accessToken: "secret",
      card_token: "secret",
      clientSecret: "secret",
      connection_string: "postgresql://user:password@database/internal",
      nested: {
        auth: "secret",
        oauth_client_secret: "secret",
        password_confirm: "secret",
        safe: "ok",
        temporary_password_hash: "secret",
      },
      push_p256dh: "secret",
      raw: { provider_payload: "secret" },
      provider_error: { code: "raw-provider-code" },
      providerMessage: "raw provider message",
    });

    assert.deepEqual(sanitized, { nested: { safe: "ok" } });
  });

  it("remove token genérico quando a resposta não o autoriza", () => {
    assert.deepEqual(
      sanitizeSensitiveData(
        { access_session_token: "secret", user_tokens: ["secret"], value: true },
        { removeAuthTokens: true },
      ),
      { value: true },
    );
    assert.deepEqual(sanitizeSensitiveData({ token: "allowed" }), { token: "allowed" });
  });

  it("remove PII de registros de auditoria quando solicitado", () => {
    assert.deepEqual(
      sanitizeSensitiveData(
        {
          contact_email: "patient@example.com",
          nested: {
            description: "contato alternativo patient@example.com",
            profile_cpf: "12345678901",
            safe: "ok",
            whatsapp: "+5511999999999",
          },
        },
        { removePii: true },
      ),
      { nested: { description: "[REDACTED]", safe: "ok" } },
    );
  });

  it("redige credenciais mesmo quando a chave não denuncia o conteúdo", () => {
    assert.deepEqual(
      sanitizeSensitiveData(
        {
          diagnostic: "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature",
          safe: "ok",
        },
        { removeAuthTokens: true },
      ),
      { diagnostic: "[REDACTED]", safe: "ok" },
    );
  });

  it("não recursa indefinidamente em estruturas circulares", () => {
    const circular: Record<string, unknown> = { safe: true };
    circular.self = circular;

    assert.deepEqual(sanitizeSensitiveData(circular), {
      safe: true,
      self: "[REDACTED]",
    });
  });
  it("preserva aliases reaproveitados quando eles nao sao ciclos", () => {
    const subscription = {
      id: "subscription-id",
      plan: {
        name: "Plano Profissional",
        slug: "profissional",
      },
      source: "admin_grant",
      status: "ativa",
    };

    assert.deepEqual(sanitizeSensitiveData({ current: subscription, subscription }), {
      current: subscription,
      subscription,
    });
  });
});
