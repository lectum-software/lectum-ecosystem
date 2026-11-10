import type Stripe from "stripe";
import type { BillingSubscriptionStatus } from "./PaymentGateway";
import { StripeGatewayError } from "./stripe-error";
import type {
  StripeCanonicalSubscription,
  StripeIdentity,
  StripePlan,
  StripeSetup,
} from "./stripe-types";

export const stripeId = (value: unknown, prefix: string): string | null => {
  const id = typeof value === "object" && value !== null && "id" in value ? value.id : value;
  return typeof id === "string" && new RegExp(`^${prefix}_[A-Za-z0-9]{1,100}$`).test(id)
    ? id
    : null;
};

export const requireStripeId = (value: unknown, prefix: string) => {
  const id = stripeId(value, prefix);
  if (!id) throw new StripeGatewayError("resource_invalid");
  return id;
};

export const requireStripeDisputeId = (value: unknown) => {
  const id = stripeId(value, "du") ?? stripeId(value, "dp");
  if (!id) throw new StripeGatewayError("resource_invalid");
  return id;
};

export const localReference = (value: unknown): string | null =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;

export const requireLocalReference = (value: unknown) => {
  const reference = localReference(value);
  if (!reference) throw new StripeGatewayError("resource_invalid");
  return reference;
};

export const stripeDate = (value: unknown): Date | null => {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) return null;
  const date = new Date(value * 1000);
  return Number.isFinite(date.getTime()) ? date : null;
};

export const requireStripeClientSecret = (value: unknown, intentId: string): string => {
  if (
    typeof value !== "string" ||
    value.length > 512 ||
    !new RegExp(`^${intentId}_secret_[A-Za-z0-9]+$`).test(value)
  )
    throw new StripeGatewayError("contract_invalid");
  return value;
};

export const assertStripeMode = (livemode: unknown, identity: StripeIdentity) => {
  if (livemode !== (identity.mode === "live")) throw new StripeGatewayError("resource_mismatch");
};

export const parseStripePlan = (price: Stripe.Price, identity: StripeIdentity): StripePlan => {
  assertStripeMode(price.livemode, identity);
  if (
    price.type !== "recurring" ||
    price.currency !== "brl" ||
    !Number.isSafeInteger(price.unit_amount) ||
    price.unit_amount! <= 0 ||
    price.recurring?.interval !== "month" ||
    price.recurring.interval_count !== 1 ||
    price.recurring.usage_type !== "licensed" ||
    price.billing_scheme !== "per_unit" ||
    price.transform_quantity
  )
    throw new StripeGatewayError("contract_invalid");
  const product = typeof price.product === "object" ? price.product : null;
  if (product && !("deleted" in product)) assertStripeMode(product.livemode, identity);
  return {
    ...identity,
    priceId: requireStripeId(price.id, "price"),
    productId: requireStripeId(price.product, "prod"),
    active: price.active === true && (!product || (!("deleted" in product) && product.active)),
    amountCents: price.unit_amount!,
    currency: "BRL",
    interval: "month",
    intervalCount: 1,
  };
};

export const stripeSubscriptionStatus = (
  status: string,
  paymentVerified: boolean,
  cancelAtPeriodEnd: boolean,
): BillingSubscriptionStatus => {
  if (status === "canceled" || status === "incomplete_expired") return "cancelada";
  if (cancelAtPeriodEnd && paymentVerified) return "cancelada";
  if (status === "past_due" || status === "unpaid") return "inadimplente";
  if (status === "active" && paymentVerified) return "ativa";
  return "inativa";
};

export type StripeInvoiceEvidence = {
  verified: boolean;
  refundedCents: number;
  disputed: boolean;
  paymentIntentId?: string | null;
  paymentPaidAt?: Date | null;
};

export const invoiceSubscriptionId = (invoice: Stripe.Invoice) =>
  stripeId(invoice.parent?.subscription_details?.subscription, "sub");

export const invoicePeriod = (invoice: Stripe.Invoice, subscriptionId: string, priceId: string) => {
  if (invoice.lines.has_more || invoice.lines.data.length !== 1) return null;
  const line = invoice.lines.data[0];
  const parent = line.parent?.subscription_item_details;
  if (
    !parent ||
    parent.proration ||
    parent.subscription !== subscriptionId ||
    stripeId(line.pricing?.price_details?.price, "price") !== priceId ||
    line.currency !== "brl" ||
    line.quantity !== 1
  )
    return null;
  const start = stripeDate(line.period.start);
  const end = stripeDate(line.period.end);
  return start && end && end > start ? { start, end } : null;
};

