import { createHash } from "node:crypto";
import { STRIPE_REPLAY_WINDOW_MS } from "./recovery-policy";

export const CREDIT_COLLECTION_POLICY = "manual_credit_v1";
export const MAX_COLLECTION_CONFIRMATIONS = 4;

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
