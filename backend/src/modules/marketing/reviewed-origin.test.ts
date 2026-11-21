import assert from "node:assert/strict";
import { test } from "node:test";
import { MARKETING_CONSENT_POLICY } from "./consent-policy";
import { reviewedUserSourceUrl, USER_CONVERSIONS, USER_DELIVERY_POLICY } from "./user-events";

test("reviewed origin is preserved; detailed or foreign URLs are never rewritten", () => {
  assert.equal(USER_DELIVERY_POLICY.documentVersion, MARKETING_CONSENT_POLICY.documentVersion);
  for (const conversion of USER_CONVERSIONS) {
    assert.equal(
      reviewedUserSourceUrl(conversion, "https://www.lectum.com.br/"),
      "https://www.lectum.com.br/",
    );
    for (const source of [
      undefined,
      "https://lectum.com.br/",
      "https://www.lectum.com.br/psicologos/private-id",
      "https://www.lectum.com.br/comunidades/private-topic",
      "https://www.lectum.com.br/?fbclid=private",
      "https://www.lectum.com.br/#private",
      "https://attacker.invalid/",
    ]) {
      assert.equal(reviewedUserSourceUrl(conversion, source), null);
    }
  }
});
