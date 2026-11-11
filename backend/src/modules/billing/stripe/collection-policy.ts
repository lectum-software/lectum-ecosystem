import { createHash } from "node:crypto";
import { STRIPE_REPLAY_WINDOW_MS } from "./recovery-policy";

export const CREDIT_COLLECTION_POLICY = "manual_credit_v1";
export const MAX_COLLECTION_CONFIRMATIONS = 4;
export const MAX_COLLECTION_TRANSIENT_ATTEMPTS = 8;

export const collectionRequestKey = (invoiceId: string) =>
  `credit-invoice-${createHash("sha256").update(invoiceId).digest("hex")}`;

export const collectionConfirmationFingerprint = (input: {
  operationId: string;
  intentId: string;
  invoiceId: string;
  paymentMethodId: string;
  sequence: number;
  offSession?: boolean;
}) =>
  createHash("sha256")
    .update(
      JSON.stringify([
        "lectum.credit.confirm.v1",
        input.operationId,
        input.intentId,
        input.invoiceId,
        input.paymentMethodId,
        input.sequence,
        input.offSession === true,
      ]),
    )
    .digest("hex");

/** A worker gets one financial attempt. SCA and a replacement card require the owner. */
export const collectionConfirmationDecision = (input: {
  intentStatus: string;
  sequence: number;
  pending: boolean;
  fingerprintMatches: boolean;
  operationCreatedAt: Date;
  allowConfirmation: boolean;
  ownerPresent: boolean;
  paymentMethodChanged: boolean;
  authenticationRequired?: boolean;
  initialInvoice?: boolean;
  initialOwnerConfirmation?: boolean;
  now?: Date;
}): "wait" | "confirm" | "replay" | "review" => {
  if (!["requires_confirmation", "requires_payment_method"].includes(input.intentStatus))
    return "wait";
  if (!input.allowConfirmation) return "wait";
  const age = (input.now ?? new Date()).getTime() - input.operationCreatedAt.getTime();
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    !Number.isInteger(input.sequence) ||
    input.sequence < 0 ||
    input.sequence > MAX_COLLECTION_CONFIRMATIONS
  )
    return "review";
  // A stored SetupIntent/default is not consent to the first financial attempt.
  // The first owner confirmation persists its on-session mode and fingerprint before HTTP.
  if (input.initialInvoice && !input.ownerPresent) {
    if (input.sequence === 0) return "wait";
    if (!input.initialOwnerConfirmation) return "review";
  }
  if (input.pending)
    return age < STRIPE_REPLAY_WINDOW_MS && input.fingerprintMatches ? "replay" : "review";
  if (input.sequence >= MAX_COLLECTION_CONFIRMATIONS) return "review";
  if (input.sequence === 0) return "confirm";
  if (input.intentStatus === "requires_payment_method")
    return input.ownerPresent &&
      (input.paymentMethodChanged || input.authenticationRequired === true)
      ? "confirm"
      : "wait";
  return input.sequence === 0 || input.ownerPresent ? "confirm" : "wait";
};

/** Transport outages may resume the same durable request; contract/permission errors never retry. */
export const collectionFailureDisposition = (input: {
  kind: string | null;
  httpStatus?: number;
  diagnostic?: string;
  pending: boolean;
  attempts: number;
}) => {
  if (input.kind === "card_credit_required")
    return { state: "requires_confirmation", code: "card_credit_required" } as const;
  const transient =
    input.kind === "provider_unavailable" &&
    ((input.httpStatus === undefined && input.diagnostic === "transport_unavailable") ||
      input.httpStatus === 429 ||
      (typeof input.httpStatus === "number" && input.httpStatus >= 500 && input.httpStatus <= 599));
  const retry =
    transient &&
    Number.isSafeInteger(input.attempts) &&
    input.attempts > 0 &&
    input.attempts < MAX_COLLECTION_TRANSIENT_ATTEMPTS;
  return {
    state: retry ? ("processing" as const) : ("review_required" as const),
    // Preserve ambiguous confirmation proof even when the bounded retry budget is exhausted.
    code: input.pending
      ? "confirmation_pending"
      : transient
        ? "collection_provider_unavailable"
        : "collection_unresolved",
  };
};
