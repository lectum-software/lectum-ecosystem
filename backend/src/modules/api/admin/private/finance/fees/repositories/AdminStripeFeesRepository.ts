import prisma from "@/infra/database/prisma";
import { FeeObservationError } from "@/modules/billing/stripe/balance-observer/policy";
import { feeActor } from "@/modules/billing/stripe/balance-observer/repository";
import {
  FinanceLedgerFilterRequiredError,
  readAdminFinanceStripeLedgerRecords,
} from "../../dashboard/repositories/AdminFinanceStripeLedgerRepository";
import { parseFinanceDateOnly } from "../../dashboard/use-cases/services/periods";
import { projectFinanceStripeLedger } from "../../dashboard/use-cases/services/stripe-ledger-projection";
import type { FeeQuery } from "../DTOs/IAdminStripeFeesDTO";
export async function readStripeFeesSnapshot(actorId: string, query: FeeQuery) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await feeActor(tx, actorId);
      const now = new Date();
      const ledger = projectFinanceStripeLedger(await readAdminFinanceStripeLedgerRecords(tx, now));
      if (ledger.invalid) throw new FeeObservationError("invalid_receipt");
      const from = query.from ? parseFinanceDateOnly(query.from, "start") : null,
        to = query.to ? parseFinanceDateOnly(query.to, "end") : null;
      const receipts = ledger.valid.filter(
        ({ row }) => (!from || row.paid_at >= from) && (!to || row.paid_at <= to),
      );
      const ids = receipts.map(({ row }) => row.id);
      const facts = await tx.billing_stripe_balance_fact.findMany({
        where: { receipt_id: { in: ids } },
        orderBy: [{ provider_created_at: "asc" }, { id: "asc" }],
        take: 20001,
      });
      if (facts.length > 20000) throw new FinanceLedgerFilterRequiredError();
      const observations = await tx.billing_stripe_fee_observation.findMany({
        where: { receipt_id: { in: ids } },
        take: 10001,
      });
      if (observations.length > 10000) throw new FinanceLedgerFilterRequiredError();
      return { now, receipts, facts, observations, mode: ledger.scopes[0]?.mode ?? null };
    },
    { isolationLevel: "RepeatableRead", timeout: 20000 },
  );
}
export type StripeFeesSnapshot = Awaited<ReturnType<typeof readStripeFeesSnapshot>>;
