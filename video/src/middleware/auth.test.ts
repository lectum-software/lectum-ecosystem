import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bearerTokenMatches } from "./auth.js";

const key = "a-secure-service-key-with-at-least-32-characters";

describe("service authentication", () => {
  it("aceita somente Bearer com o segredo completo", () => {
    assert.equal(bearerTokenMatches(`Bearer ${key}`, key), true);
    assert.equal(bearerTokenMatches(key, key), false);
    assert.equal(bearerTokenMatches("Bearer invalid", key), false);
    assert.equal(bearerTokenMatches(undefined, key), false);
  });
});
