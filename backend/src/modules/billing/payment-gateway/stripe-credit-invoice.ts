import type Stripe from "stripe";
import { assertCreditSubscription } from "./stripe-credit-setup";
import type { CreditCollectionInvoice, CreditCollectionScope } from "./stripe-credit-types";
import { StripeGatewayError } from "./stripe-error";
import { projectStripeFinancialContract } from "./stripe-financial";
import {
  assertStripeMode,
  invoicePeriod,
  invoiceSubscriptionId,
  requireLocalReference,
  requireStripeId,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export const projectCreditCollectionInvoice = (
  invoice: Stripe.Invoice,
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  input: CreditCollectionScope,
): CreditCollectionInvoice => {
  assertCreditSubscription(subscription, identity, input);
  projectStripeFinancialContract(subscription, identity, input);
  assertStripeMode(invoice.livemode, identity);
  const period = invoicePeriod(invoice, input.subscriptionId, input.priceId);
  if (
    invoice.id !== requireStripeId(input.invoiceId, "in") ||
    invoiceSubscriptionId(invoice) !== input.subscriptionId ||
    stripeId(invoice.customer, "cus") !== input.customerId ||
    invoice.parent?.subscription_details?.metadata?.lectum_subscription_id !==
      requireLocalReference(input.localSubscriptionId) ||
    !period ||
    !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason ?? "") ||
    !invoice.status ||
    !["draft", "open", "paid", "void", "uncollectible"].includes(invoice.status) ||
    invoice.currency !== "brl" ||
    !Number.isSafeInteger(input.amountCents) ||
    input.amountCents <= 0 ||
    invoice.amount_due !== input.amountCents ||
    invoice.total !== input.amountCents ||
    invoice.lines.data[0].amount !== input.amountCents ||
    invoice.starting_balance !== 0 ||
    invoice.pre_payment_credit_notes_amount !== 0 ||
    invoice.post_payment_credit_notes_amount !== 0 ||
    (invoice.amount_paid_off_stripe ?? 0) !== 0 ||
    invoice.collection_method !== "charge_automatically" ||
    invoice.auto_advance !== false ||
    ![0, input.amountCents].includes(invoice.amount_paid) ||
    ![0, input.amountCents].includes(invoice.amount_remaining)
  )
    throw new StripeGatewayError("payment_not_eligible");
  return {
    invoiceId: invoice.id,
    status: invoice.status as CreditCollectionInvoice["status"],
    autoAdvance: false,
    amountRemaining: invoice.amount_remaining,
    amountPaid: invoice.amount_paid,
    currency: "brl",
    billingReason: invoice.billing_reason,
    periodStart: period.start,
    periodEnd: period.end,
    defaultPaymentMethodId: stripeId(subscription.default_payment_method, "pm"),
  };
};

export const getCreditCollectionInvoice = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditCollectionScope,
) => {
  const subscription = await client.subscriptions.retrieve(
    requireStripeId(input.subscriptionId, "sub"),
  );
  const invoice = await client.invoices.retrieve(requireStripeId(input.invoiceId, "in"));
  return projectCreditCollectionInvoice(invoice, subscription, identity, input);
};

export const finalizeCreditCollectionInvoice = async (
  client: Stripe,
  identity: StripeIdentity,
  input: CreditCollectionScope,
  idempotencyKey: string,
) => {
  const current = await getCreditCollectionInvoice(client, identity, input);
  if (current.status === "draft")
    await client.invoices.finalizeInvoice(
      current.invoiceId,
      { auto_advance: false },
      { idempotencyKey },
    );
  else if (!["open", "paid"].includes(current.status))
    throw new StripeGatewayError("operation_unsupported");
  return getCreditCollectionInvoice(client, identity, input);
};
