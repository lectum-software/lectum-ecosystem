import assert from "node:assert/strict";
import { test } from "node:test";
import { StripeGatewayError, stripeFailure, stripeFailureObservation } from "./stripe-error";

test("Stripe failures expose closed operational diagnostics without retaining SDK payload", () => {
  const input = {
    type: "StripeCardError",
    code: "card_declined",
    statusCode: 402,
    requestId: "req_diagnosticprobe",
    message: "sensitive provider message",
    raw: { card: "secret-card", customer: "private@example.invalid" },
    headers: { authorization: "secret" },
  };
  const failure = stripeFailure(input);
  assert.equal(failure.kind, "provider_unavailable");
  assert.equal(failure.details.diagnostic, "card_declined");
  assert.match(failure.details.request_ref ?? "", /^[a-f0-9]{24}$/);
  assert.deepEqual(stripeFailureObservation(failure), {
    http_status: 402,
    failure_diagnostic: "card_declined",
    request_ref: failure.details.request_ref,
  });
  assert.equal(stripeFailure(failure), failure);
  for (const secret of [
    input.message,
    input.raw.card,
    input.raw.customer,
    input.requestId,
    "authorization",
  ])
    assert.equal(JSON.stringify(failure).includes(secret), false);
  assert.equal(failure.cause, undefined);
});

test("transport, permission, rate limit and unknown errors remain distinguishable", () => {
  for (const [input, diagnostic] of [
    [{ type: "StripeConnectionError" }, "transport_unavailable"],
    [{ code: "ETIMEDOUT" }, "transport_unavailable"],
    [{ statusCode: 429 }, "rate_limited"],
    [{ statusCode: 500 }, "provider_unavailable"],
    [{ statusCode: 403 }, "access_denied"],
    [{ statusCode: 400 }, "request_invalid"],
    [{ code: "authentication_required" }, "authentication_required"],
    [new Error("internal failure"), "unknown_failure"],
  ] as const)
    assert.equal(stripeFailure(input).details.diagnostic, diagnostic);
  assert.equal(
    new StripeGatewayError("provider_unavailable").details.diagnostic,
    "unknown_failure",
  );
});

test("untrusted accessors and identifiers cannot replace the safe diagnostic or leak data", () => {
  const error = new Proxy(
    {},
    {
      get() {
        throw new Error("private");
      },
    },
  );
  assert.equal(stripeFailure(error).details.diagnostic, "unknown_failure");
  const dangerous = {
    toString() {
      throw new Error("private");
    },
  };
  assert.equal(stripeFailure({ code: dangerous }).details.diagnostic, "unknown_failure");
  for (const requestId of ["req_bad\nsecret", "private@example.invalid", `req_${"x".repeat(101)}`])
    assert.equal(stripeFailure({ requestId }).details.request_ref, undefined);
  assert.equal(stripeFailure({ statusCode: 999 }).details.status, undefined);
});
