import assert from "node:assert/strict";
import { test } from "node:test";
import { requestValidator as checkoutValidator } from "@/modules/api/private/psychologist/billing/checkout/validator";
import { requestValidator as cardValidator } from "@/modules/api/private/psychologist/billing/payment-method/session/validator";

for (const [name, validator] of [
  ["checkout", checkoutValidator],
  ["card update", cardValidator],
] as const) {
  test(`${name} real validator accepts legacy body and validates the optional session`, async () => {
    // Validator's existing schema mode does not invoke a route, repository or gateway.
    const schemas = await validator({ schema: true, language: "pt", headers: {} }, null, () => {
      assert.fail("schema inspection must not execute the next middleware");
    });
    const body = { card_token: "local-unit-card-token", payment_type_id: "credit_card" };
    assert.equal(schemas.body.safeParse(body).success, true);
    for (const session of ["SDK-session_0123", `${"A".repeat(115)}.${"B".repeat(115)}`]) {
      assert.equal(
        schemas.body.parse({ ...body, device_session_id: session }).device_session_id,
        session,
      );
    }
    for (const value of [
      null,
      123,
      [],
      {},
      "",
      "x".repeat(257),
      "valid\n",
      "unsafe\r\nheader",
      "dot.session\u007f",
      "dot.session/other",
      "dot.session+other",
      "dot.session:other",
      "dot.session=other",
      "dot.sessão",
    ]) {
      assert.equal(schemas.body.safeParse({ ...body, device_session_id: value }).success, false);
    }
    assert.equal(schemas.body.safeParse({ ...body, unknown_field: "not-allowed" }).success, false);
  });
}
