import type { GatewaySubscriptionPlan } from "@/modules/billing/payment-gateway/PaymentGateway";

export const isValidLocalPaidPlan = (plan: {
  price_cents?: number | null;
  interval?: string | null;
}) =>
  Number.isSafeInteger(plan.price_cents) &&
  Number(plan.price_cents) > 0 &&
  (plan.interval === "month" || plan.interval === "monthly");

export const isCompatibleGatewayPlan = (
  gatewayPlan: GatewaySubscriptionPlan,
  plan: { price_cents?: number | null; interval?: string | null },
) => {
  if (!isValidLocalPaidPlan(plan) || gatewayPlan.amount_cents !== plan.price_cents) return false;
  if (gatewayPlan.gateway_status !== "active") return false;
  const raw = gatewayPlan.raw;
  if (typeof raw !== "object" || raw === null || !("auto_recurring" in raw)) return false;
  const recurring = raw.auto_recurring;
  if (typeof recurring !== "object" || recurring === null) return false;
  return (
    "currency_id" in recurring &&
    recurring.currency_id === "BRL" &&
    "frequency_type" in recurring &&
    recurring.frequency_type === "months" &&
    "frequency" in recurring &&
    recurring.frequency === 1
  );
};
