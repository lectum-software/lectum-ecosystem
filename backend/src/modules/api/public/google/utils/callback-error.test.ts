import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE,
  GOOGLE_AUTH_FALLBACK_MESSAGE,
  resolveGoogleCallbackFailureMessage,
} from "./callback-error";

describe("Google callback public errors", () => {
  it("orienta cadastro ou troca de conta quando o e-mail Google não tem cadastro", () => {
    const message = resolveGoogleCallbackFailureMessage({
      code: "account_not_registered",
      success: false,
    });

    assert.equal(message, GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE);
    assert.match(message, /Crie uma conta/);
    assert.match(message, /use outra conta do Google/);
  });

  it("não repassa erros genéricos do fluxo OAuth para a UI", () => {
    const message = resolveGoogleCallbackFailureMessage({
      code: "google_unexpected_error",
      success: false,
    });

    assert.equal(message, GOOGLE_AUTH_FALLBACK_MESSAGE);
  });
});
