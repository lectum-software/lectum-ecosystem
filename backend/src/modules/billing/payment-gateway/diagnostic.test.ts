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

test("unknown provider messages expose only fixed hints including nested descriptions", () => {
  const err = new MercadoPagoAdapterError("create_subscription", {
    status: 400,
    message: "The card token is invalid for this application: private-token-value",
    cause: [{ description: "payer email private@example.invalid does not match collector" }],
  });
  const log = sanitizePaymentGatewayError(err);
  assert.equal(log.diagnostic, "provider_error_unclassified");
  assert.deepEqual(log.diagnostic_hints, [
    "card_token",
    "payer",
    "collector",
    "email",
    "application",
    "invalid",
  ]);
  assert.doesNotMatch(JSON.stringify(log), /private-token|private@example/);
});

test("nested known messages are classified and message-free errors remain explicit", () => {
  const nested = new MercadoPagoAdapterError("create_subscription", {
    status: 400,
    errors: [{ description: "Card token was generated without cvv validation" }],
  });
  assert.equal(sanitizePaymentGatewayError(nested).diagnostic, "card_token_cvv_validation_missing");
  assert.equal(
    sanitizePaymentGatewayError(new MercadoPagoAdapterError("create_subscription", { status: 400 }))
      .diagnostic,
    "provider_error_unclassified",
  );
});

test("forged hints cannot inject personal data or provider text", () => {
  const log = sanitizePaymentGatewayError({
    details: {
      status: 400,
      diagnostic_hints: ["email", "private@example.invalid", "private-token", "email"],
    },
  });
  assert.deepEqual(log.diagnostic_hints, ["email"]);
});
