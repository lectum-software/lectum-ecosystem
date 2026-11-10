import { randomUUID } from "node:crypto";
import type {
  billing_financial_reconciliation,
  billing_operation,
  Prisma,
} from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  StripeFinancialReceipt,
  StripeFinancialTarget,
} from "../../payment-gateway/stripe-financial-types";
import type { StripeIdentity } from "../../payment-gateway/stripe-types";
import { validDate } from "../policy";
import {
  type FinancialFailureCode,
  FinancialLedgerError,
  financialReceiptHash,
  storedFinancialReceiptHash,
} from "./policy";

export type FinancialTarget = {
  subscriptionId: string;
  psychologistId: string;
  priceVersionId: string;
  userId: string;
  provider: StripeFinancialTarget;
};
type FinancialBinding = Pick<FinancialTarget, "subscriptionId" | "psychologistId"> & {
  provider: Pick<StripeFinancialTarget, "subscriptionId">;
};
const scope = (identity: StripeIdentity) => ({
  gateway: "stripe",
  mode: identity.mode,
  account_id: identity.accountId,
});
const leaseAvailable = (now: Date) => ({
  OR: [{ lease_until: null }, { lease_until: { lte: now } }],
});
export type FinancialClaim = billing_financial_reconciliation & {
  lease_token: string;
  scan_started_at: Date;
};

export class FinancialLedgerRepository {
  async target(subscriptionId: string, identity: StripeIdentity): Promise<FinancialTarget> {
    // Historical finance never requires a currently active or public user/profile.
    const row = await prisma.professional_subscription.findFirst({
      where: {
        id: subscriptionId,
        gateway: "stripe",
        source: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
      },
      include: { psychologist: { select: { user_id: true } } },
    });
    if (!row?.gateway_subscription_id || !row.price_version_id)
      throw new FinancialLedgerError("not_found");
    const price = await prisma.billing_price_version.findFirst({
      where: { id: row.price_version_id, ...scope(identity) },
    });
    const customer = await prisma.billing_customer.findFirst({
      where: { user_id: row.psychologist.user_id, ...scope(identity) },
    });
    if (
      !price ||
      !customer?.external_customer_id ||
      price.plan_id !== row.plan_id ||
      price.amount_cents !== row.contracted_amount_cents ||
      price.currency !== "BRL" ||
      row.contracted_currency !== "BRL" ||
      price.interval !== "month" ||
      row.contracted_interval !== "month" ||
      price.interval_count !== 1 ||
      row.contracted_interval_count !== 1
    )
      throw new FinancialLedgerError("scope_mismatch");
    return {
      subscriptionId: row.id,
      psychologistId: row.psychologist_id,
      priceVersionId: price.id,
      userId: row.psychologist.user_id,
      provider: {
        subscriptionId: row.gateway_subscription_id,
        localSubscriptionId: row.id,
        customerId: customer.external_customer_id,
        priceId: price.external_price_id,
        amountCents: price.amount_cents,
      },
    };
  }

  async targetByProvider(providerId: string, identity: StripeIdentity) {
    const rows = await prisma.professional_subscription.findMany({
      where: {
        gateway: "stripe",
        source: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        gateway_subscription_id: providerId,
      },
      select: { id: true },
      take: 2,
    });
    if (rows.length !== 1) throw new FinancialLedgerError("not_found");
    return this.target(rows[0].id, identity);
  }

  async enqueueReference(providerId: string, identity: StripeIdentity, eventId: string) {
    const rows = await prisma.professional_subscription.findMany({
      where: {
        gateway: "stripe",
        source: "stripe",
        gateway_mode: identity.mode,
        gateway_account_id: identity.accountId,
        gateway_subscription_id: providerId,
      },
      select: { id: true, psychologist_id: true },
      take: 2,
    });
    if (!rows.length) return false;
    if (rows.length !== 1) throw new FinancialLedgerError("scope_mismatch");
    await this.request(
      {
        subscriptionId: rows[0].id,
        psychologistId: rows[0].psychologist_id,
        provider: { subscriptionId: providerId },
      },
      identity,
      { eventId },
    );
    return true;
  }

