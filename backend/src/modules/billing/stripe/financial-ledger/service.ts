import { getStripeGateway } from "../../payment-gateway";
import type { StripeFinancialReceipt } from "../../payment-gateway/stripe-financial-types";
import type { StripeIdentity } from "../../payment-gateway/stripe-types";
import {
  FinancialLedgerError,
  type FinancialReconcileOptions,
  financialFailureCode,
  financialReference,
  validateFinancialOptions,
} from "./policy";
import { FinancialLedgerRepository } from "./repository";

export const financialLedgerAutomationEnabled = () =>
  process.env.BILLING_STRIPE_LEDGER_ENABLED === "true";

export const reconcileStripeFinancialLedger = async (options: FinancialReconcileOptions) => {
  validateFinancialOptions(options);
  const gateway = getStripeGateway();
  if (gateway.identity.mode !== options.mode || gateway.identity.accountId !== options.accountId)
    throw new FinancialLedgerError("scope_mismatch");
  const repository = new FinancialLedgerRepository();
  const target = await repository.target(options.subscriptionId, gateway.identity);
  let row = options.apply
    ? await repository.request(target, gateway.identity, { refresh: options.refresh })
    : null;
  let cursor: string | null = null;
  let cutoff = new Date();
  let invoices = 0;
  let receipts = 0;
  let excluded = 0;
  let hasMore = false;
  let pages = 0;
  for (; pages < (options.maxPages ?? 1); pages++) {
    if (row?.state === "complete") break;
    if (row?.state === "review_required") throw new FinancialLedgerError("lease_unavailable");
    const claim = row ? await repository.claim(row) : null;
    if (row && !claim) throw new FinancialLedgerError("lease_unavailable");
    if (claim) {
      cursor = claim.cursor;
      cutoff = claim.scan_started_at;
    }
    try {
      const observedAt = new Date();
      const contract = await gateway.getFinancialContract(target.provider);
      if (contract.createdAt > cutoff) throw new FinancialLedgerError("unsupported_invoice");
      const page = await gateway.listFinancialInvoices(target.provider, {
        cursor,
        cutoff,
        limit: 5,
      });
      const confirmed: StripeFinancialReceipt[] = [];
      let pageExcluded = 0;
      for (const invoiceId of page.invoiceIds) {
        const result = await gateway.getFinancialInvoice(target.provider, invoiceId, cutoff);
        if (result.kind === "receipt") confirmed.push(result.receipt);
        else pageExcluded++;
      }
      invoices += page.invoiceIds.length;
      receipts += confirmed.length;
      excluded += pageExcluded;
      hasMore = page.hasMore;
      cursor = page.nextCursor;
      if (claim)
        row = await repository.commitPage(claim, target, {
          receipts: confirmed,
          invoiceCount: page.invoiceIds.length,
          excludedCount: pageExcluded,
          nextCursor: cursor,
          hasMore,
          coveredFrom: contract.createdAt,
          observedAt,
        });
      if (!hasMore) {
        pages++;
        break;
      }
    } catch (error) {
      const code = financialFailureCode(error);
      if (claim) await repository.fail(claim, code);
      throw new FinancialLedgerError(code);
    }
  }
  return {
    subscription_ref: financialReference(target.subscriptionId),
    apply: options.apply,
    pages_read: pages,
    invoices_read: invoices,
    receipts_read: receipts,
    excluded_read: excluded,
    has_more: hasMore,
    state: row?.state ?? "dry_run",
    coverage_written: Boolean(row?.state === "complete"),
    receipts_complete: row?.receipts_complete ?? false,
    periods_complete: row?.periods_complete ?? false,
    adjustments_complete: false,
  };
};

/** Local durable queue only: no provider call and no dependency on fiscal/active-account rules. */
export const enqueueStripeFinancialReconciliation = async (input: {
  identity: StripeIdentity;
  providerSubscriptionId: string;
  eventId: string;
}) => {
  if (!financialLedgerAutomationEnabled()) return false;
  const repository = new FinancialLedgerRepository();
  return repository.enqueueReference(input.providerSubscriptionId, input.identity, input.eventId);
};

export const processStripeFinancialReconciliations = async () => {
  if (!financialLedgerAutomationEnabled()) return;
  const identity = getStripeGateway().identity;
  const repository = new FinancialLedgerRepository();
  for (const row of await repository.due(identity)) {
    try {
      await reconcileStripeFinancialLedger({
        subscriptionId: row.subscription_id,
        accountId: identity.accountId,
        mode: identity.mode,
        apply: true,
        confirm: identity.mode,
        maxPages: 1,
      });
    } catch (error) {
      const current = await repository.read(row.id);
      const code = financialFailureCode(error);
      const claim =
        current &&
        current.requested_revision === row.requested_revision &&
        ["not_found", "scope_mismatch"].includes(code)
          ? await repository.claim(current)
          : null;
      if (claim) await repository.fail(claim, financialFailureCode(error));
      console.warn("[BILLING_FINANCIAL] Conciliação financeira aguardando revisão.", {
        subscription_ref: financialReference(row.subscription_id),
        diagnostic: financialFailureCode(error),
      });
    }
  }
};
