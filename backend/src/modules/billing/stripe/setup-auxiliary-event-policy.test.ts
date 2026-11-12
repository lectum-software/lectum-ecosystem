import assert from "node:assert/strict";
import { test } from "node:test";
import { stripeCreditCardRequestHash } from "../payment-gateway/stripe-idempotency";
import {
  auxiliaryCandidate as candidate,
  auxiliaryEvent as event,
  auxiliaryIdentity as identity,
  auxiliaryProof as proof,
  auxiliaryScope as scope,
  auxiliarySetup as setup,
} from "./setup-auxiliary-event.test-support";
import {
  AUXILIARY_SETUP_CANDIDATE_LIMIT,
  type AuxiliarySetupCandidate,
  classifyAuxiliaryStripeSetup,
  matchesAuxiliarySetupProof,
} from "./setup-auxiliary-event-policy";

const classify = (candidates = [candidate]) =>
  classifyAuxiliaryStripeSetup(event, setup, identity, candidates);

test("auxiliary setup requires exact signed request hash, not merely metadata absence", () => {
  assert.equal(classify().action, "verify");
  for (const hash of [
    null,
    "",
    "a".repeat(64),
    `${"a".repeat(64)}\n`,
    stripeCreditCardRequestHash(identity, "sub_other", scope.paymentMethodId),
    stripeCreditCardRequestHash(
      { ...identity, mode: "live" },
      scope.subscriptionId,
      scope.paymentMethodId,
    ),
  ])
    assert.notEqual(
      classifyAuxiliaryStripeSetup(
        { ...event, request_idempotency_key_hash: hash },
        setup,
        identity,
        [candidate],
      ).action,
      "verify",
    );
  for (const change of [
    { type: "setup_intent.setup_failed" },
    { resource_id: "seti_other" },
    { provider_subscription_id: "sub_other" },
  ])
    assert.notEqual(
      classifyAuxiliaryStripeSetup({ ...event, ...change }, setup, identity, [candidate]).action,
      "verify",
    );
});

test("historical cancellation and a later card replacement do not rewrite original checkout pins", () => {
  const historical = {
    ...candidate,
    subscription: {
      ...candidate.subscription!,
      collection_policy: "manual_credit_cancel_requested_v1",
    },
  };
  const result = classify([historical]);
  assert.equal(result.action, "verify");
  assert.equal(matchesAuxiliarySetupProof(proof, scope, identity), true);
  for (const change of [
    { paymentMethodId: "pm_other" },
    { subscriptionId: "sub_other" },
    { attemptId: "other" },
    { accountId: "acct_other" },
    { mode: "live" as const },
    { metadataAbsent: false as true },
  ])
    assert.equal(matchesAuxiliarySetupProof({ ...proof, ...change }, scope, identity), false);
});

test("owner, account, primary setup, manual policy and exact completed operation are mandatory", () => {
  const mismatches: AuxiliarySetupCandidate[] = [
    { ...candidate, operation: { ...candidate.operation, state: "processing" } },
    { ...candidate, operation: { ...candidate.operation, kind: "payment_method" } },
    {
      ...candidate,
      operation: { ...candidate.operation, provider_setup_intent_id: setup.setupIntentId },
    },
    { ...candidate, operation: { ...candidate.operation, provider_setup_intent_id: null } },
    { ...candidate, operation: { ...candidate.operation, provider_payment_method_id: "pm_other" } },
    { ...candidate, operation: { ...candidate.operation, account_id: "acct_other" } },
    { ...candidate, operation: { ...candidate.operation, user_id: "user-other" } },
    { ...candidate, customer: { ...candidate.customer, external_customer_id: "cus_other" } },
    { ...candidate, customer: { ...candidate.customer, mode: "live" } },
    { ...candidate, subscription: null },
    { ...candidate, subscription: { ...candidate.subscription!, collection_policy: null } },
    {
      ...candidate,
      subscription: { ...candidate.subscription!, gateway_subscription_id: "sub_other" },
    },
    { ...candidate, profile: { ...candidate.profile!, user_id: "user-other" } },
  ];
  for (const mismatch of mismatches) assert.notEqual(classify([mismatch]).action, "verify");
  for (const change of [
    { attemptId: "operation-invalid" },
    { localSubscriptionId: "local-other" },
    { subscriptionId: "sub_other" },
    { status: "processing" },
    { paymentMethodId: null },
    { accountId: "acct_other" },
    { mode: "live" as const },
  ])
    assert.notEqual(
      classifyAuxiliaryStripeSetup(event, { ...setup, ...change }, identity, [candidate]).action,
      "verify",
    );
});

test("ambiguity and bounded lookup overflow require review; missing candidates remain unresolved", () => {
  assert.equal(classify([]).action, "unresolved");
  assert.equal(classify([candidate, candidate]).action, "conflict");
  assert.equal(
    classify(Array.from({ length: AUXILIARY_SETUP_CANDIDATE_LIMIT + 1 }, () => candidate)).action,
    "conflict",
  );
});
