import { getStripeGateway } from "../../payment-gateway";
import type { BalanceStage, StripeBalanceTarget } from "../../payment-gateway/stripe-balance-types";
import { stripeFailureObservation } from "../../payment-gateway/stripe-error";
import { financialReference } from "../financial-ledger/policy";
import { feeDiagnostic, observationHasMore } from "./policy";
import { StripeFeeObservationRepository } from "./repository";
/** Explicit scoped observation. No boot worker, provider mutation or fiscal/entitlement dependency. */
export async function observeReceiptFees(target: StripeBalanceTarget, actorId: string) {
  const receiptId = target.receiptId;
  const repository = new StripeFeeObservationRepository();
  const { row, claim } = await repository.claim(target, actorId);
  const result = (current: typeof row) => ({
    receipt_id: receiptId,
    state: current.state,
    has_more: observationHasMore(current),
    provider_actions: "read_only" as const,
    financial_actions_executed: false as const,
  });
  if (!claim) return { status: row.state === "processing" ? 202 : 200, data: result(row) };
  try {
    const page = await getStripeGateway().observeStripeBalanceStage(target, {
      stage: claim.stage as BalanceStage,
      cursor: claim.stage === "refunds" ? claim.refunds_cursor : claim.disputes_cursor,
      cutoff: claim.cutoff,
    });
    return { status: 200, data: result(await repository.commit(claim, target, actorId, page)) };
  } catch (cause) {
    const diagnostic = feeDiagnostic(cause);
    const deferred = await repository.fail(claim, actorId, diagnostic);
    console.warn("[BILLING_FEES] Observação de tarifas aguardando revisão.", {
      receipt_ref: financialReference(receiptId),
      stage: claim.stage,
      revision: claim.revision,
      observed_at: new Date().toISOString(),
      ...stripeFailureObservation(cause),
      diagnostic,
    });
    return { status: 200, data: result(deferred) };
  }
}
