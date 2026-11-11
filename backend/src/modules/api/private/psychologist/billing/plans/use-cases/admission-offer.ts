import type { subscription_plan } from "@/interfaces/objects";
import {
  getNewSubscriptionGatewayName,
  readStripeConfiguration,
} from "@/modules/billing/payment-gateway/stripe-config";
import type { StripeIdentity } from "@/modules/billing/payment-gateway/stripe-types";
import { isSupportedStripeCheckoutPrice } from "@/modules/billing/stripe/checkout-price-policy";
import { isValidLocalPaidPlan } from "../../checkout/use-cases/plan-compatibility";
import type { PlanAdmissionOfferDTO } from "../DTOs/IPlansDTO";
import type { PlanAdmissionCatalog } from "../repositories/interfaces/IPlansRepository";

export type PlanAdmissionContext = {
  gateway: "stripe" | "mercadopago" | "disabled" | null;
  identity: StripeIdentity | null;
  enabled: boolean;
};

/** Configuration syntax only: no SDK, remote request, checkout or durable operation. */
export const readPlanAdmissionContext = (env = process.env): PlanAdmissionContext => {
  try {
    const gateway = getNewSubscriptionGatewayName(env);
    if (gateway !== "stripe")
      return { gateway, identity: null, enabled: gateway === "mercadopago" };
    const config = readStripeConfiguration(env);
    return {
      gateway,
      identity: { accountId: config.accountId, mode: config.mode },
      enabled:
        Boolean(config.webhookSecret) &&
        env.BILLING_STRIPE_COLLECTION_ENABLED === "true" &&
        env.BILLING_STRIPE_RECONCILIATION_ENABLED === "true",
    };
  } catch {
    return { gateway: null, identity: null, enabled: false };
  }
};

export const projectPlanAdmissionOffer = (
  plan: subscription_plan,
  context: PlanAdmissionContext,
  catalog: PlanAdmissionCatalog,
): PlanAdmissionOfferDTO => {
  const unavailable: PlanAdmissionOfferDTO = {
    status: context.gateway === "disabled" ? "paused" : "unavailable",
    source: "none",
    amount_cents: null,
    currency: "BRL",
    interval: "month",
    revision: null,
  };
  if (plan.slug !== "profissional" || plan.active !== true || plan.deleted === true)
    return unavailable;
  if (context.gateway === "mercadopago")
    return isValidLocalPaidPlan(plan)
      ? {
          ...unavailable,
          status: "available",
          source: "legacy_plan",
          amount_cents: plan.price_cents!,
        }
      : unavailable;
  const { offer, price } = catalog;
  const identity = context.identity;
  if (
    context.gateway !== "stripe" ||
    !identity ||
    !offer ||
    !price ||
    offer.plan_id !== plan.id ||
    price.plan_id !== plan.id ||
    offer.price_version_id !== price.id ||
    offer.gateway !== "stripe" ||
    price.gateway !== "stripe" ||
    offer.mode !== identity.mode ||
    price.mode !== identity.mode ||
    offer.account_id !== identity.accountId ||
    price.account_id !== identity.accountId ||
    !Number.isSafeInteger(offer.revision) ||
    offer.revision < 1 ||
    !isSupportedStripeCheckoutPrice(price)
  )
    return unavailable;
  if (!context.enabled || !offer.checkout_enabled)
    return { ...unavailable, status: "paused", source: "versioned_offer" };
  return {
    ...unavailable,
    status: "available",
    source: "versioned_offer",
    amount_cents: price.amount_cents,
    revision: `${offer.id}:${offer.revision}`,
  };
};
