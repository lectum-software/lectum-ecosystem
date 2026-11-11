import type { SubscriptionPlan } from "@/api/generator/types/billing";

export type PlanAdmissionPresentation = {
  amountCents: number | null;
  canContinue: boolean;
  status: "available" | "paused" | "unavailable" | "unknown";
};

/** A legacy reference price is neither today's Stripe offer nor a new contract quote. */
export const billingPlanAdmission = (plan: SubscriptionPlan): PlanAdmissionPresentation => {
  if (plan.slug === "gratuito")
    return {
      amountCents: plan.price_cents === 0 ? 0 : null,
      canContinue: plan.price_cents === 0 && plan.active !== false,
      status: plan.price_cents === 0 && plan.active !== false ? "available" : "unavailable",
    };
  if (plan.slug !== "profissional" || plan.active === false)
    return { amountCents: null, canContinue: false, status: "unavailable" };
  const offer = plan.admission_offer;
  // Tolerate an older backend without advertising its mutable legacy reference.
  if (offer === undefined) return { amountCents: null, canContinue: true, status: "unknown" };
  if (offer?.status === "paused")
    return { amountCents: null, canContinue: false, status: "paused" };
  if (
    offer?.status !== "available" ||
    offer.currency !== "BRL" ||
    offer.interval !== "month" ||
    !Number.isSafeInteger(offer.amount_cents) ||
    Number(offer.amount_cents) <= 0 ||
    (offer.source !== "versioned_offer" && offer.source !== "legacy_plan") ||
    (offer.source === "versioned_offer" &&
      (Number(offer.amount_cents) < 50 ||
        Number(offer.amount_cents) > 99_999_999 ||
        typeof offer.revision !== "string" ||
        !offer.revision ||
        offer.revision.length > 200))
  )
    return { amountCents: null, canContinue: false, status: "unavailable" };
  return { amountCents: offer.amount_cents, canContinue: true, status: "available" };
};

export const formatBillingPlanPrice = (priceCents: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceCents / 100);
