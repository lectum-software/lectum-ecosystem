import assert from "node:assert/strict";
import { test } from "node:test";
import {
  collectionConfirmationDecision,
  collectionConfirmationFingerprint,
  collectionRequestKey,
  MAX_COLLECTION_CONFIRMATIONS,
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
