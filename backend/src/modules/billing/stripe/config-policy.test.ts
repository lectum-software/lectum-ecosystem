import assert from "node:assert/strict";
import { test } from "node:test";
import type { StripePlan } from "../payment-gateway/stripe-types";
import {
  hasScopedStripeCardMaintenance,
  isStripeCheckoutPriceAvailable,
  stripeConfigPendingOperation,
} from "./config-policy";

const identity = { accountId: "acct_config", mode: "test" as const };
const contract = {
  id: "local-sub",
  psychologist_id: "profile",
  source: "stripe",
  gateway: "stripe",
  gateway_mode: "test",
  gateway_account_id: identity.accountId,
  gateway_subscription_id: "sub_config",
  status: "inadimplente",
  deleted: false,
};
const customer = {
  id: "local-customer",
  user_id: "user",
  gateway: "stripe",
  mode: "test",
  account_id: identity.accountId,
  external_customer_id: "cus_config",
};
const pending = {
  id: "operation",
  user_id: "user",
  psychologist_id: "profile",
  gateway: "stripe",
  mode: "test",
  account_id: identity.accountId,
  kind: "payment_method",
  state: "requires_confirmation",
  customer_id: customer.id,
  subscription_id: contract.id,
  provider_subscription_id: contract.gateway_subscription_id,
};
const input = {
  userId: "user",
  profileId: "profile",
  currentContractId: contract.id,
  identity,
  contracts: [contract],
  customer,
  pending,
};
const price = {
  amount_cents: 2990,
  currency: "BRL",
  interval: "month",
  interval_count: 1,
  external_price_id: "price_config",
};
const remote: StripePlan = {
  ...identity,
  priceId: price.external_price_id,
  productId: "prod_config",
  amountCents: 2990,
  currency: "BRL",
  interval: "month",
  intervalCount: 1,
  active: true,
};

test("maintenance and pending setup survive an archived checkout price, which remains ineligible for sales", () => {
  assert.equal(hasScopedStripeCardMaintenance(input), true);
  assert.equal(hasScopedStripeCardMaintenance({ ...input, pending: null }), true);
  assert.equal(isStripeCheckoutPriceAvailable(price, identity, remote), true);
  assert.equal(
    isStripeCheckoutPriceAvailable(price, identity, { ...remote, active: false }),
    false,
  );
  assert.deepEqual(stripeConfigPendingOperation(pending), {
    id: pending.id,
    kind: "payment_method",
    state: "requires_confirmation",
    confirmation_kind: null,
    payment_pending: false,
  });
  for (const state of ["reserved", "creating", "processing", "review_required"]) {
    assert.ok(
      stripeConfigPendingOperation({ ...pending, state }),
      "catalog availability never removes a pending operation",
    );
  }
  assert.equal(stripeConfigPendingOperation({ ...pending, state: "complete" }), null);
});

test("pending summaries distinguish standalone setup and server-controlled collection without returning secrets", () => {
  assert.deepEqual(
    stripeConfigPendingOperation({
      ...pending,
      kind: "checkout",
      provider_setup_intent_id: "seti_saved",
    }),
    {
      id: pending.id,
      kind: "checkout",
      state: "requires_confirmation",
      confirmation_kind: "setup",
      payment_pending: false,
    },
  );
  for (const provider_intent_id of [null, "pi_manual"]) {
    const summary = stripeConfigPendingOperation({
      ...pending,
      kind: "collection",
      intent_kind: "payment",
      provider_intent_id,
    });
    assert.deepEqual(summary, {
      id: pending.id,
      kind: "checkout",
      state: "requires_confirmation",
      confirmation_kind: "action",
      payment_pending: true,
    });
    assert.equal(Object.hasOwn(summary ?? {}, "confirmation"), false);
    assert.equal(Object.hasOwn(summary ?? {}, "client_secret"), false);
  }
  assert.equal(stripeConfigPendingOperation({ ...pending, state: "failed" }), null);
});

test("card maintenance never switches user, current contract, customer, gateway account or mode", () => {
  for (const override of [
    { userId: "another-user" },
    { profileId: "another-profile" },
    { currentContractId: "another-contract" },
    { identity: { ...identity, mode: "live" as const } },
    { identity: { ...identity, accountId: "acct_other" } },
    { customer: null },
    { customer: { ...customer, external_customer_id: null } },
    { customer: { ...customer, user_id: "another-user" } },
    { customer: { ...customer, mode: "live" } },
    { contracts: [contract, contract] },
    { contracts: [{ ...contract, deleted: true }] },
    { contracts: [{ ...contract, source: "admin_grant" }] },
    { contracts: [{ ...contract, status: "cancelada" }] },
    { pending: { ...pending, customer_id: "another-customer" } },
    { pending: { ...pending, subscription_id: "another-contract" } },
    { pending: { ...pending, provider_subscription_id: "sub_other" } },
    { pending: { ...pending, user_id: "another-user" } },
  ])
    assert.equal(hasScopedStripeCardMaintenance({ ...input, ...override }), false);
});

test("fresh checkout requires the active exact immutable price and authorized monthly amount", () => {
  for (const override of [
    { active: false },
    { amountCents: 3990 },
    { mode: "live" as const },
    { accountId: "acct_other" },
    { priceId: "price_other" },
  ])
    assert.equal(
      isStripeCheckoutPriceAvailable(price, identity, { ...remote, ...override }),
      false,
    );
  assert.equal(
    isStripeCheckoutPriceAvailable({ ...price, amount_cents: 3990 }, identity, {
      ...remote,
      amountCents: 3990,
    }),
    true,
  );
  assert.equal(
    isStripeCheckoutPriceAvailable({ ...price, interval_count: 2 }, identity, remote),
    false,
  );
});

test("financial processing/review remain resumable without publishing secrets or provider messages", () => {
  for (const state of ["processing", "review_required", "requires_confirmation"]) {
    const summary = stripeConfigPendingOperation({
      ...pending,
      kind: "collection",
      state,
      intent_kind: "payment",
      last_error_code: "payment_method_required",
    });
    assert.equal(summary?.payment_pending, true);
    assert.equal(summary?.error_code, "billing_payment_method_update_required");
    assert.equal(summary?.confirmation_kind, state === "requires_confirmation" ? "action" : null);
    assert.equal(Object.hasOwn(summary ?? {}, "client_secret"), false);
  }
  const summary = stripeConfigPendingOperation({
    ...pending,
    last_error_code: "provider_private_data",
  });
  assert.equal(Object.hasOwn(summary ?? {}, "error_code"), false);
});
