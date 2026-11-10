import assert from "node:assert/strict";
import { test } from "node:test";
import type { billing_gateway_event } from "@/external/generated/prisma/client";
import { STRIPE_API_VERSION } from "@/modules/billing/payment-gateway/stripe-config";
import {
  assertStripeEventRequeueEligible,
  parseStripeEventRequeueArguments,
  StripeEventRequeueError,
  validateStripeEventRequeueArguments,
} from "./stripe-event-requeue-policy";

const argv = [
  "--event-id",
  "local-event-unit",
  "--account",
  "acct_unit",
  "--mode",
  "test",
  "--expected-attempts",
  "10",
  "--actor-admin-id",
  "admin-unit",
  "--reason",
  "provider_recovered",
];
const args = () => parseStripeEventRequeueArguments(argv)!;
const event = (patch = {}) =>
  ({
    id: "local-event-unit",
    gateway: "stripe",
    mode: "test",
    account_id: "acct_unit",
    api_version: STRIPE_API_VERSION,
    state: "review_required",
    attempts: 10,
    processed_at: null,
    lease_token: null,
    lease_until: null,
    last_error_code: "reconciliation_unavailable",
    ...patch,
  }) as billing_gateway_event;
const identity = { mode: "test" as const, accountId: "acct_unit" };

test("event requeue is unitary dry-run by default, with explicit matching confirmation for apply", () => {
  assert.equal(args().apply, false);
  assert.equal(args().confirm, undefined);
  assert.equal(parseStripeEventRequeueArguments(["--help"]), null);
  assert.equal(parseStripeEventRequeueArguments(["-h"]), null);
  assert.equal(
    parseStripeEventRequeueArguments([...argv, "--apply", "--confirm", "test"])?.apply,
    true,
  );
  assert.throws(() => parseStripeEventRequeueArguments([...argv, "--apply"]));
  assert.throws(() => parseStripeEventRequeueArguments([...argv, "--apply", "--confirm", "live"]));
});

test("event requeue rejects unknown, missing, duplicate, bulk and uncontrolled arguments", () => {
  for (const bad of [
    [],
    [...argv, "--all"],
    [...argv, "--event-id", "another-event"],
    [...argv, "--apply", "--apply"],
    [...argv, "--confirm", "test", "--confirm", "test"],
    [...argv, "--confirm"],
    [...argv, "--secret", "never-accepted"],
    [...argv, "--help"],
    argv.slice(0, -2),
    argv.map((v) => (v === "provider_recovered" ? "uncontrolled free text" : v)),
    argv.map((v) => (v === "local-event-unit" ? "event-one,event-two" : v)),
    argv.map((v) => (v === "acct_unit" ? "bad-account" : v)),
    argv.map((v) => (v === "test" ? "production" : v)),
    ...["0", "-1", "01", "1.5", "NaN", "2147483647", "9999999999"].map((n) =>
      argv.map((v) => (v === "10" ? n : v)),
    ),
  ])
    assert.throws(() => parseStripeEventRequeueArguments(bad), StripeEventRequeueError);
  assert.throws(() =>
    validateStripeEventRequeueArguments({ ...args(), expectedAttempts: Number.NaN }),
  );
});

test("only an exact scoped review event without any lease or processed marker can be requeued", () => {
  assert.doesNotThrow(() => assertStripeEventRequeueEligible(event(), args(), identity));
  for (const patch of [
    { id: "other-event" },
    { gateway: "mercadopago" },
    { mode: "live" },
    { account_id: "acct_other" },
    { api_version: null },
    { api_version: "2020-01-01" },
    { state: "complete" },
    { state: "pending" },
    { state: "processing" },
    { attempts: 11 },
    { processed_at: new Date() },
    { lease_token: "held" },
    { lease_until: new Date(0) },
    { lease_until: new Date(Date.now() + 60_000) },
    { last_error_code: "arbitrary provider text" },
  ])
    assert.throws(
      () => assertStripeEventRequeueEligible(event(patch), args(), identity),
      StripeEventRequeueError,
    );
  assert.throws(() =>
    assertStripeEventRequeueEligible(event(), args(), { ...identity, accountId: "acct_other" }),
  );
});

test("early setup conflicts remain eligible without resetting attempts or losing their diagnostic", () => {
  const early = { ...args(), expectedAttempts: 1, reason: "binding_reconciled" as const };
  validateStripeEventRequeueArguments(early);
  for (const diagnostic of ["setup_operation_conflict", "setup_operation_unresolved", null])
    assert.doesNotThrow(() =>
      assertStripeEventRequeueEligible(
        event({ attempts: 1, last_error_code: diagnostic }),
        early,
        identity,
      ),
    );
});
