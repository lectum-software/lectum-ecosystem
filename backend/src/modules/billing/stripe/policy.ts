import { createHash } from "node:crypto";
import { StripeGatewayError } from "../payment-gateway/stripe-error";
import type {
  StripeCanonicalSubscription,
  StripeIdentity,
  StripeSetup,
} from "../payment-gateway/stripe-types";

export const OPEN_OPERATION_STATES = [
  "reserved",
  "creating",
  "requires_confirmation",
  "processing",
  "review_required",
];
export type OperationKind = "checkout" | "payment_method";
export type OperationState =
  | "requires_confirmation"
  | "processing"
  | "complete"
  | "failed"
  | "review_required";
export type CheckoutIntent = "subscription" | "courtesy_renewal";

export class StripeBillingError extends Error {
  constructor(
    readonly code: string,
    readonly status = 409,
  ) {
    super("BILLING_OPERATION_UNAVAILABLE");
    this.name = "StripeBillingError";
  }
}

export const stripeCardPolicyPublicError = (failure: unknown) =>
  failure instanceof StripeGatewayError && failure.kind === "card_credit_required"
    ? new StripeBillingError("billing_payment_method_credit_card_only", 400)
    : null;

export const preserveStripeCardPolicyRejection = (
  previousCode: string | null,
  nextCode:
    | "card_credit_required"
    | "checkout_resume_unresolved"
    | "setup_resume_unresolved"
    | null,
) => (previousCode === "card_credit_required" ? "card_credit_required" : nextCode);

export const publicOperationState = (state: string): OperationState => {
  if (["requires_confirmation", "complete", "failed", "review_required"].includes(state)) {
    return state as OperationState;
  }
  return "processing";
};

export const stripeOperationReference = (id: string) =>
  createHash("sha256").update(`lectum.stripe.operation.v1:${id}`).digest("hex").slice(0, 24);

export const sameIdentity = (
  record: { account_id: string | null; mode: string | null },
  identity: StripeIdentity,
) => record.account_id === identity.accountId && record.mode === identity.mode;

export const validDate = (value: Date | null | undefined): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

export const hasPaidCurrentPeriod = (remote: StripeCanonicalSubscription, now = new Date()) =>
  remote.latestInvoicePaid &&
  remote.latestInvoicePaymentVerified &&
  remote.latestInvoiceAmountPaid > 0 &&
  remote.latestInvoiceRefundedCents === 0 &&
  !remote.latestInvoiceDisputed &&
  validDate(remote.latestInvoicePaidAt) &&
  remote.latestInvoicePaidAt <= now &&
  validDate(remote.latestInvoicePaymentPaidAt) &&
  remote.latestInvoicePaymentPaidAt <= now &&
  validDate(remote.latestInvoicePeriodStart) &&
  remote.latestInvoicePeriodStart <= now &&
  validDate(remote.latestInvoicePeriodEnd) &&
  remote.latestInvoicePeriodEnd > now &&
  remote.latestInvoicePeriodEnd > remote.latestInvoicePeriodStart;

export const resolveStripeEntitlement = (
  remote: StripeCanonicalSubscription,
  previous: { status: string; current_period_end: Date | null },
  now = new Date(),
) => {
  const paidPeriod = hasPaidCurrentPeriod(remote, now) ? remote.latestInvoicePeriodEnd : null;
  // A local cancellation (including an administrative termination) never reopens on late events.
  if (previous.status === "cancelada") {
    return {
      status: "cancelada",
      currentPeriodEnd:
        previous.current_period_end && paidPeriod
          ? new Date(Math.min(previous.current_period_end.getTime(), paidPeriod.getTime()))
          : null,
    };
  }
  if (remote.gatewayStatus === "canceled" || remote.gatewayStatus === "incomplete_expired") {
    return { status: "cancelada", currentPeriodEnd: paidPeriod };
  }
  if (remote.gatewayStatus === "trialing" || remote.gatewayStatus === "incomplete") {
    return { status: "inativa", currentPeriodEnd: null };
  }
  if (paidPeriod && remote.gatewayStatus === "active") {
    return {
      status: remote.cancelAtPeriodEnd ? "cancelada" : "ativa",
      currentPeriodEnd: paidPeriod,
    };
  }
  return {
    status: ["past_due", "unpaid", "paused"].includes(remote.gatewayStatus)
      ? "inadimplente"
      : "inativa",
    currentPeriodEnd: null,
  };
};

export const canonicalTerminal = (remote: StripeCanonicalSubscription) =>
  remote.gatewayStatus === "canceled" || remote.gatewayStatus === "incomplete_expired";

export const nextInboxAttempt = (attempt: number, now = new Date()) =>
  new Date(now.getTime() + Math.min(6 * 60 * 60_000, 30_000 * 2 ** Math.min(attempt, 10)));

export const isCourtesySetupVerified = (input: {
  intent: string | null;
  intentKind: string | null;
  pinnedIntentId: string | null;
  scheduledStart: Date | null;
  previousStatus: string;
  remote: StripeCanonicalSubscription;
  setup: StripeSetup | null;
  // Internal proof from successful guarded assignment; never accepted from an HTTP caller.
  verifiedCreditSetupId?: string;
}) =>
  Boolean(
    input.intent === "courtesy_renewal" &&
      input.intentKind === "setup" &&
      input.previousStatus !== "cancelada" &&
      input.remote.gatewayStatus === "trialing" &&
      validDate(input.scheduledStart) &&
      validDate(input.remote.trialEnd) &&
      Math.floor(input.scheduledStart.getTime() / 1_000) ===
        Math.floor(input.remote.trialEnd.getTime() / 1_000) &&
      input.pinnedIntentId &&
      input.verifiedCreditSetupId === input.pinnedIntentId &&
      input.setup?.setupIntentId === input.pinnedIntentId &&
      input.setup.status === "succeeded" &&
      input.setup.customerId === input.remote.customerId &&
      input.setup.mode === input.remote.mode &&
      input.setup.accountId === input.remote.accountId &&
      input.setup.paymentMethodId &&
      input.setup.paymentMethodId === input.remote.defaultPaymentMethodId,
  );
