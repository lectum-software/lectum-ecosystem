import type Stripe from "stripe";
import { StripeGatewayError } from "./stripe-error";
import type {
  StripeFinancialContract,
  StripeFinancialInvoice,
  StripeFinancialPage,
  StripeFinancialTarget,
} from "./stripe-financial-types";
import { readStripePaidInvoice, type StripePaidInvoice } from "./stripe-invoice";
import {
  assertStripeMode,
  invoicePeriod,
  invoiceSubscriptionId,
  localReference,
  parseStripePlan,
  requireLocalReference,
  requireStripeId,
  stripeDate,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

const validFinancialDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

export const projectStripeFinancialContract = (
  subscription: Stripe.Subscription,
  identity: StripeIdentity,
  expected: StripeFinancialTarget,
): StripeFinancialContract => {
  assertStripeMode(subscription.livemode, identity);
  const createdAt = stripeDate(subscription.created);
  if (
    subscription.id !== requireStripeId(expected.subscriptionId, "sub") ||
    stripeId(subscription.customer, "cus") !== requireStripeId(expected.customerId, "cus") ||
    subscription.metadata.lectum_subscription_id !==
      requireLocalReference(expected.localSubscriptionId) ||
    !createdAt ||
    subscription.items.has_more ||
    subscription.items.data.length !== 1
  )
    throw new StripeGatewayError("resource_mismatch");
  const item = subscription.items.data[0];
  const plan = parseStripePlan(item.price, identity);
  if (
    item.quantity !== 1 ||
    plan.priceId !== expected.priceId ||
    plan.amountCents !== expected.amountCents
  )
    throw new StripeGatewayError("contract_invalid");
  return { ...identity, ...expected, createdAt };
};

export const assertStripeFinancialInvoiceScope = (
  invoice: Stripe.Invoice,
  identity: StripeIdentity,
  target: StripeFinancialTarget,
) => {
  assertStripeMode(invoice.livemode, identity);
  const local = localReference(
    invoice.parent?.subscription_details?.metadata?.lectum_subscription_id,
  );
  if (
    invoiceSubscriptionId(invoice) !== target.subscriptionId ||
    stripeId(invoice.customer, "cus") !== target.customerId ||
    (local !== null && local !== target.localSubscriptionId) ||
    invoice.currency !== "brl"
  )
    throw new StripeGatewayError("resource_mismatch");
};

export const projectStripeFinancialReceipt = (
  invoice: Stripe.Invoice,
  paid: StripePaidInvoice,
  identity: StripeIdentity,
  target: StripeFinancialTarget,
  cutoff: Date,
): StripeFinancialInvoice => {
  assertStripeFinancialInvoiceScope(invoice, identity, target);
  const facts = paid.financialFacts;
  const period = invoicePeriod(invoice, target.subscriptionId, target.priceId);
  if (
    !facts.invoicePaymentId ||
    !validFinancialDate(facts.allocatedPaidAt) ||
    !validFinancialDate(facts.invoicePaidAt) ||
    !validFinancialDate(cutoff) ||
    !period ||
    paid.payment.paymentId !== invoice.id ||
    paid.payment.subscriptionId !== target.subscriptionId ||
    paid.payment.amountCents !== target.amountCents ||
    invoice.lines.data[0].amount !== target.amountCents ||
    (facts.refunded && paid.refundedCents === 0)
  )
    throw new StripeGatewayError("payment_not_eligible");
  // Allocation and invoice transitions are independent provider facts; neither implies their order.
  if (facts.allocatedPaidAt > cutoff || facts.invoicePaidAt > cutoff)
    return { kind: "excluded", reason: "paid_after_cutoff" };
  return {
    kind: "receipt",
    receipt: {
      ...identity,
      ...target,
      invoiceId: requireStripeId(invoice.id, "in"),
      invoicePaymentId: facts.invoicePaymentId,
      paymentIntentId: facts.paymentIntentId,
      chargeId: facts.chargeId,
      currency: "BRL",
      paidAt: facts.allocatedPaidAt,
      invoicePaidAt: facts.invoicePaidAt,
      periodStart: period.start,
      periodEnd: period.end,
      refundedCents: paid.refundedCents,
      currentState: paid.disputed
        ? "disputed"
        : paid.refundedCents === target.amountCents
          ? "refunded"
          : paid.refundedCents > 0
            ? "partially_refunded"
            : "paid",
      disputeStatus: paid.disputed ? "observed" : "none",
    },
  };
};

export const listStripeFinancialInvoices = async (
  client: Stripe,
  identity: StripeIdentity,
  target: StripeFinancialTarget,
  input: { cursor?: string | null; cutoff: Date; limit: number },
): Promise<StripeFinancialPage> => {
  if (
    !Number.isInteger(input.limit) ||
    input.limit < 1 ||
    input.limit > 20 ||
    !Number.isFinite(input.cutoff.getTime())
  )
    throw new StripeGatewayError("resource_invalid");
  const page = await client.invoices.list({
    subscription: requireStripeId(target.subscriptionId, "sub"),
    customer: requireStripeId(target.customerId, "cus"),
    created: { lte: Math.floor(input.cutoff.getTime() / 1000) },
    limit: input.limit,
    ...(input.cursor ? { starting_after: requireStripeId(input.cursor, "in") } : {}),
  });
  const invoiceIds = page.data.map((invoice) => {
    assertStripeFinancialInvoiceScope(invoice, identity, target);
    return requireStripeId(invoice.id, "in");
  });
  if (
    new Set(invoiceIds).size !== invoiceIds.length ||
    invoiceIds.includes(input.cursor ?? "") ||
    (page.has_more && !invoiceIds.length)
  )
    throw new StripeGatewayError("contract_invalid");
  return {
    invoiceIds,
    hasMore: page.has_more,
    nextCursor: page.has_more ? invoiceIds.at(-1)! : null,
  };
};

export const readStripeFinancialInvoice = async (
  client: Stripe,
  identity: StripeIdentity,
  target: StripeFinancialTarget,
  invoiceId: string,
  cutoff: Date,
): Promise<StripeFinancialInvoice> => {
  const expected = requireStripeId(invoiceId, "in");
  const invoice = await client.invoices.retrieve(expected);
  if (invoice.id !== expected) throw new StripeGatewayError("resource_mismatch");
  assertStripeFinancialInvoiceScope(invoice, identity, target);
  if (
    invoice.amount_paid === 0 &&
    ["draft", "open", "void", "uncollectible", "paid"].includes(invoice.status ?? "")
  )
    return { kind: "excluded", reason: invoice.status === "paid" ? "zero" : "unpaid" };
  return projectStripeFinancialReceipt(
    invoice,
    await readStripePaidInvoice(client, invoice, identity),
    identity,
    target,
    cutoff,
  );
};
