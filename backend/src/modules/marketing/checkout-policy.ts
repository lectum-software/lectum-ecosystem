import { isStripeRuntimeAllowed } from "../billing/payment-gateway/stripe-runtime";
import { MARKETING_CONSENT_POLICY } from "./consent-policy";

export const CHECKOUT_SOURCE_URL = "https://www.lectum.com.br/app/professional/billing";

// Reuse the server's payment identity; no account or URL is accepted from the browser.
export function reviewedCheckoutPolicy(env = process.env) {
  const accountId = env.STRIPE_ACCOUNT_ID?.trim() ?? "";
  const enabled =
    env.BILLING_CHECKOUT_GATEWAY === "stripe" &&
    env.STRIPE_ENV === "live" &&
    /^acct_[A-Za-z0-9]{1,100}$/.test(accountId) &&
    isStripeRuntimeAllowed("live", env);
  return {
    enabled,
    accountId: enabled ? accountId : null,
    documentVersion: enabled ? MARKETING_CONSENT_POLICY.documentVersion : null,
    sourceUrl: enabled ? CHECKOUT_SOURCE_URL : null,
  };
}
