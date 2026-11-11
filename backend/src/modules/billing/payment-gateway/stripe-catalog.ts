import type Stripe from "stripe";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  parseStripePlan,
  requireLocalReference,
  requireStripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export type StripeCatalogPriceInput = {
  operationId: string;
  fingerprint: string;
  productId: string;
  amountCents: number;
  lookupKey: string;
  idempotencyKey: string;
};
export function assertCatalogPriceEvidence(
  price: Stripe.Price,
  input: StripeCatalogPriceInput,
  identity: StripeIdentity,
) {
  const plan = parseStripePlan(price, identity);
  if (
    !plan.active ||
    plan.productId !== input.productId ||
    plan.amountCents !== input.amountCents ||
    price.lookup_key !== input.lookupKey ||
    price.metadata.lectum_catalog_operation !== input.operationId ||
    price.metadata.lectum_catalog_fingerprint !== input.fingerprint
  )
    throw new StripeGatewayError("contract_invalid");
  return plan;
}
export const stripeCatalogApi = (
  client: Stripe,
  identity: () => StripeIdentity,
  run: <T>(action: () => Promise<T>) => Promise<T>,
) => ({
  getStripePlan: (id: string) =>
    run(async () => {
      const expected = requireStripeId(id, "price");
      const price = await client.prices.retrieve(expected, { expand: ["product"] });
      if (price.id !== expected) throw new StripeGatewayError("resource_mismatch");
      return parseStripePlan(price, identity());
    }),
  createStripeCatalogPrice: (input: StripeCatalogPriceInput) =>
    run(async () => {
      requireLocalReference(input.operationId);
      requireStripeId(input.productId, "prod");
      if (
        !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
        !Number.isSafeInteger(input.amountCents) ||
        input.amountCents < 50 ||
        input.amountCents > 99999999 ||
        input.lookupKey.length > 200 ||
        input.idempotencyKey.length > 255
      )
        throw new StripeGatewayError("contract_invalid");
      const product = await client.products.retrieve(input.productId);
      if ("deleted" in product || !product.active) throw new StripeGatewayError("contract_invalid");
      assertStripeMode(product.livemode, identity());
      const price = await client.prices.create(
        {
          product: input.productId,
          currency: "brl",
          unit_amount: input.amountCents,
          recurring: { interval: "month", interval_count: 1, usage_type: "licensed" },
          lookup_key: input.lookupKey,
          metadata: {
            lectum_catalog_operation: input.operationId,
            lectum_catalog_fingerprint: input.fingerprint,
          },
          expand: ["product"],
        },
        { idempotencyKey: input.idempotencyKey },
      );
      return assertCatalogPriceEvidence(price, input, identity());
    }),
  findStripeCatalogPrice: (input: StripeCatalogPriceInput) =>
    run(async () => {
      const prices = await client.prices.list({
        lookup_keys: [input.lookupKey],
        product: requireStripeId(input.productId, "prod"),
        limit: 2,
        expand: ["data.product"],
      });
      if (prices.has_more || prices.data.length > 1)
        throw new StripeGatewayError("resource_mismatch");
      return prices.data[0] ? assertCatalogPriceEvidence(prices.data[0], input, identity()) : null;
    }),
});
