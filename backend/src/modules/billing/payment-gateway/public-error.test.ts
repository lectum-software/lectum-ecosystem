import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizePaymentGatewayError } from "./error-log";
import { resolvePaymentGatewayPublicError } from "./public-error";

test("resolvePaymentGatewayPublicError maps Mercado Pago status_detail to safe card copy", () => {
  const result = resolvePaymentGatewayPublicError(
    {
      details: {
        status: 400,
        status_detail: "cc_rejected_insufficient_amount",
      },
    },
    "billing_gateway_checkout_failed",
  );

  assert.deepEqual(result, {
    status: 402,
    code: "billing_gateway_card_insufficient_amount",
  });
});

test("resolvePaymentGatewayPublicError maps Mercado Pago test holder aliases", () => {
  const result = resolvePaymentGatewayPublicError(
    {
      details: {
        status: 400,
        status_detail: "SECU",
      },
    },
    "billing_gateway_checkout_failed",
  );

  assert.deepEqual(result, {
    status: 402,
    code: "billing_gateway_card_security_code",
  });
});

test("resolvePaymentGatewayPublicError keeps generic fallback for unavailable gateway", () => {
  const result = resolvePaymentGatewayPublicError(
    {
      details: {
        status: 500,
      },
    },
    "billing_gateway_checkout_failed",
  );

  assert.deepEqual(result, {
    status: 502,
    code: "billing_gateway_checkout_failed",
  });
});

test("sanitizePaymentGatewayError logs only safe payment metadata", () => {
  const log = sanitizePaymentGatewayError({
    details: {
      cause_codes: ["cc_rejected_bad_filled_security_code"],
      message: "raw provider message must not be logged",
      status: 400,
      status_detail: "cc_rejected_bad_filled_other",
    },
  });

  assert.deepEqual(log, {
    name: "PaymentGatewayError",
    status: 400,
    status_detail: "cc_rejected_bad_filled_other",
    cause_codes: ["cc_rejected_bad_filled_security_code"],
  });
});
