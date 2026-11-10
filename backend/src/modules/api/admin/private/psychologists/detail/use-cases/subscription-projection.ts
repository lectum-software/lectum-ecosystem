import {
  financialContractValue,
  isStripeFinancialContract,
} from "@/modules/billing/subscription-financial-values";
import { timeToFirstPaidSubscription } from "@/utils/admin-psychologist-analytics";
import type { AdminPsychologistDetailDTO } from "../DTOs/IAdminPsychologistDetailDTO";
import type { AdminPsychologistDetailRecord } from "../repositories/AdminPsychologistDetailRepository";

const gatewayLabel = (
  subscription: AdminPsychologistDetailRecord["subscriptions"][number] | null,
) => {
  const value = (subscription?.gateway || subscription?.source || "").toLowerCase();
  if (value.includes("mercadopago") || value.includes("mercado_pago")) return "Mercado Pago";

  if (value === "stripe") return "Stripe";
  return subscription?.gateway || null;
};

const subscriptionSourceDate = (
  subscription: AdminPsychologistDetailRecord["subscriptions"][number] | null,
) => subscription?.grant_started_at ?? subscription?.createdAt ?? null;

export const buildAdminDetailSubscription = (
  profile: AdminPsychologistDetailRecord,
  subscription: AdminPsychologistDetailRecord["subscriptions"][number] | null,
) => {
  const paymentMethod =
    subscription && isStripeFinancialContract(subscription)
      ? (profile.user.payment_methods.find(
          (method) =>
            method.gateway === "stripe" &&
            method.gateway_token === subscription.gateway_subscription_id &&
            method.gateway_mode === subscription.gateway_mode &&
            method.gateway_account_id === subscription.gateway_account_id,
        ) ?? null)
      : (profile.user.payment_methods[0] ?? null);

  return {
    current_period_end: subscription?.current_period_end ?? null,
    gateway: subscription?.gateway ?? null,
    gateway_label: gatewayLabel(subscription),
    id: subscription?.id ?? null,
    interval: subscription ? financialContractValue(subscription).interval : null,
    payment_method: paymentMethod
      ? {
          brand: paymentMethod.brand,
          exp_month: paymentMethod.exp_month,
          exp_year: paymentMethod.exp_year,
          gateway: paymentMethod.gateway,
          last4: paymentMethod.last4,
        }
      : null,
    plan_name: subscription?.plan.name ?? null,
    plan_slug: subscription?.plan.slug ?? null,
    price_cents: subscription ? financialContractValue(subscription).amountCents : null,
    source: subscription?.source ?? null,
    started_at: subscriptionSourceDate(subscription),
    status: subscription?.status ?? null,
    time_to_first_paid_subscription: timeToFirstPaidSubscription({
      currentSubscription: subscription,
      registeredAt: profile.user.createdAt,
      subscriptions: profile.subscriptions,
    }),
  } satisfies AdminPsychologistDetailDTO["general"]["subscription"];
};
