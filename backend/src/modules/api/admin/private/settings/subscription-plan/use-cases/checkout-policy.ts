import {
  getNewSubscriptionGatewayName,
  readStripeConfiguration,
} from "@/modules/billing/payment-gateway/stripe-config";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import { isSupportedStripeCheckoutPrice } from "@/modules/billing/stripe/checkout-price-policy";
import type { AdminSettingsSubscriptionCheckoutDTO } from "../DTOs/IAdminSettingsSubscriptionPlanDTO";
import type { AdminSettingsSubscriptionRecords } from "../repositories/interfaces/IAdminSettingsSubscriptionPlanRepository";

export type AdminCheckoutContext = {
  checkout: AdminSettingsSubscriptionCheckoutDTO;
  identity: StripeIdentity | null;
  webhookConfigured: boolean;
};

/** Reads configuration syntax/runtime only. No client, SDK, network or secret escapes. */
export function readAdminCheckoutContext(env = process.env): AdminCheckoutContext {
  const checkout: AdminSettingsSubscriptionCheckoutDTO = {
    source: "local_configuration",
    gateway: null,
    mode: null,
    status: "invalid_configuration",
    remote_readiness: "not_checked",
    collection_enabled: env.BILLING_STRIPE_COLLECTION_ENABLED === "true",
    reconciliation_enabled: env.BILLING_STRIPE_RECONCILIATION_ENABLED === "true",
    offer: null,
    price: null,
  };
  try {
    checkout.gateway = getNewSubscriptionGatewayName(env);
    if (checkout.gateway === "disabled") {
      checkout.status = "paused";
      return { checkout, identity: null, webhookConfigured: false };
    }
    if (checkout.gateway === "mercadopago") {
      checkout.status = "not_configured";
      return { checkout, identity: null, webhookConfigured: false };
    }
    const configuration = readStripeConfiguration(env);
    checkout.mode = configuration.mode;
    checkout.status = "not_configured";
    return {
      checkout,
      identity: { accountId: configuration.accountId, mode: configuration.mode },
      webhookConfigured: Boolean(configuration.webhookSecret),
    };
  } catch {
    return { checkout, identity: null, webhookConfigured: false };
  }
}

export function projectAdminCheckout(
  context: AdminCheckoutContext,
  records: AdminSettingsSubscriptionRecords,
): AdminSettingsSubscriptionCheckoutDTO {
  const { checkout } = context;
  const { plan, offer, price } = records;
  if (!plan || checkout.gateway === "disabled" || checkout.status === "invalid_configuration")
    return checkout;
  if (checkout.gateway === "mercadopago") {
    const valid =
      Number.isSafeInteger(plan.price_cents) && plan.price_cents > 0 && Boolean(plan.interval);
    return {
      ...checkout,
      status: valid ? (plan.active ? "configured" : "paused") : "invalid_offer",
      price: valid
        ? {
            source: "subscription_plan",
            amount_cents: plan.price_cents,
            currency: "BRL",
            interval: plan.interval,
            interval_count: 1,
            created_at: plan.createdAt.toISOString(),
          }
        : null,
    };
  }
  if (!offer) return checkout;
  const projectedOffer = {
    revision: offer.revision,
    checkout_enabled: offer.checkout_enabled,
    updated_at: offer.updated_at.toISOString(),
  };
  if (!price || !isSupportedStripeCheckoutPrice(price))
    return { ...checkout, offer: projectedOffer, status: "invalid_offer" };
  return {
    ...checkout,
    offer: projectedOffer,
    price: {
      source: "billing_price_version",
      amount_cents: price.amount_cents,
      currency: price.currency,
      interval: price.interval,
      interval_count: price.interval_count,
      created_at: price.created_at.toISOString(),
    },
    status: !context.webhookConfigured
      ? "not_configured"
      : plan.active &&
          offer.checkout_enabled &&
          checkout.collection_enabled &&
          checkout.reconciliation_enabled
        ? "configured"
        : "paused",
  };
}
