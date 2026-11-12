import { createHash } from "node:crypto";
import type { StripeIdentity } from "./stripe-types";

/** Keep the established provider key byte-for-byte; retries must never get a new key. */
export const stripeIdempotencyKey = (
  identity: StripeIdentity,
  operation: string,
  reference: string,
) =>
  `lectum-${operation}-${createHash("sha256")
    .update(`${identity.accountId}:${identity.mode}:${reference}`)
    .digest("hex")}`;

/** Only the digest crosses the verified webhook boundary, never the provider request key. */
export const projectStripeCreditCardRequestHash = (value: unknown): string | null =>
  typeof value === "string" &&
  value.length === "lectum-credit-card-".length + 64 &&
  /^lectum-credit-card-[a-f0-9]{64}$/.test(value)
    ? createHash("sha256").update(value).digest("hex")
    : null;

export const stripeCreditCardRequestHash = (
  identity: StripeIdentity,
  subscriptionId: string,
  paymentMethodId: string,
) =>
  createHash("sha256")
    .update(stripeIdempotencyKey(identity, "credit-card", `${subscriptionId}:${paymentMethodId}`))
    .digest("hex");
