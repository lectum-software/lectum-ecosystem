import { StripeGatewayError } from "./stripe-error";

/** Stripe can end an unpaid incomplete contract as incomplete_expired after cancellation. */
export const isStripeTerminalSubscriptionStatus = (status: string) =>
  status === "canceled" || status === "incomplete_expired";

/** Stopping future collection is independent from payment proof and local entitlement. */
export const stripeCancellationMutation = (status: string) => {
  if (isStripeTerminalSubscriptionStatus(status)) return { kind: "unchanged" } as const;
  if (status === "incomplete" || status === "trialing") {
    return { kind: "cancel", params: { invoice_now: false, prorate: false } } as const;
  }
  if (["active", "past_due", "unpaid", "paused"].includes(status)) {
    return {
      kind: "update",
      params: { cancel_at_period_end: true, proration_behavior: "none" },
    } as const;
  }
  throw new StripeGatewayError("contract_invalid");
};
