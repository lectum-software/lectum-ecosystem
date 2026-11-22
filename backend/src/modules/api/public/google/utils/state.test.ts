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
  for (const role of ["paciente", "psicologo"]) {
    it("keeps server consent outside callback query and binds it to the original deadline", () => {
      const now = Date.now();
      const ref = {
        tokenHash: "a".repeat(64),
        documentVersion: "synthetic-user-notice",
        preparedAt: now,
        expiresAt: now + 60_000,
      };
      const query = { intent: "register", role, marketing_guest_token: "b".repeat(64) };
      const prepared = createGoogleOAuthState("device_identifier_123", query, ref);
      const decoded = verifyGoogleOAuthState(prepared.state, prepared.nonce)!;
      assert.deepEqual(decoded.marketingConsent, ref);
      assert.deepEqual(decoded.query, { intent: "register", role });
      assert.equal(prepared.state.includes(ref.tokenHash), false);
      assert.equal(verifyGoogleOAuthState(prepared.state, "another-browser"), null);
      const next = createGoogleOAuthState(
        decoded.device_id,
        decoded.query,
        decoded.marketingConsent,
      );
      assert.deepEqual(verifyGoogleOAuthState(next.state, next.nonce)?.marketingConsent, ref);
      const untrusted = createGoogleOAuthState("device_identifier_123", {
        ...query,
        marketingConsent: ref,
      });
      assert.equal(
        verifyGoogleOAuthState(untrusted.state, untrusted.nonce)?.marketingConsent,
        undefined,
      );
      for (const invalid of [
        { ...ref, expiresAt: now - 1 },
        { ...ref, expiresAt: now + 11 * 60_000 },
      ]) {
        const state = createGoogleOAuthState("device_identifier_123", query, invalid);
        assert.equal(verifyGoogleOAuthState(state.state, state.nonce)?.marketingConsent, undefined);
      }
      const login = createGoogleOAuthState(
        "device_identifier_123",
        { intent: "login", role: "paciente" },
        ref,
      );
      assert.equal(verifyGoogleOAuthState(login.state, login.nonce)?.marketingConsent, undefined);
    });
  }
  it("preserva autorizacao explicita sem presumir autorizacao ausente", () => {
    for (const promotional of [undefined, "false", "true"]) {
      const { nonce, state } = createGoogleOAuthState("device_identifier_123", {
        role: "psicologo",
        intent: "register",
        legal_document_ids: "terms-version,privacy-version",
        promotional_authorized: promotional,
      });
      const query = verifyGoogleOAuthState(state, nonce)?.query;
      assert.equal(query?.promotional_authorized, promotional);
      assert.equal(query?.legal_document_ids, "terms-version,privacy-version");
      assert.equal(verifyGoogleOAuthState(state, "another-browser"), null);
    }
  });
  it("preserva nascimento cifrado e vinculado ao navegador sem expor a data no state", () => {
    for (const role of ["paciente", "psicologo"]) {
      const { nonce, state } = createGoogleOAuthState("device_identifier_123", {
        intent: "register",
        role,
        birthdate: "1990-04-03",
        adult_confirmed: "true",
      });
      assert.equal(state.includes("1990-04-03"), false);
      assert.equal(verifyGoogleOAuthState(state, nonce)?.query.birthdate, "1990-04-03");
      assert.equal(verifyGoogleOAuthState(state, "wrong-browser"), null);
    }
  });
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
