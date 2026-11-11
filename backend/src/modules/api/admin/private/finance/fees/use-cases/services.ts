import { z } from "zod";
import type { StripeBalanceTarget } from "@/modules/billing/payment-gateway/stripe-balance-types";
import { FeeObservationError } from "@/modules/billing/stripe/balance-observer/policy";
import { observeReceiptFees } from "@/modules/billing/stripe/balance-observer/service";
import { FinancialLedgerRepository } from "@/modules/billing/stripe/financial-ledger/repository";
import { readAdminFinanceStripeLedger } from "../../dashboard/repositories/AdminFinanceStripeLedgerRepository";
import { projectFinanceStripeLedger } from "../../dashboard/use-cases/services/stripe-ledger-projection";
import { readStripeFeesSnapshot } from "../repositories/AdminStripeFeesRepository";
import { projectStripeFees } from "./projection";
export const feeDay = z.iso
  .date()
  .refine((value) => value >= "2000-01-01" && value <= "2100-12-31");
export const feeQuery = z
  .object({
    from: feeDay.optional(),
    to: feeDay.optional(),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((query) => !query.from || !query.to || query.from <= query.to);
export async function loadFeeTarget(receiptId: string): Promise<StripeBalanceTarget> {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(receiptId)) throw new FeeObservationError("invalid_arguments");
  const ledger = projectFinanceStripeLedger(await readAdminFinanceStripeLedger());
  if (ledger.invalid) throw new FeeObservationError("invalid_receipt");
  const found = ledger.valid.find((item) => item.row.id === receiptId);
  if (!found) throw new FeeObservationError("receipt_not_found");
  const row = found.row;
  const identity = { accountId: row.account_id, mode: row.mode as "test" | "live" };
  const local = await new FinancialLedgerRepository().target(row.subscription_id, identity);
  if (
    local.psychologistId !== row.psychologist_id ||
    local.priceVersionId !== row.price_version_id ||
    local.provider.subscriptionId !== row.provider_subscription_id ||
    local.provider.priceId !== row.price_id ||
    local.provider.amountCents !== row.amount_paid_cents
  )
    throw new FeeObservationError("scope_mismatch");
  return {
    ...identity,
    receiptId: row.id,
    receiptHash: row.immutable_hash,
    chargeId: row.charge_id,
    paymentIntentId: row.payment_intent_id,
    customerId: local.provider.customerId,
    amountCents: row.amount_paid_cents,
  };
}

export async function listAdminFees(actorId: string, input: unknown) {
  const query = feeQuery.safeParse(input);
  if (!query.success) throw new FeeObservationError("invalid_arguments");
  return projectStripeFees(await readStripeFeesSnapshot(actorId, query.data), query.data);
}
export async function observeAdminFees(actorId: string, receiptId: string) {
  return observeReceiptFees(await loadFeeTarget(receiptId), actorId);
}
