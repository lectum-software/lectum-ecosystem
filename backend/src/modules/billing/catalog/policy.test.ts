import assert from "node:assert/strict";
import { test } from "node:test";
import type { billing_catalog_operation } from "@/external/generated/prisma/client";
import { isSupportedStripeCheckoutPrice } from "../stripe/checkout-price-policy";
import {
  canReplayCatalogCreate,
  catalogFingerprint,
  safeCatalogOperation,
  validCatalogAmount,
} from "./policy";

const now = new Date("2026-11-11T15:00:00Z");

test("catalog bounds are integer defensive Lectum cents, never free courtesy or coerced value", () => {
  for (const value of [50, 2990, 3990, 99999999]) assert.equal(validCatalogAmount(value), true);
  for (const value of [0, -1, 49, 100000000, 50.1, NaN, Infinity, "2990", null])
    assert.equal(validCatalogAmount(value), false);
  assert.equal(
    isSupportedStripeCheckoutPrice({
      amount_cents: 3990,
      currency: "BRL",
      interval: "month",
      interval_count: 1,
    }),
    true,
  );
  assert.equal(
    isSupportedStripeCheckoutPrice({
      amount_cents: 49,
      currency: "BRL",
      interval: "month",
      interval_count: 1,
    }),
    false,
  );
});
test("catalog fingerprint binds actor, account, mode, product, local plan and amount without PII", () => {
  const input = {
    actorId: "admin-local",
    accountId: "acct_local",
    mode: "test",
    productId: "prod_local",
    planId: "plan-local",
    amountCents: 2990,
  };
  const hash = catalogFingerprint(input);
  assert.match(hash, /^[a-f0-9]{64}$/);
  for (const change of [
    { actorId: "other" },
    { accountId: "acct_other" },
    { mode: "live" },
    { productId: "prod_other" },
    { planId: "other" },
    { amountCents: 3990 },
  ])
    assert.notEqual(catalogFingerprint({ ...input, ...change }), hash);
});
test("expired or clock-skewed operation never permits blind POST replay beyond defensive23h", () => {
  for (const hours of [0, 1, 22.99])
    assert.equal(
      canReplayCatalogCreate({ first_attempt_at: new Date(now.getTime() - hours * 3600000) }, now),
      true,
    );
  for (const date of [
    null,
    new Date(now.getTime() + 1),
    new Date(now.getTime() - 23 * 3600000),
    new Date(now.getTime() - 25 * 3600000),
  ])
    assert.equal(canReplayCatalogCreate({ first_attempt_at: date }, now), false);
});
test("operation view uses closed diagnostic/status, owner-bound resume and read-only expired lookup recovery", () => {
  const row = {
    id: "operation-local",
    actor_admin_id: "admin-local",
    amount_cents: 2990,
    status: "manual_review",
    created_at: now,
    updated_at: now,
    version_id: null,
    lease_until: null,
    last_error_code: "catalog_recovery_required",
  } as billing_catalog_operation;
  assert.equal(safeCatalogOperation(row, "admin-local").can_resume, true);
  assert.equal(safeCatalogOperation(row, "other").can_resume, false);
  const unsafe = safeCatalogOperation(
    { ...row, status: "private-provider-error", last_error_code: "secret-payload" },
    "admin-local",
  );
  assert.equal(unsafe.status, "manual_review");
  assert.equal(unsafe.last_error_code, null);
  assert.equal(JSON.stringify(unsafe).includes("secret-payload"), false);
});
