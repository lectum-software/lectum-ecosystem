import assert from "node:assert/strict";
import { test } from "node:test";
import type { StripeSetup } from "../payment-gateway/stripe-types";
import {
  classifyStripeSetupEvent,
  type SetupEventCandidate,
  unresolvedStripeSetupEvent,
} from "./setup-event-policy";

const identity = { accountId: "acct_policy", mode: "test" as const };
const setup: StripeSetup = {
  ...identity,
  setupIntentId: "seti_policy",
  customerId: "cus_policy",
  attemptId: null,
  subscriptionId: null,
  localSubscriptionId: null,
  status: "succeeded",
  paymentMethodId: "pm_policy",
};
const candidate: SetupEventCandidate = {
  operation: {
    id: "operation-policy",
    user_id: "user-policy",
    customer_id: "customer-policy",
    subscription_id: "subscription-policy",
    gateway: "stripe",
    mode: "test",
    account_id: identity.accountId,
    kind: "checkout",
    intent: "courtesy_renewal",
    state: "requires_confirmation",
    intent_kind: "setup",
    provider_intent_id: setup.setupIntentId,
    provider_subscription_id: "sub_policy",
  },
  customer: {
    id: "customer-policy",
    user_id: "user-policy",
    gateway: "stripe",
    mode: "test",
    account_id: identity.accountId,
    external_customer_id: setup.customerId,
  },
};
const input = {
  setup,
  identity,
  resourceId: setup.setupIntentId,
  subscriptionHint: null,
  candidates: [candidate],
};

test("native setup without metadata requires exact pinned operation and customer ownership", () => {
  assert.equal(classifyStripeSetupEvent(input).action, "process");
  assert.equal(classifyStripeSetupEvent({ ...input, candidates: [] }).action, "unresolved");
  assert.equal(
    classifyStripeSetupEvent({ ...input, candidates: [], subscriptionHint: "sub_policy" }).action,
    "unresolved",
    "a subscription hint alone must not sync entitlement or ACK an autonomous setup",
  );
  for (const customer of [null, { ...candidate.customer!, external_customer_id: null }]) {
    assert.equal(
      classifyStripeSetupEvent({ ...input, candidates: [{ ...candidate, customer }] }).action,
      "unresolved",
    );
  }
});

test("metadata recovery tolerates missing pin, but only for the exact setup operation and customer", () => {
  const operation = {
    ...candidate.operation,
    kind: "payment_method",
    intent: null,
    intent_kind: null,
    provider_intent_id: null,
  };
  const recovery = {
    ...input,
    setup: { ...setup, attemptId: operation.id },
    candidates: [{ ...candidate, operation }],
  };
  assert.equal(classifyStripeSetupEvent(recovery).action, "process");
  assert.equal(classifyStripeSetupEvent({ ...recovery, setup }).action, "unresolved");
  assert.equal(
    classifyStripeSetupEvent({
      ...recovery,
      candidates: [{ ...candidate, operation: { ...operation, provider_subscription_id: null } }],
    }).action,
    "unresolved",
  );
});

test("conflicting pin, metadata, mode, owner, subscription or non-setup operation never execute", () => {
  const mismatches: SetupEventCandidate[] = [
    { ...candidate, operation: { ...candidate.operation, provider_intent_id: "seti_other" } },
    { ...candidate, operation: { ...candidate.operation, intent: "subscription" } },
    { ...candidate, operation: { ...candidate.operation, intent_kind: "payment" } },
    { ...candidate, operation: { ...candidate.operation, mode: "live" } },
    { ...candidate, customer: { ...candidate.customer!, user_id: "another-owner" } },
    { ...candidate, customer: { ...candidate.customer!, account_id: "acct_other" } },
    { ...candidate, customer: { ...candidate.customer!, external_customer_id: "cus_other" } },
  ];
  for (const mismatch of mismatches)
    assert.equal(classifyStripeSetupEvent({ ...input, candidates: [mismatch] }).action, "conflict");
  for (const change of [
    { attemptId: "operation-other" },
    { subscriptionId: "sub_other" },
    { localSubscriptionId: "local-other" },
    { mode: "live" as const },
    { accountId: "acct_other" },
    { setupIntentId: "seti_other" },
  ])
    assert.equal(
      classifyStripeSetupEvent({ ...input, setup: { ...setup, ...change } }).action,
      "conflict",
    );
  assert.equal(
    classifyStripeSetupEvent({ ...input, candidates: [candidate, candidate] }).action,
    "conflict",
  );
  assert.equal(
    classifyStripeSetupEvent({ ...input, subscriptionHint: "sub_other" }).action,
    "conflict",
  );
});

test("terminal exact binding ACKs without assignment; terminal metadata alone remains unresolved", () => {
  for (const state of ["complete", "failed"]) {
    const operation = { ...candidate.operation, state };
    assert.equal(
      classifyStripeSetupEvent({ ...input, candidates: [{ ...candidate, operation }] }).action,
      "terminal",
    );
    assert.equal(
      classifyStripeSetupEvent({
        ...input,
        setup: { ...setup, attemptId: operation.id },
        candidates: [{ ...candidate, operation: { ...operation, provider_intent_id: null } }],
      }).action,
      "unresolved",
    );
  }
});

test("unresolved setup retries remain bounded and explicit conflicts require review, never ignored", () => {
  assert.deepEqual(unresolvedStripeSetupEvent(1), {
    state: "pending",
    last_error_code: "setup_operation_unresolved",
  });
  assert.equal(unresolvedStripeSetupEvent(9).state, "pending");
  assert.deepEqual(unresolvedStripeSetupEvent(10), {
    state: "review_required",
    last_error_code: "setup_operation_unresolved",
  });
  assert.deepEqual(unresolvedStripeSetupEvent(1, true), {
    state: "review_required",
    last_error_code: "setup_operation_conflict",
  });
});
