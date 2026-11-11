import type Stripe from "stripe";
import type {
  BalanceFactKind,
  StripeBalanceFact,
  StripeBalanceTarget,
} from "./stripe-balance-types";
import { StripeGatewayError } from "./stripe-error";
import { assertStripeMode, requireStripeId, stripeDate, stripeId } from "./stripe-projection";
import type { StripeIdentity } from "./stripe-types";

export function assertBalanceCharge(
  charge: Stripe.Charge,
  target: StripeBalanceTarget,
  identity: StripeIdentity,
) {
  assertStripeMode(charge.livemode, identity);
  if (
    target.accountId !== identity.accountId ||
    target.mode !== identity.mode ||
    charge.id !== requireStripeId(target.chargeId, "ch") ||
    stripeId(charge.payment_intent, "pi") !== target.paymentIntentId ||
    stripeId(charge.customer, "cus") !== target.customerId ||
    charge.currency !== "brl" ||
    charge.status !== "succeeded" ||
    !charge.paid ||
    !charge.captured ||
    !Number.isSafeInteger(charge.amount_captured) ||
    charge.amount_captured !== target.amountCents ||
    charge.payment_method_details?.type !== "card"
  )
    throw new StripeGatewayError("resource_mismatch");
}
export function projectBalanceFact(
  transaction: Stripe.BalanceTransaction,
  target: StripeBalanceTarget,
  expected: { id: string; kind: BalanceFactKind; sourceId: string; expectedAmount?: number },
  now: Date,
): StripeBalanceFact {
  const created = stripeDate(transaction.created),
    available = stripeDate(transaction.available_on);
  const types: Record<BalanceFactKind, string[]> = {
    capture: ["charge", "payment"],
    refund: ["refund", "payment_refund"],
    refund_reversal: ["refund_failure", "payment_failure_refund", "payment_reversal"],
    dispute: ["adjustment"],
  };
  const source =
    typeof transaction.source === "string" ? transaction.source : transaction.source?.id;
  if (
    transaction.id !== requireStripeId(expected.id, "txn") ||
    source !== expected.sourceId ||
    transaction.currency !== "brl" ||
    !created ||
    created > now ||
    !available ||
    !["pending", "available"].includes(transaction.status) ||
    !types[expected.kind].includes(transaction.type) ||
    ![transaction.amount, transaction.fee, transaction.net].every(Number.isSafeInteger)
  )
    throw new StripeGatewayError("contract_invalid");
  const amount = BigInt(transaction.amount),
    fee = BigInt(transaction.fee),
    net = BigInt(transaction.net);
  if (
    net !== amount - fee ||
    (expected.expectedAmount !== undefined && amount !== BigInt(expected.expectedAmount)) ||
    (expected.kind === "capture" && amount <= 0n) ||
    (expected.kind === "refund" && amount >= 0n) ||
    (expected.kind === "refund_reversal" && amount <= 0n)
  )
    throw new StripeGatewayError("contract_invalid");
  return {
    providerTransactionId: transaction.id,
    kind: expected.kind,
    sourceId: expected.sourceId,
    chargeId: target.chargeId,
    currency: "BRL",
    amountCents: amount,
    feeCents: fee,
    netCents: net,
    providerCreatedAt: created,
    status: transaction.status as "pending" | "available",
    availableOn: available,
  };
}
