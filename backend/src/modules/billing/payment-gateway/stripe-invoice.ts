import type Stripe from "stripe";
import type { GatewayInvoicePayment } from "./PaymentGateway";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  invoiceSubscriptionId,
  localReference,
  requireStripeId,
  type StripeInvoiceEvidence,
  stripeDate,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export type StripePaidInvoice = StripeInvoiceEvidence & {
  payment: GatewayInvoicePayment;
  financialFacts: {
    invoicePaymentId: string | null;
    paymentIntentId: string;
    chargeId: string;
    allocatedPaidAt: Date | null;
    invoicePaidAt: Date;
    refunded: boolean;
  };
};

/** Preserve independent provider transitions; consumers apply their own now/cutoff. */
export const stripePaidInvoiceSettlement = (input: {
  invoicePaidAt: unknown;
  allocatedPaidAt: unknown;
  refunded: boolean;
  refundedCents: number;
  disputed: boolean;
}) => {
  const invoicePaidAt = stripeDate(input.invoicePaidAt);
  const paidAt = stripeDate(input.allocatedPaidAt);
  if (!invoicePaidAt || !paidAt) throw new StripeGatewayError("payment_not_eligible");
  return {
    paidAt,
    invoicePaidAt,
    status: input.disputed
      ? "disputed"
      : input.refunded || input.refundedCents > 0
        ? "refunded"
        : "approved",
  };
};

/** Only one fully allocated Stripe card payment is supported. Other settlement forms fail closed. */
export const readStripePaidInvoice = async (
  client: Stripe,
  invoice: Stripe.Invoice,
  identity: StripeIdentity,
): Promise<StripePaidInvoice> => {
  assertStripeMode(invoice.livemode, identity);
  const invoiceId = requireStripeId(invoice.id, "in");
  const subscriptionId = invoiceSubscriptionId(invoice);
  const customerId = requireStripeId(invoice.customer, "cus");
  const paidAt = stripeDate(invoice.status_transitions.paid_at);
  if (
    !subscriptionId ||
    !paidAt ||
    invoice.status !== "paid" ||
    invoice.currency !== "brl" ||
    !Number.isSafeInteger(invoice.amount_paid) ||
    invoice.amount_paid <= 0 ||
    invoice.amount_remaining !== 0 ||
    (invoice.amount_paid_off_stripe ?? 0) !== 0 ||
    invoice.pre_payment_credit_notes_amount !== 0 ||
    invoice.post_payment_credit_notes_amount !== 0
  )
    throw new StripeGatewayError("payment_not_eligible");
  const payments = await client.invoicePayments.list({
    invoice: invoiceId,
    status: "paid",
    limit: 2,
    expand: ["data.payment.payment_intent.latest_charge"],
  });
  if (payments.has_more || payments.data.length !== 1)
    throw new StripeGatewayError("payment_not_eligible");
  const allocated = payments.data[0];
  assertStripeMode(allocated.livemode, identity);
  if (
    stripeId(allocated.invoice, "in") !== invoiceId ||
    allocated.status !== "paid" ||
    allocated.currency !== "brl" ||
    allocated.amount_paid !== invoice.amount_paid ||
    allocated.payment.type !== "payment_intent"
  )
    throw new StripeGatewayError("payment_not_eligible");
  const intentId = requireStripeId(allocated.payment.payment_intent, "pi");
  const intent =
    typeof allocated.payment.payment_intent === "object"
      ? allocated.payment.payment_intent
      : await client.paymentIntents.retrieve(intentId, { expand: ["latest_charge"] });
  if (!intent) throw new StripeGatewayError("payment_not_eligible");
  assertStripeMode(intent.livemode, identity);
  if (
    intent.id !== intentId ||
    intent.status !== "succeeded" ||
    stripeId(intent.customer, "cus") !== customerId ||
    intent.currency !== "brl" ||
    intent.amount_received !== invoice.amount_paid
  )
    throw new StripeGatewayError("payment_not_eligible");
  const chargeId = requireStripeId(intent.latest_charge, "ch");
  const charge =
    typeof intent.latest_charge === "object"
      ? intent.latest_charge
      : await client.charges.retrieve(chargeId);
  if (!charge) throw new StripeGatewayError("payment_not_eligible");
  assertStripeMode(charge.livemode, identity);
  if (
    charge.id !== chargeId ||
    stripeId(charge.payment_intent, "pi") !== intentId ||
    stripeId(charge.customer, "cus") !== customerId ||
    !charge.paid ||
    !charge.captured ||
    charge.status !== "succeeded" ||
    charge.currency !== "brl" ||
    charge.amount_captured !== invoice.amount_paid ||
    charge.payment_method_details?.type !== "card" ||
    !Number.isSafeInteger(charge.amount_refunded) ||
    charge.amount_refunded < 0 ||
    charge.amount_refunded > invoice.amount_paid
  )
    throw new StripeGatewayError("payment_not_eligible");
  const settlement = stripePaidInvoiceSettlement({
    invoicePaidAt: invoice.status_transitions.paid_at,
    allocatedPaidAt: allocated.status_transitions.paid_at,
    refunded: charge.refunded,
    refundedCents: charge.amount_refunded,
    disputed: charge.disputed,
  });
  return {
    verified: charge.amount_refunded === 0 && !charge.disputed && !charge.refunded,
    refundedCents: charge.amount_refunded,
    disputed: charge.disputed,
    paymentPaidAt: settlement.paidAt,
    financialFacts: {
      invoicePaymentId: stripeId(allocated.id, "inpay"),
      paymentIntentId: intentId,
      chargeId,
      allocatedPaidAt: settlement.paidAt,
      invoicePaidAt: paidAt,
      refunded: charge.refunded,
    },
    payment: {
      paymentId: invoiceId,
      subscriptionId,
      externalReference: localReference(
        invoice.parent?.subscription_details?.metadata?.lectum_subscription_id,
      ),
      amountCents: invoice.amount_paid,
      refundedCents: charge.amount_refunded,
      currency: "BRL",
      liveMode: invoice.livemode,
      ...settlement,
    },
  };
};
