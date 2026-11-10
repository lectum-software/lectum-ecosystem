import type Stripe from "stripe";
import { invoiceSubscriptionId, requireStripeClientSecret, stripeId } from "./stripe-projection";
import type { StripeCanonicalSubscription } from "./stripe-types";

/** An already paid first invoice can recover the original PI, never a renewal or a setup. */
export const initialPaidCheckoutIntent = (
  invoice: Pick<Stripe.Invoice, "id" | "billing_reason" | "status"> | null,
  canonical: Pick<
    StripeCanonicalSubscription,
    | "latestInvoiceId"
    | "latestInvoicePaid"
    | "latestInvoicePaymentVerified"
    | "latestInvoicePaymentIntentId"
  >,
) => {
  if (
    !invoice ||
    invoice.id !== canonical.latestInvoiceId ||
    invoice.billing_reason !== "subscription_create" ||
    invoice.status !== "paid" ||
    !canonical.latestInvoicePaid ||
    !canonical.latestInvoicePaymentVerified
  )
    return null;
  const intentId = stripeId(canonical.latestInvoicePaymentIntentId, "pi");
  return intentId ? { intentKind: "payment" as const, intentId } : null;
};

/** An unpaid renewal must never become the originally authorized checkout's pinned PI. */
export const initialUnpaidCheckoutIntent = (
  invoice: Stripe.Invoice | null,
  canonical: Pick<
    StripeCanonicalSubscription,
    "subscriptionId" | "customerId" | "latestInvoiceId" | "latestInvoicePaid"
  >,
) => {
  if (
    !invoice ||
    invoice.id !== canonical.latestInvoiceId ||
    invoice.billing_reason !== "subscription_create" ||
    invoiceSubscriptionId(invoice) !== canonical.subscriptionId ||
    stripeId(invoice.customer, "cus") !== canonical.customerId ||
    invoice.status !== "open" ||
    invoice.amount_paid !== 0 ||
    canonical.latestInvoicePaid
  )
    return null;
  const secret = invoice.confirmation_secret?.client_secret;
  if (typeof secret !== "string") return null;
  const intentId = stripeId(secret.split("_secret_")[0], "pi");
  if (!intentId) return null;
  return {
    intentKind: "payment" as const,
    intentId,
    clientSecret: requireStripeClientSecret(secret, intentId),
  };
};
