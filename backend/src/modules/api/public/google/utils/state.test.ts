import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import jwt from "jsonwebtoken";
import {
  createGoogleDeleteReauthStateCookie,
  createGoogleOAuthState,
  verifyGoogleDeleteReauthStateCookie,
  verifyGoogleOAuthState,
} from "./state";

before(() => {
  process.env.JWT_SECRET_KEY = "test-secret-with-at-least-32-characters";
});

describe("Google OAuth state", () => {
  it("vincula o retorno ao nonce do navegador que iniciou o fluxo", () => {
    const { nonce, state } = createGoogleOAuthState("device_identifier_123", {
      redirectTo: "/app/perfil",
    });

    assert.equal(verifyGoogleOAuthState(state, "outro-nonce"), null);
    assert.equal(verifyGoogleOAuthState(state, nonce)?.query.redirectTo, "/app/perfil");
  });

  it("descarta redirecionamentos externos e parâmetros desconhecidos", () => {
    const { nonce, state } = createGoogleOAuthState("device_identifier_123", {
      ignored: "value",
      redirectTo: "https://example.com",
    });
    const payload = verifyGoogleOAuthState(state, nonce);

    assert.deepEqual(payload?.query, {});
  });

  it("mantém dados internos opacos e rejeita adulteração", () => {
    const { nonce, state } = createGoogleOAuthState("device_identifier_123", {
      link_token: "internal-token-value",
    });
    const parts = state.split(".");

    assert.equal(parts[0], "v1");
    assert.equal(state.includes("internal-token-value"), false);

    parts[2] = `${parts[2]?.startsWith("A") ? "B" : "A"}${parts[2]?.slice(1)}`;
    assert.equal(verifyGoogleOAuthState(parts.join("."), nonce), null);
  });

  it("aceita por transição states assinados pela versão anterior", () => {
    const nonce = "legacy-browser-nonce";
    const legacyState = jwt.sign(
      {
        device_id: "device_identifier_123",
        nonce,
        query: { redirectTo: "/app/perfil" },
      },
      process.env.JWT_SECRET_KEY!,
      {
        audience: "lectum-google-oauth",
        expiresIn: 600,
        issuer: "lectum-api",
      },
    );

    assert.equal(verifyGoogleOAuthState(legacyState, nonce)?.query.redirectTo, "/app/perfil");
  });

  it("preserva intencao curta de exclusao Google mesmo sem nonce do OAuth", () => {
    const cookie = createGoogleDeleteReauthStateCookie("device_identifier_123", {
      callbackUrl: "/app/configuracoes/conta?deleteReauth=ok",
      delete_token: "token-assinado",
      intent: "delete_account",
    });

    assert.ok(cookie);
    const payload = verifyGoogleDeleteReauthStateCookie(cookie);

    assert.equal(payload?.device_id, "device_identifier_123");
    assert.equal(payload?.query.intent, "delete_account");
    assert.equal(payload?.query.delete_token, "token-assinado");
    assert.equal(payload?.query.callbackUrl, "/app/configuracoes/conta?deleteReauth=ok");
    assert.equal(verifyGoogleDeleteReauthStateCookie("invalido"), null);
    assert.equal(
      createGoogleDeleteReauthStateCookie("device_identifier_123", {
        intent: "delete_account",
      }),
      null,
    );
  });
});