  async request(
    target: FinancialBinding,
    identity: StripeIdentity,
    input: { eventId?: string; refresh?: boolean } = {},
  ) {
    return withSerializableTransaction(async (tx) => {
      const key = { ...scope(identity), subscription_id: target.subscriptionId };
      const row = await tx.billing_financial_reconciliation.upsert({
        where: { gateway_mode_account_id_subscription_id: key },
        create: {
          ...key,
          psychologist_id: target.psychologistId,
          provider_subscription_id: target.provider.subscriptionId,
          last_event_id: input.eventId ?? null,
        },
        update: {},
      });
      if (
        row.provider_subscription_id !== target.provider.subscriptionId ||
        row.psychologist_id !== target.psychologistId
      )
        throw new FinancialLedgerError("scope_mismatch");
      if (!input.refresh && (!input.eventId || row.last_event_id === input.eventId)) return row;
      return tx.billing_financial_reconciliation.update({
        where: { id: row.id },
        data: {
          requested_revision: { increment: 1 },
          state: "pending",
          cursor: null,
          scan_started_at: null,
          receipts_complete: false,
          periods_complete: false,
          adjustments_complete: false,
          invoice_count: 0,
          receipt_count: 0,
          excluded_count: 0,
          covered_from: null,
          covered_through: null,
          next_attempt_at: new Date(),
          last_error_code: null,
          last_event_id: input.eventId ?? row.last_event_id,
        },
      });
    });
  }

  read(id: string) {
    return prisma.billing_financial_reconciliation.findUnique({ where: { id } });
  }

  async originalCheckoutReceipt(operation: billing_operation, remoteId: string) {
    if (
      operation.kind !== "checkout" ||
      operation.intent !== "subscription" ||
      operation.intent_kind !== "payment" ||
      operation.gateway !== "stripe" ||
      !["test", "live"].includes(operation.mode) ||
      !operation.provider_intent_id ||
      operation.provider_subscription_id !== remoteId ||
      !operation.subscription_id ||
      !operation.price_version_id ||
      !operation.customer_id
    )
      return null;
    const identity = { accountId: operation.account_id, mode: operation.mode as "test" | "live" };
    const target = await this.target(operation.subscription_id, identity);
    const customer = await prisma.billing_customer.findFirst({
      where: {
        id: operation.customer_id,
        ...scope(identity),
        user_id: operation.user_id,
        external_customer_id: target.provider.customerId,
      },
      select: { id: true },
    });
    if (
      !customer ||
      target.userId !== operation.user_id ||
      target.psychologistId !== operation.psychologist_id ||
      target.priceVersionId !== operation.price_version_id ||
      target.provider.subscriptionId !== remoteId
    )
      return null;
    const rows = await prisma.billing_financial_receipt.findMany({
      where: {
        ...scope(identity),
        subscription_id: operation.subscription_id,
        psychologist_id: operation.psychologist_id,
        provider_subscription_id: remoteId,
        price_version_id: operation.price_version_id,
        payment_intent_id: operation.provider_intent_id,
      },
      take: 2,
    });
    if (rows.length !== 1) return null;
    const row = rows[0];
    const now = new Date();
    if (
      row.currency !== "BRL" ||
      row.amount_paid_cents !== target.provider.amountCents ||
      row.price_id !== target.provider.priceId ||
      !validDate(row.paid_at) ||
      !validDate(row.invoice_paid_at) ||
      !validDate(row.period_start) ||
      !validDate(row.period_end) ||
      row.paid_at > now ||
      row.invoice_paid_at > now ||
      row.period_end <= row.period_start ||
      !["paid", "partially_refunded", "refunded", "disputed"].includes(row.current_state) ||
      !["none", "observed"].includes(row.dispute_status)
    )
      return null;
    if (storedFinancialReceiptHash(row) !== row.immutable_hash) return null;
    return {
      receiptId: row.id,
      invoiceId: row.invoice_id,
      invoicePaymentId: row.invoice_payment_id,
      paymentIntentId: row.payment_intent_id,
      amountCents: row.amount_paid_cents,
      paidAt: row.paid_at,
      invoicePaidAt: row.invoice_paid_at,
    };
  }