export const projectStripeSubscription = (
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  evidence: StripeInvoiceEvidence = { verified: false, refundedCents: 0, disputed: false },
): StripeCanonicalSubscription => {
  assertStripeMode(subscription.livemode, identity);
  if (
    ![
      "incomplete",
      "incomplete_expired",
      "trialing",
      "active",
      "past_due",
      "canceled",
      "unpaid",
      "paused",
    ].includes(subscription.status)
  )
    throw new StripeGatewayError("contract_invalid");
  if (subscription.items.has_more || subscription.items.data.length !== 1) {
    throw new StripeGatewayError("contract_invalid");
  }
  const item = subscription.items.data[0];
  if (item.quantity !== 1) throw new StripeGatewayError("contract_invalid");
  const price = parseStripePlan(item.price, identity);
  const subscriptionId = requireStripeId(subscription.id, "sub");
  const customerId = requireStripeId(subscription.customer, "cus");
  const invoice =
    typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
  if (invoice) {
    assertStripeMode(invoice.livemode, identity);
    if (
      invoiceSubscriptionId(invoice) !== subscriptionId ||
      stripeId(invoice.customer, "cus") !== customerId
    ) {
      throw new StripeGatewayError("resource_mismatch");
    }
  }
  const period = invoice ? invoicePeriod(invoice, subscriptionId, price.priceId) : null;
  const paid = invoice?.status === "paid" && invoice.amount_paid > 0;
  const invoicePaidAt = stripeDate(invoice?.status_transitions.paid_at);
  const paymentPaidAt =
    evidence.paymentPaidAt instanceof Date && Number.isFinite(evidence.paymentPaidAt.getTime())
      ? evidence.paymentPaidAt
      : null;
  const verified = Boolean(
    paid &&
      invoice?.amount_paid === price.amountCents &&
      evidence.verified &&
      invoicePaidAt &&
      paymentPaidAt &&
      period &&
      !evidence.disputed &&
      evidence.refundedCents === 0,
  );
  return {
    ...identity,
    subscriptionId,
    customerId,
    localSubscriptionId: localReference(subscription.metadata.lectum_subscription_id),
    attemptId: localReference(subscription.metadata.lectum_attempt_id),
    priceId: price.priceId,
    amountCents: price.amountCents,
    currency: "BRL",
    interval: "month",
    status: stripeSubscriptionStatus(
      subscription.status,
      verified,
      subscription.cancel_at_period_end,
    ),
    gatewayStatus: subscription.status,
    currentPeriodStart: stripeDate(item.current_period_start),
    currentPeriodEnd: stripeDate(item.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: stripeDate(subscription.trial_end),
    defaultPaymentMethodId: stripeId(subscription.default_payment_method, "pm"),
    latestInvoiceId: stripeId(subscription.latest_invoice, "in"),
    latestInvoicePaid: paid,
    latestInvoiceAmountPaid: Number.isSafeInteger(invoice?.amount_paid) ? invoice!.amount_paid : 0,
    latestInvoicePaidAt: invoicePaidAt,
    latestInvoicePaymentPaidAt: paymentPaidAt,
    latestInvoicePeriodStart: period?.start ?? null,
    latestInvoicePeriodEnd: period?.end ?? null,
    latestInvoicePaymentVerified: verified,
    latestInvoicePaymentIntentId: verified ? stripeId(evidence.paymentIntentId, "pi") : null,
    latestInvoiceRefundedCents: evidence.refundedCents,
    latestInvoiceDisputed: evidence.disputed,
  };
};

export const projectStripeSetup = (
  setup: Stripe.SetupIntent,
  identity: StripeIdentity,
): StripeSetup => {
  assertStripeMode(setup.livemode, identity);
  if (
    ![
      "requires_payment_method",
      "requires_confirmation",
      "requires_action",
      "processing",
      "canceled",
      "succeeded",
    ].includes(setup.status)
  )
    throw new StripeGatewayError("contract_invalid");
  return {
    ...identity,
    setupIntentId: requireStripeId(setup.id, "seti"),
    customerId: requireStripeId(setup.customer, "cus"),
    attemptId: localReference(setup.metadata?.lectum_attempt_id),
    subscriptionId: stripeId(setup.metadata?.lectum_gateway_subscription_id, "sub"),
    localSubscriptionId: localReference(setup.metadata?.lectum_subscription_id),
    status: setup.status,
    paymentMethodId: stripeId(setup.payment_method, "pm"),
    ...(["requires_payment_method", "requires_confirmation", "requires_action"].includes(
      setup.status,
    ) && setup.client_secret
      ? {
          clientSecret: requireStripeClientSecret(
            setup.client_secret,
            requireStripeId(setup.id, "seti"),
          ),
        }
      : {}),
  };
};
