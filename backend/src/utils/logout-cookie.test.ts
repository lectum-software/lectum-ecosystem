import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldClearLogoutCookie } from "./logout-cookie";

describe("logout cookie lifecycle", () => {
  it("limpa a credencial somente depois que a revogação foi concluída", () => {
    assert.equal(shouldClearLogoutCookie({ success: true }), true);
    assert.equal(shouldClearLogoutCookie({ success: false }), false);
  });
});
