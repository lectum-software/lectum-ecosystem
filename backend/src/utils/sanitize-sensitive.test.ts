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

  it("preserva somente indicador booleano has_password sem expor segredos", () => {
    assert.deepEqual(
      sanitizeSensitiveData({
        has_password: true,
        hasPassword: false,
        nested: {
          has_password: "yes",
          password: "secret",
          password_hash: "secret",
          safe: "ok",
        },
        password: "secret",
      }),
      {
        has_password: true,
        hasPassword: false,
        nested: {
          safe: "ok",
        },
      },
    );
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

  it("redige valores Stripe e SendNF em mensagens, listas e URLs sem depender do nome do campo", () => {
    const secrets = [
      "sk_test_exampleonly",
      "sk_live_exampleonly",
      "rk_test_exampleonly",
      "rk_live_exampleonly",
      "whsec_exampleonly",
      "pi_exampleonly_secret_exampleonly",
      "seti_exampleonly_secret_exampleonly",
      "nt_test_exampleonly",
      "nt_live_exampleonly",
    ];
    for (const secret of secrets) {
      assert.deepEqual(
        sanitizeSensitiveData(
          {
            description: `context ${secret} context`,
            items: [secret],
            url: `https://example.invalid/return?value=${secret}`,
            nested: { diagnostic: secret },
          },
          { removeAuthTokens: true },
        ),
        {
          description: "[REDACTED]",
          items: ["[REDACTED]"],
          url: "[REDACTED]",
          nested: { diagnostic: "[REDACTED]" },
        },
      );
    }
  });

  it("preserva chave publicavel e referencias sem segredo", () => {
    const data = {
      publishable_key: "pk_test_exampleonly",
      nested: { publishable_key: "pk_live_exampleonly" },
      payment_id: "pi_exampleonly",
      setup_id: "seti_exampleonly",
      state: "setup_intent.succeeded",
    };
    assert.deepEqual(sanitizeSensitiveData(data, { removeAuthTokens: true }), data);
  });

  it("preserva URL de intencao curta quando a resposta autoriza tokens", () => {
    const url =
      "https://homolog-api.lectum.com.br/api/public/google/login/device_identifier_123456?intent=delete_account&delete_token=eyJhbGciOiJIUzI1NiJ9.payload.signature";

    assert.deepEqual(sanitizeSensitiveData({ url }, { removeAuthTokens: false }), { url });
    assert.deepEqual(sanitizeSensitiveData({ url }, { removeAuthTokens: true }), {
      url: "[REDACTED]",
    });
  });

  it("preserva JWT somente nos campos estritos de mídia assinada", () => {
    const token = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ2aWRlbyJ9.signature_value";
    const hlsUrl = `https://customer-code_123.cloudflarestream.com/${token}/manifest/video.m3u8`;
    const thumbnailUrl = `https://customer-code_123.cloudflarestream.com/${token}/thumbnails/thumbnail.jpg?time=1s`;

    assert.deepEqual(
      sanitizeSensitiveData(
        { hls_url: hlsUrl, thumbnail_url: thumbnailUrl },
        { allowSignedMediaUrls: true, removeAuthTokens: true },
      ),
      { hls_url: hlsUrl, thumbnail_url: thumbnailUrl },
    );
    assert.deepEqual(
      sanitizeSensitiveData(
        { arbitrary_url: hlsUrl, hls_url: `https://attacker.example/${token}` },
        { allowSignedMediaUrls: true, removeAuthTokens: true },
      ),
      { arbitrary_url: "[REDACTED]", hls_url: "[REDACTED]" },
    );
    assert.deepEqual(
      sanitizeSensitiveData(
        { hls_url: `${hlsUrl}?value=whsec_exampleonly` },
        { allowSignedMediaUrls: true, removeAuthTokens: true },
      ),
      { hls_url: "[REDACTED]" },
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
