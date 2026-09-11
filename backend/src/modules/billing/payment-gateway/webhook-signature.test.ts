import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyMercadoPagoWebhookSignature } from "./webhook-signature";

// Local cryptographic vectors only: no adapter, credentials or provider request.
const input = { secret: "isolated-hmac-test-vector", dataId: "12345", requestId: "request-1" };
const ts = "1789128000";
const digest = createHmac("sha256", input.secret)
  .update(`id:${input.dataId};request-id:${input.requestId};ts:${ts};`)
  .digest("hex");
const signature = `ts=${ts},v1=${digest}`;

test("webhook signature accepts an exact HMAC and rejects wrong binding", () => {
  assert.equal(verifyMercadoPagoWebhookSignature({ ...input, signature }), true);
  for (const change of [{ dataId: "54321" }, { requestId: "request-2" }, { secret: "different" }]) {
    assert.equal(verifyMercadoPagoWebhookSignature({ ...input, ...change, signature }), false);
  }
});

test("webhook signature rejects Buffer hex truncation and ambiguous headers", () => {
  for (const value of [
    `${signature}garbage`,
    `${signature}0`,
    `${signature},v1=${digest}`,
    `ts=wrong,${signature}`,
    [signature, signature],
  ]) {
    assert.equal(verifyMercadoPagoWebhookSignature({ ...input, signature: value }), false);
  }
  assert.equal(
    verifyMercadoPagoWebhookSignature({
      ...input,
      signature,
      requestId: [input.requestId, "other"],
    }),
    false,
  );
});
