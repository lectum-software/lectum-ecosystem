import assert from "node:assert/strict";
import { test } from "node:test";
import { classifyGatewayMessage } from "./diagnostic";
import { sanitizePaymentGatewayError } from "./error-log";
import { MercadoPagoAdapterError } from "./MercadoPagoAdapter";

test("adapter retains a fixed diagnostic without exposing provider text", () => {
  const err = new MercadoPagoAdapterError("create_subscription", {
    status: 400,
    message: "Both payer and collector must be real or test users",
    payer_email: "private@example.invalid",
  });
  assert.deepEqual(sanitizePaymentGatewayError(err), {
    name: "PaymentGatewayError",
    status: 400,
    diagnostic: "account_environment_mismatch",
  });
});

test("unrecognized messages and arbitrary diagnostics never enter logs", () => {
  for (const message of [
    "private@example.invalid",
    "constructor",
    "card token not found: private-token",
    null,
  ]) {
    assert.equal(classifyGatewayMessage(message), undefined);
  }
  assert.deepEqual(
    sanitizePaymentGatewayError({ details: { status: 400, diagnostic: "private_token" } }),
    {
      name: "PaymentGatewayError",
      status: 400,
    },
  );
});

test("CVV validation diagnostic does not leak the provider message", () => {
  assert.equal(
    classifyGatewayMessage("Card token was generated without cvv validation."),
    "card_token_cvv_validation_missing",
  );
});
