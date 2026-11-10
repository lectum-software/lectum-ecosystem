import type { professional_subscription } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { StripeAdapter } from "../payment-gateway/StripeAdapter";
import type { StripeFinancialReceipt } from "../payment-gateway/stripe-financial-types";
import type { StripeCanonicalSubscription, StripeIdentity } from "../payment-gateway/stripe-types";
import { FinancialLedgerRepository } from "./financial-ledger/repository";
import { StripeBillingError, validDate } from "./policy";

type PreviousCreditEntitlement = Pick<
  professional_subscription,
  "id" | "status" | "current_period_end" | "collection_policy"
>;
type CreditEntitlementReader = Pick<StripeAdapter, "getFinancialInvoice" | "listFinancialInvoices">;
export type PreservedCreditEntitlement = {
  status: "ativa" | "cancelada";
  currentPeriodEnd: Date;
  invoiceId: string;
};

/** A future unpaid invoice cannot extend paid access, nor erase a separately verified paid period. */
export const mayPreserveCreditEntitlement = (
  previous: PreviousCreditEntitlement,
  remote: StripeCanonicalSubscription,
  now: Date,
) =>
  ["manual_credit_v1", "manual_credit_cancel_requested_v1"].includes(
    previous.collection_policy ?? "",
  ) &&
  validDate(now) &&
  validDate(previous.current_period_end) &&
  previous.current_period_end > now &&
  remote.localSubscriptionId === previous.id &&
  ["active", "past_due", "unpaid", "paused", "canceled"].includes(remote.gatewayStatus) &&
  !remote.latestInvoicePaid &&
  remote.latestInvoiceAmountPaid === 0 &&
  !remote.latestInvoicePaymentVerified &&
  remote.latestInvoiceRefundedCents === 0 &&
  !remote.latestInvoiceDisputed;

/** Only fresh canonical receipt evidence can sustain the already persisted period. */
export const projectPreservedCreditEntitlement = (
  previous: PreviousCreditEntitlement,
  remote: StripeCanonicalSubscription,
  receipt: StripeFinancialReceipt,
  now: Date,
): PreservedCreditEntitlement | null => {
  if (
    !mayPreserveCreditEntitlement(previous, remote, now) ||
    receipt.accountId !== remote.accountId ||
    receipt.mode !== remote.mode ||
    receipt.localSubscriptionId !== previous.id ||
    receipt.subscriptionId !== remote.subscriptionId ||
    receipt.customerId !== remote.customerId ||
    receipt.priceId !== remote.priceId ||
    receipt.currency !== "BRL" ||
    receipt.amountCents !== remote.amountCents ||
    !Number.isSafeInteger(receipt.amountCents) ||
    receipt.amountCents <= 0 ||
    receipt.currentState !== "paid" ||
    receipt.refundedCents !== 0 ||
    receipt.disputeStatus !== "none" ||
    !validDate(receipt.paidAt) ||
    !validDate(receipt.invoicePaidAt) ||
    receipt.paidAt > now ||
    receipt.invoicePaidAt > now ||
    !validDate(receipt.periodStart) ||
    !validDate(receipt.periodEnd) ||
    receipt.periodStart > now ||
    receipt.periodEnd <= now ||
    receipt.periodEnd <= receipt.periodStart
  )
    return null;
  return {
    status:
      previous.status === "cancelada" ||
      remote.gatewayStatus === "canceled" ||
      remote.cancelAtPeriodEnd
        ? "cancelada"
        : "ativa",
    currentPeriodEnd: new Date(
      Math.min(previous.current_period_end!.getTime(), receipt.periodEnd.getTime()),
    ),
    invoiceId: receipt.invoiceId,
  };
};

export const readPreservedCreditEntitlement = async (
  gateway: CreditEntitlementReader,
  identity: StripeIdentity,
  previous: PreviousCreditEntitlement,
  remote: StripeCanonicalSubscription,
  now: Date,
): Promise<PreservedCreditEntitlement | null> => {
  if (!mayPreserveCreditEntitlement(previous, remote, now)) return null;
  const target = await new FinancialLedgerRepository().target(previous.id, identity);
  if (
    remote.accountId !== identity.accountId ||
    remote.mode !== identity.mode ||
    target.subscriptionId !== previous.id ||
    target.provider.subscriptionId !== remote.subscriptionId ||
    target.provider.customerId !== remote.customerId ||
    target.provider.priceId !== remote.priceId ||
    target.provider.amountCents !== remote.amountCents
  )
    throw new StripeBillingError("billing_operation_conflict");
  const references = await prisma.billing_financial_receipt.findMany({
    where: {
      gateway: "stripe",
      mode: identity.mode,
      account_id: identity.accountId,
      subscription_id: target.subscriptionId,
      psychologist_id: target.psychologistId,
      provider_subscription_id: target.provider.subscriptionId,
      price_version_id: target.priceVersionId,
      period_start: { lte: now },
      period_end: { gt: now },
    },
    orderBy: { period_end: "desc" },
    select: { invoice_id: true },
    take: 5,
  });
  // The ledger supplies references only. Its cached payment/refund state is not entitlement proof.
  const page = references.length
    ? { invoiceIds: references.map((row) => row.invoice_id), hasMore: false }
    : await gateway.listFinancialInvoices(target.provider, { cutoff: now, limit: 5 });
  for (const invoiceId of new Set(page.invoiceIds)) {
    const observed = await gateway.getFinancialInvoice(target.provider, invoiceId, now);
    if (observed.kind !== "receipt") continue;
    const proof = projectPreservedCreditEntitlement(previous, remote, observed.receipt, now);
    if (proof) return proof;
  }
  // A bounded scan cannot assert that the older paid period is absent beyond this page.
  if (page.hasMore) throw new StripeBillingError("billing_operation_pending");
  return null;
};
