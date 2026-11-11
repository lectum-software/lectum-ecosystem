import { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { invoiceGatewayScopes } from "@/modules/billing/invoices/gateway-scope";
import type { SubscriptionHistorySnapshot } from "@/utils/professional-plan-history";
import { subscriptionSelect } from "./AdminFinanceDashboardRepository";

export const FINANCE_LEDGER_SCAN_LIMIT = 10_000;
export class FinanceLedgerFilterRequiredError extends Error {}
export const assertFinanceLedgerSize = (size: number) => {
  if (size > FINANCE_LEDGER_SCAN_LIMIT) throw new FinanceLedgerFilterRequiredError();
};

/** No SDK, provider, refresh, bootstrap or worker: one bounded local snapshot. */
export async function readAdminFinanceStripeLedger(subscriptionIds?: string[]) {
  const scopes = [...invoiceGatewayScopes("test"), ...invoiceGatewayScopes("live")].filter(
    (scope) => scope.gateway === "stripe",
  );
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const now = new Date();
      const contracts = await tx.professional_subscription.findMany({
        where: {
          gateway: "stripe",
          source: "stripe",
          ...(subscriptionIds ? { id: { in: subscriptionIds } } : {}),
        },
        select: {
          ...subscriptionSelect,
          psychologist_id: true,
          price_version_id: true,
          plan_id: true,
        },
        orderBy: { id: "asc" },
        take: FINANCE_LEDGER_SCAN_LIMIT + 1,
      });
      assertFinanceLedgerSize(contracts.length);
      const ids = contracts.map((row) => row.id);
      const receipts = await tx.billing_financial_receipt.findMany({
        where: subscriptionIds ? { subscription_id: { in: ids } } : { gateway: "stripe" },
        orderBy: [{ paid_at: "asc" }, { id: "asc" }],
        take: FINANCE_LEDGER_SCAN_LIMIT + 1,
      });
      const reconciliations = await tx.billing_financial_reconciliation.findMany({
        where: { subscription_id: { in: ids } },
        take: FINANCE_LEDGER_SCAN_LIMIT + 1,
        orderBy: { id: "asc" },
      });
      const history = await tx.professional_subscription_history.findMany({
        where: { subscription_id: { in: ids }, observed_at: { lte: now } },
        take: FINANCE_LEDGER_SCAN_LIMIT + 1,
        orderBy: [{ observed_at: "asc" }, { id: "asc" }],
      });
      const coverage = await tx.professional_plan_history_coverage.findUnique({ where: { id: 1 } });
      const prices = await tx.billing_price_version.findMany({
        where: {
          id: {
            in: contracts.flatMap((row) => (row.price_version_id ? [row.price_version_id] : [])),
          },
        },
        take: FINANCE_LEDGER_SCAN_LIMIT + 1,
        orderBy: { id: "asc" },
      });
      for (const rows of [receipts, reconciliations, history, prices])
        assertFinanceLedgerSize(rows.length);
      return {
        now,
        scopes,
        contracts,
        receipts,
        reconciliations,
        prices,
        history: history as SubscriptionHistorySnapshot[],
        coverageStartedAt: coverage?.started_at ?? null,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 20_000 },
  );
}
export type FinanceStripeSnapshot = Awaited<ReturnType<typeof readAdminFinanceStripeLedger>>;
export type FinanceStripeContract = FinanceStripeSnapshot["contracts"][number];
