import type { professional_subscription } from "@/interfaces/objects";
import { getPaymentGateway, getStripeGateway, type PaymentGatewayName } from "./payment-gateway";
import type { StripeIdentity } from "./payment-gateway/stripe-types";

export type StoredSubscriptionProvider = Pick<
  professional_subscription,
  "gateway" | "source" | "gateway_mode" | "gateway_account_id"
>;

/** Persisted ownership selects servicing; never the gateway configured for new sales. */
export const subscriptionGatewayName = (
  subscription?: StoredSubscriptionProvider | null,
): PaymentGatewayName | null => {
  if (!subscription) return null;
  const { gateway, source } = subscription;
  if (source === "admin_grant" || source === "free_signup") return null;
  if (gateway && gateway !== "mercadopago" && gateway !== "stripe") return null;
  if (gateway && (source === "mercadopago" || source === "stripe") && gateway !== source)
    return null;
  if (gateway === "mercadopago" || gateway === "stripe") return gateway;
  return source === "mercadopago" || source === "stripe" ? source : null;
};

export const assertStripeSubscriptionIdentity = (
  subscription: StoredSubscriptionProvider,
  identity: StripeIdentity,
) => {
  if (
    subscriptionGatewayName(subscription) !== "stripe" ||
    subscription.gateway_mode !== identity.mode ||
    subscription.gateway_account_id !== identity.accountId
  )
    throw new Error("BILLING_SUBSCRIPTION_GATEWAY_UNAVAILABLE");
};

export const getStoredSubscriptionGateway = (subscription: StoredSubscriptionProvider) => {
  const provider = subscriptionGatewayName(subscription);
  if (!provider) throw new Error("BILLING_SUBSCRIPTION_GATEWAY_UNAVAILABLE");
  if (provider === "stripe") {
    const gateway = getStripeGateway();
    assertStripeSubscriptionIdentity(subscription, gateway.identity);
    return gateway;
  }
  return getPaymentGateway("mercadopago");
};

/** Old contracts retain their existing projection; do not invent a historical backfill. */
export const withContractedPlan = <T extends professional_subscription>(subscription: T): T => {
  if (subscriptionGatewayName(subscription) !== "stripe" || !subscription.plan) return subscription;
  const valid =
    Number.isSafeInteger(subscription.contracted_amount_cents) &&
    Number(subscription.contracted_amount_cents) > 0 &&
    subscription.contracted_currency === "BRL" &&
    subscription.contracted_interval === "month" &&
    subscription.contracted_interval_count === 1;
  return {
    ...subscription,
    plan: {
      ...subscription.plan,
      price_cents: valid ? subscription.contracted_amount_cents : null,
      interval: valid ? subscription.contracted_interval : null,
    },
  };
};
