import type Stripe from "stripe";
import { assertBalanceCharge, projectBalanceFact } from "./stripe-balance-projection";
import type {
  BalanceFactKind,
  BalanceStage,
  StripeBalancePage,
  StripeBalanceTarget,
} from "./stripe-balance-types";
import { StripeGatewayError } from "./stripe-error";
import {
  assertStripeMode,
  requireStripeDisputeId,
  requireStripeId,
  stripeDate,
  stripeId,
} from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

const PAGE_SIZE = 3;
/** GET-only on canonical objects scoped to a single verified receipt/charge. Never expands BT.source. */
export const stripeBalanceApi = (
  client: Stripe,
  identity: () => StripeIdentity,
  run: <T>(action: () => Promise<T>) => Promise<T>,
) => ({
  observeStripeBalanceStage: (
    target: StripeBalanceTarget,
    input: { stage: BalanceStage; cursor: string | null; cutoff: Date },
  ): Promise<StripeBalancePage> =>
    run(async () => {
      let requests = 0;
      const deadline = Date.now() + 25000;
      const options = { timeout: 5000 };
      const read = async <T>(action: () => Promise<T>) => {
        if (++requests > 8 || Date.now() > deadline)
          throw new StripeGatewayError("provider_unavailable");
        return action();
      };
      const now = new Date();
      if (!Number.isFinite(input.cutoff.getTime()) || input.cutoff > now)
        throw new StripeGatewayError("resource_invalid");
      const charge = await read(() =>
        client.charges.retrieve(requireStripeId(target.chargeId, "ch"), {}, options),
      );
      assertBalanceCharge(charge, target, identity());
      const facts: StripeBalancePage["facts"] = [];
      let gap = false;
      const collect = async (
        id: string,
        kind: BalanceFactKind,
        sourceId: string,
        expectedAmount?: number,
      ) => {
        if (facts.some((row) => row.providerTransactionId === id))
          throw new StripeGatewayError("contract_invalid");
        const transaction = await read(() =>
          client.balanceTransactions.retrieve(requireStripeId(id, "txn"), {}, options),
        );
        facts.push(
          projectBalanceFact(
            transaction,
            target,
            { id, kind, sourceId, expectedAmount },
            new Date(),
          ),
        );
      };
      if (input.stage === "capture") {
        const transactionId = stripeId(charge.balance_transaction, "txn");
        if (!transactionId) return { facts, nextCursor: null, hasMore: false, gap: true, requests };
        await collect(transactionId, "capture", charge.id, target.amountCents);
        return { facts, nextCursor: null, hasMore: false, gap: false, requests };
      }
      const created = { lte: Math.floor(input.cutoff.getTime() / 1000) };
      if (input.stage === "refunds") {
        const page = await read(() =>
          client.refunds.list(
            {
              charge: target.chargeId,
              limit: PAGE_SIZE,
              created,
              ...(input.cursor ? { starting_after: requireStripeId(input.cursor, "re") } : {}),
            },
            options,
          ),
        );
        if (
          !Array.isArray(page.data) ||
          typeof page.has_more !== "boolean" ||
          page.data.length > PAGE_SIZE
        )
          throw new StripeGatewayError("contract_invalid");
        const seen = new Set<string>();
        for (const refund of page.data) {
          const id = requireStripeId(refund.id, "re"),
            date = stripeDate(refund.created);
          if (
            seen.has(id) ||
            id === input.cursor ||
            stripeId(refund.charge, "ch") !== target.chargeId ||
            stripeId(refund.payment_intent, "pi") !== target.paymentIntentId ||
            refund.currency !== "brl" ||
            !Number.isSafeInteger(refund.amount) ||
            refund.amount <= 0 ||
            refund.amount > target.amountCents ||
            !date ||
            date > input.cutoff
          )
            throw new StripeGatewayError("resource_mismatch");
          seen.add(id);
          const primary = stripeId(refund.balance_transaction, "txn"),
            reversal = stripeId(refund.failure_balance_transaction, "txn");
          if (primary) await collect(primary, "refund", id, -refund.amount);
          else gap = true;
          if (reversal) await collect(reversal, "refund_reversal", id, refund.amount);
        }
        if (page.has_more && !page.data.length) throw new StripeGatewayError("contract_invalid");
        return {
          facts,
          nextCursor: page.has_more ? page.data.at(-1)!.id : null,
          hasMore: page.has_more,
          gap,
          requests,
        };
      }
      const page = await read(() =>
        client.disputes.list(
          {
            charge: target.chargeId,
            limit: PAGE_SIZE,
            created,
            ...(input.cursor ? { starting_after: requireStripeDisputeId(input.cursor) } : {}),
          },
          options,
        ),
      );
      if (
        !Array.isArray(page.data) ||
        typeof page.has_more !== "boolean" ||
        page.data.length > PAGE_SIZE
      )
        throw new StripeGatewayError("contract_invalid");
      const seen = new Set<string>();
      for (const dispute of page.data) {
        const id = requireStripeDisputeId(dispute.id),
          date = stripeDate(dispute.created);
        assertStripeMode(dispute.livemode, identity());
        if (
          seen.has(id) ||
          id === input.cursor ||
          stripeId(dispute.charge, "ch") !== target.chargeId ||
          stripeId(dispute.payment_intent, "pi") !== target.paymentIntentId ||
          dispute.currency !== "brl" ||
          !Number.isSafeInteger(dispute.amount) ||
          dispute.amount <= 0 ||
          dispute.amount > target.amountCents ||
          !date ||
          date > input.cutoff ||
          dispute.balance_transactions.length > 2
        )
          throw new StripeGatewayError("resource_mismatch");
        seen.add(id);
        if (!dispute.balance_transactions.length) gap = true;
        for (const transaction of dispute.balance_transactions)
          await collect(requireStripeId(transaction, "txn"), "dispute", id);
      }
      if (page.has_more && !page.data.length) throw new StripeGatewayError("contract_invalid");
      return {
        facts,
        nextCursor: page.has_more ? page.data.at(-1)!.id : null,
        hasMore: page.has_more,
        gap,
        requests,
      };
    }),
});
