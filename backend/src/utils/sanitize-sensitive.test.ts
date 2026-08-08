import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeSensitiveData } from "./sanitize-sensitive";

describe("sanitizeSensitiveData", () => {
  it("remove segredos em snake_case, kebab-case e camelCase", () => {
    const sanitized = sanitizeSensitiveData({
      accessToken: "secret",
      card_token: "secret",
      clientSecret: "secret",
      nested: { password_confirm: "secret", safe: "ok" },
    });

    assert.deepEqual(sanitized, { nested: { safe: "ok" } });
  });

  it("remove token genérico quando a resposta não o autoriza", () => {
    assert.deepEqual(
      sanitizeSensitiveData({ token: "secret", value: true }, { removeAuthTokens: true }),
      { value: true },
    );
    assert.deepEqual(sanitizeSensitiveData({ token: "allowed" }), { token: "allowed" });
  });
});
