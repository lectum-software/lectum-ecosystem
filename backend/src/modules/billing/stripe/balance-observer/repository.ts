import { randomUUID } from "node:crypto";
import type { billing_stripe_fee_observation, Prisma } from "@/external/generated/prisma/client";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  FeeDiagnostic,
  StripeBalancePage,
  StripeBalanceTarget,
} from "../../payment-gateway/stripe-balance-types";
import { storedFinancialReceiptHash } from "../financial-ledger/policy";
import {
  assertBalancePage,
  balanceFactHash,
  FeeObservationError,
  feeScope,
  storedBalanceFactHash,
} from "./policy";
export type FeeClaim = billing_stripe_fee_observation & { lease_token: string };
export async function feeActor(tx: Prisma.TransactionClient, actorId: string) {
  if (
    typeof actorId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(actorId) ||
    !(await tx.admin.findFirst({
      where: { id: actorId, active: true, deleted: false, confirmed: true, need_reset: false },
      select: { id: true },
    }))
  )
    throw new FeeObservationError("actor_invalid");
}
export async function assertFeeTarget(tx: Prisma.TransactionClient, target: StripeBalanceTarget) {
  const receipt = await tx.billing_financial_receipt.findFirst({
    where: { id: target.receiptId, ...feeScope(target) },
  });
  if (
    !receipt ||
    receipt.immutable_hash !== target.receiptHash ||
    storedFinancialReceiptHash(receipt) !== target.receiptHash ||
    receipt.charge_id !== target.chargeId ||
    receipt.payment_intent_id !== target.paymentIntentId ||
    receipt.amount_paid_cents !== target.amountCents
  )
    throw new FeeObservationError("invalid_receipt");
  const contract = await tx.professional_subscription.findFirst({
    where: {
      id: receipt.subscription_id,
      gateway: "stripe",
      source: "stripe",
      gateway_account_id: target.accountId,
      gateway_mode: target.mode,
      gateway_subscription_id: receipt.provider_subscription_id,
      psychologist_id: receipt.psychologist_id,
      price_version_id: receipt.price_version_id,
    },
    include: { psychologist: { select: { user_id: true } } },
  });
  const price =
    contract &&
    (await tx.billing_price_version.findFirst({
      where: {
        id: receipt.price_version_id ?? "",
        ...feeScope(target),
        plan_id: contract.plan_id,
        external_price_id: receipt.price_id,
        amount_cents: receipt.amount_paid_cents,
        currency: "BRL",
        interval: "month",
        interval_count: 1,
      },
    }));
  const customer =
    contract &&
    (await tx.billing_customer.findFirst({
      where: {
        ...feeScope(target),
        user_id: contract.psychologist.user_id,
        external_customer_id: target.customerId,
      },
    }));
  if (
    !contract ||
    !price ||
    !customer ||
    contract.contracted_amount_cents !== receipt.amount_paid_cents ||
    contract.contracted_currency !== "BRL" ||
    contract.contracted_interval !== "month" ||
    contract.contracted_interval_count !== 1
  )
    throw new FeeObservationError("scope_mismatch");
  return receipt;
}
async function audit(
  tx: Prisma.TransactionClient,
  actorId: string,
  id: string,
  action: string,
  after: Prisma.InputJsonObject,
) {
  await tx.admin_activity_log.create({
    data: {
      admin_id: actorId,
      target_type: "billing_stripe_fee_observation",
      target_id: id,
      domain: "finance",
      action,
      source: "admin_panel",
      reason: "read_only_provider_observation",
      changed_fields: Object.keys(after),
      safe_after: after,
      metadata: { financial_actions_executed: false, provider_actions: "read_only" },
    },
  });
}
export class StripeFeeObservationRepository {
  async claim(target: StripeBalanceTarget, actorId: string) {
    return withSerializableTransaction(async (tx) => {
      await feeActor(tx, actorId);
      await assertFeeTarget(tx, target);
      const now = new Date();
      let row = await tx.billing_stripe_fee_observation.upsert({
        where: {
          gateway_mode_account_id_receipt_id: { ...feeScope(target), receipt_id: target.receiptId },
        },
        create: {
          ...feeScope(target),
          receipt_id: target.receiptId,
          receipt_hash: target.receiptHash,
          cutoff: now,
        },
        update: {},
      });
      if (row.receipt_hash !== target.receiptHash) throw new FeeObservationError("fact_conflict");
      if (row.state === "conflict" || (row.lease_until && row.lease_until > now))
        return { row, claim: null };
      const restarting = row.stage === "complete";
      const token = randomUUID();
      const updated = await tx.billing_stripe_fee_observation.updateMany({
        where: {
          id: row.id,
          revision: row.revision,
          OR: [{ lease_until: null }, { lease_until: { lte: now } }],
        },
        data: {
          state: "processing",
          revision: { increment: 1 },
          lease_token: token,
          lease_until: new Date(now.getTime() + 180000),
          last_error_code: null,
          ...(restarting
            ? {
                stage: "capture",
                cutoff: now,
                refunds_cursor: null,
                disputes_cursor: null,
                refunds_scanned: false,
                disputes_scanned: false,
                refunds_gap: false,
                disputes_gap: false,
              }
            : {}),
        },
      });
      if (updated.count !== 1) throw new FeeObservationError("lease_unavailable");
      row = await tx.billing_stripe_fee_observation.findUniqueOrThrow({ where: { id: row.id } });
      await audit(tx, actorId, row.id, "stripe_fees_observation_started", {
        stage: row.stage,
        revision: row.revision,
      });
      return { row, claim: row as FeeClaim };
    });
  }
  async commit(
    claim: FeeClaim,
    target: StripeBalanceTarget,
    actorId: string,
    page: StripeBalancePage,
  ) {
    return withSerializableTransaction(async (tx) => {
      await feeActor(tx, actorId);
      await assertFeeTarget(tx, target);
      const current = await tx.billing_stripe_fee_observation.findFirst({
        where: {
          id: claim.id,
          revision: claim.revision,
          lease_token: claim.lease_token,
          receipt_hash: target.receiptHash,
        },
      });
      if (!current) throw new FeeObservationError("lease_unavailable");
      assertBalancePage(target, current.stage, page);
      for (const fact of page.facts) {
        const hash = balanceFactHash(target, fact);
        const existing = await tx.billing_stripe_balance_fact.findUnique({
          where: {
            gateway_mode_account_id_provider_transaction_id: {
              ...feeScope(target),
              provider_transaction_id: fact.providerTransactionId,
            },
          },
        });
        const anotherCapture =
          fact.kind === "capture" &&
          (await tx.billing_stripe_balance_fact.findFirst({
            where: {
              receipt_id: target.receiptId,
              ...feeScope(target),
              kind: "capture",
              NOT: { provider_transaction_id: fact.providerTransactionId },
            },
          }));
        if (
          anotherCapture ||
          (existing &&
            (existing.immutable_hash !== hash ||
              storedBalanceFactHash(existing) !== existing.immutable_hash))
        )
          throw new FeeObservationError("fact_conflict");
        if (existing) {
          await tx.billing_stripe_balance_fact.update({
            where: { id: existing.id },
            data: { status: fact.status, available_on: fact.availableOn, observed_at: new Date() },
          });
        } else
          await tx.billing_stripe_balance_fact.create({
            data: {
              ...feeScope(target),
              receipt_id: target.receiptId,
              receipt_immutable_hash: target.receiptHash,
              provider_transaction_id: fact.providerTransactionId,
              kind: fact.kind,
              source_id: fact.sourceId,
              charge_id: fact.chargeId,
              currency: fact.currency,
              amount_cents: fact.amountCents,
              fee_cents: fact.feeCents,
              net_cents: fact.netCents,
              provider_created_at: fact.providerCreatedAt,
              status: fact.status,
              available_on: fact.availableOn,
              immutable_hash: hash,
              observed_at: new Date(),
            },
          });
      }
      let stage = current.stage;
      let capture = current.capture_verified,
        refunds = current.refunds_scanned,
        disputes = current.disputes_scanned;
      let refundsGap = current.refunds_gap,
        disputesGap = current.disputes_gap;
      if (stage === "capture") {
        if (page.gap || !page.facts.some((fact) => fact.kind === "capture"))
          throw new FeeObservationError("balance_missing");
        capture = true;
        stage = "refunds";
      } else if (stage === "refunds") {
        refundsGap ||= page.gap;
        refunds = !page.hasMore && !refundsGap;
        stage = page.hasMore ? "refunds" : "disputes";
      } else if (stage === "disputes") {
        disputesGap ||= page.gap;
        disputes = !page.hasMore && !disputesGap;
        stage = page.hasMore ? "disputes" : "complete";
      }
      const state = stage === "complete" && capture && refunds && disputes ? "observed" : "partial";
      const row = await tx.billing_stripe_fee_observation.update({
        where: { id: current.id },
        data: {
          state,
          stage,
          capture_verified: capture,
          refunds_scanned: refunds,
          disputes_scanned: disputes,
          refunds_gap: refundsGap,
          disputes_gap: disputesGap,
          ...(current.stage === "refunds" ? { refunds_cursor: page.nextCursor } : {}),
          ...(current.stage === "disputes" ? { disputes_cursor: page.nextCursor } : {}),
          lease_token: null,
          lease_until: null,
          last_error_code: refundsGap || disputesGap || page.gap ? "balance_missing" : null,
          observed_at: new Date(),
        },
      });
      await audit(tx, actorId, row.id, "stripe_fees_observation_saved", {
        stage,
        state,
        revision: row.revision,
        facts_observed: page.facts.length,
        capture_verified: capture,
        refunds_scanned: refunds,
        disputes_scanned: disputes,
      });
      return row;
    });
  }
  async fail(claim: FeeClaim, actorId: string, code: FeeDiagnostic) {
    return withSerializableTransaction(async (tx) => {
      const state =
        ["fact_conflict", "scope_mismatch", "invalid_receipt"].includes(code) ||
        (code === "unsupported_balance" && claim.stage === "capture")
          ? "conflict"
          : claim.capture_verified
            ? "partial"
            : "unavailable";
      const updated = await tx.billing_stripe_fee_observation.updateMany({
        where: { id: claim.id, revision: claim.revision, lease_token: claim.lease_token },
        data: { state, last_error_code: code, lease_token: null, lease_until: null },
      });
      if (updated.count)
        await audit(tx, actorId, claim.id, "stripe_fees_observation_deferred", {
          state,
          diagnostic: code,
          revision: claim.revision,
        });
      return tx.billing_stripe_fee_observation.findUniqueOrThrow({ where: { id: claim.id } });
    });
  }
}
