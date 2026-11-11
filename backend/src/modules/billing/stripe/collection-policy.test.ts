import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectionConfirmationDecision,
  collectionConfirmationFingerprint,
  collectionFailureDisposition,
  collectionRequestKey,
  MAX_COLLECTION_CONFIRMATIONS,
  MAX_COLLECTION_TRANSIENT_ATTEMPTS,
} from "./collection-policy";

const now = new Date("2026-11-10T12:00:00Z");
const base = {
  intentStatus: "requires_confirmation",
  sequence: 0,
  pending: false,
  fingerprintMatches: false,
  operationCreatedAt: new Date(now.getTime() - 60_000),
  allowConfirmation: true,
  ownerPresent: false,
  paymentMethodChanged: false,
  now,
};

test("collection background authorizes only the initial manual attempt, not decline or post-SCA replay", () => {
  assert.equal(collectionConfirmationDecision(base), "confirm");
  assert.equal(
    collectionConfirmationDecision({ ...base, intentStatus: "requires_payment_method" }),
    "confirm",
    "a new PM-less manual intent has not attempted a payment",
  );
  assert.equal(collectionConfirmationDecision({ ...base, allowConfirmation: false }), "wait");
  assert.equal(collectionConfirmationDecision({ ...base, sequence: 1 }), "wait");
  assert.equal(
    collectionConfirmationDecision({ ...base, sequence: 1, ownerPresent: true }),
    "confirm",
  );
  for (const status of ["succeeded", "processing", "requires_action", "canceled"])
    assert.equal(collectionConfirmationDecision({ ...base, intentStatus: status }), "wait");
});

test("initial invoice never starts from an assigned card alone after enrollment crashes", () => {
  const initial = { ...base, initialInvoice: true };
  assert.equal(collectionConfirmationDecision(initial), "wait");
  assert.equal(
    collectionConfirmationDecision({ ...initial, intentStatus: "requires_payment_method" }),
    "wait",
  );
  assert.equal(collectionConfirmationDecision({ ...initial, ownerPresent: true }), "confirm");
  assert.equal(
    collectionConfirmationDecision({ ...initial, ownerPresent: true, allowConfirmation: false }),
    "wait",
  );
  const lostOwnerResponse = {
    ...initial,
    sequence: 1,
    pending: true,
    fingerprintMatches: true,
  };
  assert.equal(collectionConfirmationDecision(lostOwnerResponse), "review");
  assert.equal(
    collectionConfirmationDecision({ ...lostOwnerResponse, initialOwnerConfirmation: true }),
    "replay",
    "only the exact durably checkpointed owner confirmation may be retried",
  );
});

test("transient failures resume bounded requests without clearing ambiguous confirmation proof", () => {
  for (const httpStatus of [undefined, 429, 500, 502, 503, 504]) {
    assert.deepEqual(
      collectionFailureDisposition({
        kind: "provider_unavailable",
        httpStatus,
        diagnostic: "transport_unavailable",
        attempts: 1,
        pending: false,
      }),
      { state: "processing", code: "collection_provider_unavailable" },
    );
    assert.deepEqual(
      collectionFailureDisposition({
        kind: "provider_unavailable",
        httpStatus,
        diagnostic: "transport_unavailable",
        attempts: 2,
        pending: true,
      }),
      { state: "processing", code: "confirmation_pending" },
    );
  }
  for (const httpStatus of [400, 401, 402, 403, 404, 409])
    assert.equal(
      collectionFailureDisposition({
        kind: "provider_unavailable",
        httpStatus,
        attempts: 1,
        pending: false,
      }).state,
      "review_required",
    );
  for (const kind of [null, "resource_mismatch", "contract_invalid", "configuration_invalid"])
    assert.equal(
      collectionFailureDisposition({ kind, attempts: 1, pending: false }).state,
      "review_required",
    );
  assert.equal(
    collectionFailureDisposition({
      kind: "provider_unavailable",
      diagnostic: "unknown_failure",
      attempts: 1,
      pending: false,
    }).state,
    "review_required",
    "an unclassified exception is not evidence of a transient network failure",
  );
  assert.deepEqual(
    collectionFailureDisposition({
      kind: "provider_unavailable",
      httpStatus: 503,
      attempts: MAX_COLLECTION_TRANSIENT_ATTEMPTS,
      pending: true,
    }),
    { state: "review_required", code: "confirmation_pending" },
  );
});

test("declined card requires explicit owner and different canonical default", () => {
  const declined = { ...base, sequence: 1, intentStatus: "requires_payment_method" };
  assert.equal(collectionConfirmationDecision(declined), "wait");
  assert.equal(collectionConfirmationDecision({ ...declined, ownerPresent: true }), "wait");
  assert.equal(collectionConfirmationDecision({ ...declined, paymentMethodChanged: true }), "wait");
  assert.equal(
    collectionConfirmationDecision({ ...declined, ownerPresent: true, paymentMethodChanged: true }),
    "confirm",
  );
  assert.equal(
    collectionConfirmationDecision({ ...declined, authenticationRequired: true }),
    "wait",
  );
  assert.equal(
    collectionConfirmationDecision({
      ...declined,
      ownerPresent: true,
      authenticationRequired: true,
    }),
    "confirm",
  );
});

test("ambiguous confirmation reuses only the durable matching request inside safe retention", () => {
  const pending = { ...base, sequence: 1, pending: true };
  assert.equal(collectionConfirmationDecision(pending), "review");
  assert.equal(collectionConfirmationDecision({ ...pending, fingerprintMatches: true }), "replay");
  assert.equal(
    collectionConfirmationDecision({
      ...pending,
      fingerprintMatches: true,
      operationCreatedAt: new Date(now.getTime() - 24 * 60 * 60_000),
    }),
    "review",
  );
  assert.equal(
    collectionConfirmationDecision({
      ...base,
      ownerPresent: true,
      sequence: MAX_COLLECTION_CONFIRMATIONS,
    }),
    "review",
  );
});

test("new owner-authorized action on an existing exact intent is not tied to expired create idempotency", () => {
  assert.equal(
    collectionConfirmationDecision({
      ...base,
      sequence: 1,
      ownerPresent: true,
      operationCreatedAt: new Date(now.getTime() - 7 * 86_400_000),
    }),
    "confirm",
  );
});

test("confirmation fingerprint binds exact invoice, intent, card and sequence independently of key order", () => {
  const input = {
    operationId: "op1",
    intentId: "pi_one",
    invoiceId: "in_one",
    paymentMethodId: "pm_one",
    sequence: 1,
  };
  const hash = collectionConfirmationFingerprint(input);
  assert.equal(
    hash,
    collectionConfirmationFingerprint({
      sequence: 1,
      paymentMethodId: "pm_one",
      invoiceId: "in_one",
      intentId: "pi_one",
      operationId: "op1",
    }),
  );
  for (const change of [
    { intentId: "pi_two" },
    { invoiceId: "in_two" },
    { paymentMethodId: "pm_two" },
    { sequence: 2 },
    { offSession: true },
  ])
    assert.notEqual(hash, collectionConfirmationFingerprint({ ...input, ...change }));
  assert.equal(collectionRequestKey("in_one"), collectionRequestKey("in_one"));
  assert.notEqual(collectionRequestKey("in_one"), collectionRequestKey("in_two"));
});
