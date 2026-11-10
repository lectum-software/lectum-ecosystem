import { isStripeFinancialContract } from "@/modules/billing/subscription-financial-values";
import type { AdminFinancePaymentMethod } from "../../DTOs/IAdminFinanceDashboardDTO";
import type { FinanceSubscriptionRecord } from "./subscriptions";

export const mapPaymentMethod = (
  subscription: FinanceSubscriptionRecord,
): AdminFinancePaymentMethod | null => {
  const methods = subscription.psychologist.user.payment_methods.filter(
    (method) =>
      method.gateway === subscription.gateway &&
      (!isStripeFinancialContract(subscription) ||
        (method.gateway_mode === subscription.gateway_mode &&
          method.gateway_account_id === subscription.gateway_account_id)),
  );
  const matchedMethod =
    methods.find(
      (method) =>
        Boolean(subscription.gateway_subscription_id) &&
        method.gateway_token === subscription.gateway_subscription_id,
    ) ?? null;
  const method =
    matchedMethod ?? (isStripeFinancialContract(subscription) ? null : methods[0]) ?? null;

  if (!method) return null;

  return {
    brand: method.brand ?? null,
    exp_month: method.exp_month ?? null,
    exp_year: method.exp_year ?? null,
    gateway: method.gateway,
    last4: method.last4 ?? null,
    matches_subscription: Boolean(matchedMethod),
    saved_at: method.updatedAt?.toISOString() ?? null,
  };
};
