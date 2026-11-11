import assert from "node:assert/strict";
import { test } from "node:test";
import type Stripe from "stripe";
import { assertCatalogPriceEvidence, type StripeCatalogPriceInput } from "./stripe-catalog";
import { StripeGatewayError } from "./stripe-error";

const identity = { accountId: "acct_local", mode: "test" as const };
const input: StripeCatalogPriceInput = {
  operationId: "operation-local",
  fingerprint: "a".repeat(64),
  amountCents: 3990,
  productId: "prod_local",
  lookupKey: "lectum_catalog_local",
  idempotencyKey: "lectum:catalog-local",
};
const row = {
  id: "price_local",
  active: true,
  livemode: false,
  type: "recurring",
  currency: "brl",
  unit_amount: 3990,
  recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
  billing_scheme: "per_unit",
  transform_quantity: null,
  product: { id: "prod_local", livemode: false, active: true },
  lookup_key: input.lookupKey,
  metadata: {
    lectum_catalog_operation: input.operationId,
    lectum_catalog_fingerprint: input.fingerprint,
  },
} as unknown as Stripe.Price;
test("remote Price evidence binds lookup and metadata to durable operation, product, amount and mode", () => {
  assert.equal(assertCatalogPriceEvidence(row, input, identity).amountCents, 3990);
  for (const change of [
    { lookup_key: "other" },
    { metadata: { lectum_catalog_operation: "other" } },
    { metadata: { ...row.metadata, lectum_catalog_fingerprint: "b".repeat(64) } },
    { livemode: true },
    { unit_amount: 2990 },
    { active: false },
    { product: { id: "prod_other", livemode: false, active: true } },
  ])
    assert.throws(
      () => assertCatalogPriceEvidence({ ...row, ...change } as Stripe.Price, input, identity),
      StripeGatewayError,
    );
});
