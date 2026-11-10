import type Stripe from "stripe";
import type { StripeMode } from "./stripe-types";

/**
 * This is a live preflight, not evidence that a sandbox transaction will succeed.
 * Sandbox capabilities can be inactive while test operations are permitted.
 * Identity, key mode and runtime isolation must be checked independently first.
 */
export const isStripeCheckoutCapabilityReady = (
  mode: StripeMode,
  account: Pick<Stripe.Account, "charges_enabled" | "capabilities">,
): boolean =>
  mode === "test" ||
  (mode === "live" &&
    account.charges_enabled === true &&
    account.capabilities?.card_payments === "active");
