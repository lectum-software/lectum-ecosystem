import { isStripeTerminalSubscriptionStatus } from "../payment-gateway/stripe-cancellation";
import type { StripeCanonicalSubscription, StripeIdentity } from "../payment-gateway/stripe-types";
import { StripeBillingError } from "./policy";

/** User cancellation must observe the exact confirmed stop after the provider mutation. */
export const assertStripeUserCancellationConfirmed = (
  remote: Pick<
    StripeCanonicalSubscription,
    | "subscriptionId"
    | "localSubscriptionId"
    | "accountId"
    | "mode"
    | "cancelAtPeriodEnd"
    | "gatewayStatus"
  >,
  expected: { subscriptionId: string; localSubscriptionId: string; identity: StripeIdentity },
) => {
  if (
    remote.subscriptionId !== expected.subscriptionId ||
    remote.localSubscriptionId !== expected.localSubscriptionId ||
    remote.accountId !== expected.identity.accountId ||
    remote.mode !== expected.identity.mode ||
    (!remote.cancelAtPeriodEnd && !isStripeTerminalSubscriptionStatus(remote.gatewayStatus))
  )
    throw new StripeBillingError("billing_operation_conflict");
};