  async claim(row: billing_financial_reconciliation): Promise<FinancialClaim | null> {
    if (!["pending", "processing"].includes(row.state)) return null;
    const now = new Date();
    const lease = { lease_token: randomUUID(), lease_until: new Date(now.getTime() + 300_000) };
    const started = row.scan_started_at ?? now;
    const result = await prisma.billing_financial_reconciliation.updateMany({
      where: {
        id: row.id,
        updated_at: row.updated_at,
        requested_revision: row.requested_revision,
        state: { in: ["pending", "processing"] },
        ...leaseAvailable(now),
      },
      data: { ...lease, state: "processing", scan_started_at: started, attempts: { increment: 1 } },
    });
    return result.count
      ? { ...row, ...lease, scan_started_at: started, attempts: row.attempts + 1 }
      : null;
  }

  async commitPage(
    claim: FinancialClaim,
    target: FinancialTarget,
    input: {
      receipts: StripeFinancialReceipt[];
      invoiceCount: number;
      excludedCount: number;
      nextCursor: string | null;
      hasMore: boolean;
      coveredFrom: Date;
      observedAt: Date;
    },
  ) {
    if (
      input.invoiceCount !== input.receipts.length + input.excludedCount ||
      input.invoiceCount < 0 ||
      input.excludedCount < 0 ||
      new Set(input.receipts.map((receipt) => receipt.invoiceId)).size !== input.receipts.length ||
      input.hasMore !== Boolean(input.nextCursor)
    )
      throw new FinancialLedgerError("unsupported_invoice");
    return prisma.$transaction(async (tx) => {
      const held = await tx.billing_financial_reconciliation.updateMany({
        where: {
          id: claim.id,
          lease_token: claim.lease_token,
          lease_until: { gt: new Date() },
          requested_revision: claim.requested_revision,
          state: "processing",
        },
        data: { state: "processing" },
      });
      if (!held.count) throw new FinancialLedgerError("stale_revision");
      const unchanged = await tx.professional_subscription.count({
        where: {
          id: target.subscriptionId,
          psychologist_id: target.psychologistId,
          gateway: "stripe",
          source: "stripe",
          gateway_mode: claim.mode,
          gateway_account_id: claim.account_id,
          gateway_subscription_id: target.provider.subscriptionId,
          price_version_id: target.priceVersionId,
          contracted_amount_cents: target.provider.amountCents,
          contracted_currency: "BRL",
        },
      });
      if (unchanged !== 1) throw new FinancialLedgerError("scope_mismatch");
      for (const receipt of input.receipts)
        await this.storeReceipt(tx, claim, target, receipt, input.observedAt);
      return tx.billing_financial_reconciliation.update({
        where: { id: claim.id },
        data: {
          state: input.hasMore ? "pending" : "complete",
          cursor: input.nextCursor,
          invoice_count: { increment: input.invoiceCount },
          receipt_count: { increment: input.receipts.length },
          excluded_count: { increment: input.excludedCount },
          covered_from: input.coveredFrom,
          covered_through: input.hasMore ? null : claim.scan_started_at,
          receipts_complete: !input.hasMore,
          periods_complete: !input.hasMore,
          adjustments_complete: false,
          ...(input.hasMore ? {} : { processed_revision: claim.requested_revision }),
          lease_token: null,
          lease_until: null,
          last_error_code: null,
          next_attempt_at: new Date(),
        },
      });
    });
  }

