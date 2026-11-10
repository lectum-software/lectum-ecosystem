import { createHash } from "node:crypto";

export const STRIPE_REPLAY_WINDOW_MS = 23 * 60 * 60_000;
export const STRIPE_MAX_CREATE_ATTEMPTS = 5;
export const TERMINAL_OPERATION_STATES = ["complete", "failed"];

export const requestFingerprint = (kind: string, values: readonly (string | number | null)[]) =>
  createHash("sha256")
    .update(JSON.stringify(["lectum.stripe.request.v1", kind, ...values]))
    .digest("hex");

export const mayReplayStripeCreate = (
  input: {
    state: string;
    createdAt: Date;
    attempts: number;
    storedFingerprint: string | null;
    expectedFingerprint: string;
  },
  now = new Date(),
) => {
  const age = now.getTime() - input.createdAt.getTime();
  if (
    !Number.isFinite(age) ||
    age < 0 ||
    age >= STRIPE_REPLAY_WINDOW_MS ||
    !Number.isInteger(input.attempts) ||
    input.attempts < 0 ||
    input.attempts > STRIPE_MAX_CREATE_ATTEMPTS ||
    !["reserved", "creating", "processing", "review_required", "requires_confirmation"].includes(
      input.state,
    )
  )
    return false;
  // Old ambiguous rows have no immutable request proof. They permit GET reconciliation only.
  if (input.storedFingerprint === null) return input.state === "reserved";
  return input.storedFingerprint === input.expectedFingerprint;
};
