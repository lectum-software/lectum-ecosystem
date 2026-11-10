import { StripeGatewayError } from "./stripe-error";
import { isStripeRuntimeAllowed } from "./stripe-runtime";
import type { StripeIdentity } from "./stripe-types";

export const STRIPE_API_VERSION = "2026-10-28.endive" as const;
export type StripeConfiguration = StripeIdentity & {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string | null;
};

export const readStripeConfiguration = (env = process.env): StripeConfiguration => {
  const mode = env.STRIPE_ENV;
  const accountId = env.STRIPE_ACCOUNT_ID?.trim() ?? "";
  const secretKey = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const publishableKey = env.STRIPE_PUBLISHABLE_KEY?.trim() ?? "";
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim() || null;
  if (
    (mode !== "test" && mode !== "live") ||
    !isStripeRuntimeAllowed(mode, env) ||
    !/^acct_[A-Za-z0-9]{1,100}$/.test(accountId) ||
    !new RegExp(`^[sr]k_${mode}_[A-Za-z0-9]{1,250}$`).test(secretKey) ||
    !new RegExp(`^pk_${mode}_[A-Za-z0-9]{1,250}$`).test(publishableKey) ||
    (webhookSecret !== null && !/^whsec_[A-Za-z0-9]{1,250}$/.test(webhookSecret))
  ) {
    throw new StripeGatewayError("configuration_invalid");
  }
  return { mode, accountId, secretKey, publishableKey, webhookSecret };
};

export type PaymentGatewayName = "mercadopago" | "stripe";
export const getNewSubscriptionGatewayName = (
  env = process.env,
): PaymentGatewayName | "disabled" => {
  const value = env.BILLING_CHECKOUT_GATEWAY;
  if (value === undefined || value === "" || value === "disabled") return "disabled";
  if (value === "stripe" || value === "mercadopago") return value;
  throw new StripeGatewayError("configuration_invalid");
};