  private async storeReceipt(
    tx: Prisma.TransactionClient,
    claim: FinancialClaim,
    target: FinancialTarget,
    receipt: StripeFinancialReceipt,
    observedAt: Date,
  ) {
    if (
      receipt.accountId !== claim.account_id ||
      receipt.mode !== claim.mode ||
      receipt.localSubscriptionId !== target.subscriptionId ||
      receipt.subscriptionId !== target.provider.subscriptionId ||
      receipt.customerId !== target.provider.customerId ||
      receipt.priceId !== target.provider.priceId ||
      receipt.amountCents !== target.provider.amountCents
    )
      throw new FinancialLedgerError("scope_mismatch");
    const key = {
      gateway: "stripe",
      mode: receipt.mode,
      account_id: receipt.accountId,
      invoice_payment_id: receipt.invoicePaymentId,
    };
    const immutableHash = financialReceiptHash(receipt, target);
    const otherAllocation = await tx.billing_financial_receipt.findFirst({
      where: {
        gateway: "stripe",
        mode: receipt.mode,
        account_id: receipt.accountId,
        invoice_id: receipt.invoiceId,
        invoice_payment_id: { not: receipt.invoicePaymentId },
      },
      select: { id: true },
    });
    if (otherAllocation) throw new FinancialLedgerError("receipt_conflict");
    const previous = await tx.billing_financial_receipt.findUnique({
      where: { gateway_mode_account_id_invoice_payment_id: key },
    });
    if (
      previous &&
      (previous.price_version_id !== target.priceVersionId ||
        previous.immutable_hash !== immutableHash ||
        storedFinancialReceiptHash(previous) !== previous.immutable_hash)
    )
      throw new FinancialLedgerError("receipt_conflict");
    const observation = {
      current_state: receipt.currentState,
      refunded_cents: receipt.refundedCents,
      dispute_status: receipt.disputeStatus,
      observed_at: observedAt,
    };
    if (previous) {
      if (previous.observed_at <= observedAt && receipt.refundedCents < previous.refunded_cents)
        throw new FinancialLedgerError("receipt_conflict");
      await tx.billing_financial_receipt.updateMany({
        where: { id: previous.id, immutable_hash: immutableHash, observed_at: { lte: observedAt } },
        data: observation,
      });
      return;
    }
    await tx.billing_financial_receipt.create({
      data: {
        ...key,
        ...observation,
        subscription_id: target.subscriptionId,
        psychologist_id: target.psychologistId,
        provider_subscription_id: receipt.subscriptionId,
        invoice_id: receipt.invoiceId,
        payment_intent_id: receipt.paymentIntentId,
        charge_id: receipt.chargeId,
        price_id: receipt.priceId,
        price_version_id: target.priceVersionId,
        currency: receipt.currency,
        amount_paid_cents: receipt.amountCents,
        paid_at: receipt.paidAt,
        invoice_paid_at: receipt.invoicePaidAt,
        period_start: receipt.periodStart,
        period_end: receipt.periodEnd,
        immutable_hash: immutableHash,
      },
    });
  }

  async fail(claim: FinancialClaim, code: FinancialFailureCode) {
    // A new event owns the next revision; do not overwrite its fresh cursor/diagnostic.
    const updated = await prisma.billing_financial_reconciliation.updateMany({
      where: {
        id: claim.id,
        lease_token: claim.lease_token,
        requested_revision: claim.requested_revision,
      },
      data: {
        state: code === "provider_unavailable" ? "pending" : "review_required",
        last_error_code: code,
        receipts_complete: false,
        periods_complete: false,
        adjustments_complete: false,
        lease_token: null,
        lease_until: null,
        next_attempt_at: new Date(Date.now() + 60_000),
      },
    });
    if (!updated.count)
      await prisma.billing_financial_reconciliation.updateMany({
        where: { id: claim.id, lease_token: claim.lease_token },
        data: { lease_token: null, lease_until: null },
      });
  }

  due(identity: StripeIdentity) {
    return prisma.billing_financial_reconciliation.findMany({
      where: {
        ...scope(identity),
        state: { in: ["pending", "processing"] },
        next_attempt_at: { lte: new Date() },
        ...leaseAvailable(new Date()),
      },
      orderBy: { next_attempt_at: "asc" },
      take: 3,
    });
  }
}
