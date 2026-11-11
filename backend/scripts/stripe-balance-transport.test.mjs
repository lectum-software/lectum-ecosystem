import assert from "node:assert/strict";
import { test } from "node:test";
import Stripe from "stripe";
import { stripeBalanceApi } from "../src/modules/billing/payment-gateway/stripe-balance.ts";
import { stripeFailure } from "../src/modules/billing/payment-gateway/stripe-error.ts";
import { feeDiagnostic } from "../src/modules/billing/stripe/balance-observer/policy.ts";

// Real SDK encoding/transport boundary with disposable fixtures, NOT remote settlement/E2E evidence.
const target = {
  accountId: "acct_transport",
  mode: "test",
  receiptId: "receipt-transport",
  receiptHash: "a".repeat(64),
  chargeId: "ch_transport",
  paymentIntentId: "pi_transport",
  customerId: "cus_transport",
  amountCents: 2990,
};
const timestamp = Math.floor(Date.now() / 1000) - 60;
const charge = {
  object: "charge",
  id: target.chargeId,
  livemode: false,
  payment_intent: target.paymentIntentId,
  customer: target.customerId,
  currency: "brl",
  status: "succeeded",
  paid: true,
  captured: true,
  amount_captured: 2990,
  payment_method_details: { type: "card" },
  balance_transaction: "txn_capture",
};
const transaction = (id, source, type, amount, fee) => ({
  id,
  object: "balance_transaction",
  source,
  type,
  amount,
  fee,
  net: amount - fee,
  currency: "brl",
  created: timestamp,
  available_on: timestamp + 86400,
  status: "pending",
});
const make = (handler) => {
  const calls = [];
  const client = new Stripe("sk_test_transport_fixture", {
    maxNetworkRetries: 0,
    httpClient: Stripe.createFetchHttpClient(async (url, init) => {
      const parsed = new URL(url);
      assert.equal(init.method, "GET", "observer must never mutate a provider");
      calls.push(parsed);
      const response = handler(parsed);
      return new Response(JSON.stringify(response.body ?? response), {
        status: response.httpStatus ?? 200,
        headers: { "content-type": "application/json", "request-id": "req_transport" },
      });
    }),
  });
  const api = stripeBalanceApi(
    client,
    () => target,
    async (action) => {
      try {
        return await action();
      } catch (cause) {
        throw stripeFailure(cause);
      }
    },
  );
  return { api, calls };
};
test("SDK fixture transport encodes GET-only canonical capture without expanding BT.source", async () => {
  const { api, calls } = make((url) =>
    url.pathname === `/v1/charges/${target.chargeId}`
      ? charge
      : transaction("txn_capture", target.chargeId, "charge", 2990, 158),
  );
  const result = await api.observeStripeBalanceStage(target, {
    stage: "capture",
    cursor: null,
    cutoff: new Date(),
  });
  assert.equal(result.facts[0].feeCents, 158n);
  assert.equal(result.facts[0].netCents, 2832n);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].pathname, "/v1/balance_transactions/txn_capture");
  assert.equal(calls[1].search, "");
});
test("SDK fixture transport paginates charge-scoped refunds and reads distinct failure reversal links without Refund.livemode", async () => {
  const { api, calls } = make((url) => {
    if (url.pathname.startsWith("/v1/charges/")) return charge;
    if (url.pathname === "/v1/refunds") {
      assert.equal(url.searchParams.get("charge"), target.chargeId);
      assert.equal(url.searchParams.get("limit"), "3");
      assert.ok(url.searchParams.has("created[lte]"));
      return {
        object: "list",
        has_more: !url.searchParams.has("starting_after"),
        data: url.searchParams.has("starting_after")
          ? []
          : [
              {
                id: "re_transport",
                charge: target.chargeId,
                payment_intent: target.paymentIntentId,
                currency: "brl",
                created: timestamp,
                amount: 2990,
                balance_transaction: "txn_refund",
                failure_balance_transaction: "txn_reverse",
                status: "failed",
              },
            ],
      };
    }
    return url.pathname.endsWith("txn_refund")
      ? transaction("txn_refund", "re_transport", "refund", -2990, 0)
      : transaction("txn_reverse", "re_transport", "refund_failure", 2990, -158);
  });
  const first = await api.observeStripeBalanceStage(target, {
    stage: "refunds",
    cursor: null,
    cutoff: new Date(),
  });
  assert.equal(first.hasMore, true);
  assert.equal(first.nextCursor, "re_transport");
  assert.deepEqual(
    first.facts.map((f) => f.kind),
    ["refund", "refund_reversal"],
  );
  assert.equal(first.facts[1].feeCents, -158n);
  const second = await api.observeStripeBalanceStage(target, {
    stage: "refunds",
    cursor: first.nextCursor,
    cutoff: new Date(),
  });
  assert.equal(second.hasMore, false);
  assert.ok(calls.some((url) => url.searchParams.get("starting_after") === "re_transport"));
});
test("SDK fixture transport accepts fee-only dispute BT, rejects duplicate references and sanitizes403", async () => {
  const { api } = make((url) => {
    if (url.pathname.startsWith("/v1/charges/")) return charge;
    if (url.pathname === "/v1/disputes")
      return {
        object: "list",
        has_more: false,
        data: [
          {
            id: "dp_transport",
            livemode: false,
            charge: target.chargeId,
            payment_intent: target.paymentIntentId,
            currency: "brl",
            created: timestamp,
            amount: 2990,
            balance_transactions: [{ id: "txn_dispute" }],
          },
        ],
      };
    return transaction("txn_dispute", "dp_transport", "adjustment", 0, 1500);
  });
  const page = await api.observeStripeBalanceStage(target, {
    stage: "disputes",
    cursor: null,
    cutoff: new Date(),
  });
  assert.equal(page.facts[0].amountCents, 0n);
  assert.equal(page.facts[0].netCents, -1500n);
  const denied = make((url) =>
    url.pathname.startsWith("/v1/charges/")
      ? charge
      : {
          httpStatus: 403,
          body: { error: { type: "invalid_request_error", message: "PRIVATE_PROVIDER_MARKER" } },
        },
  );
  await assert.rejects(
    denied.api.observeStripeBalanceStage(target, {
      stage: "disputes",
      cursor: null,
      cutoff: new Date(),
    }),
    (cause) => {
      assert.equal(feeDiagnostic(cause), "read_access_denied");
      assert.equal(JSON.stringify(cause).includes("PRIVATE_PROVIDER_MARKER"), false);
      return true;
    },
  );
  const duplicate = make((url) => {
    if (url.pathname.startsWith("/v1/charges/")) return charge;
    if (url.pathname.startsWith("/v1/balance_transactions/"))
      return transaction("txn_same", "re_transport", "refund", -2990, 0);
    return {
      object: "list",
      has_more: false,
      data: [
        {
          id: "re_transport",
          charge: target.chargeId,
          payment_intent: target.paymentIntentId,
          currency: "brl",
          created: timestamp,
          amount: 2990,
          balance_transaction: "txn_same",
          failure_balance_transaction: "txn_same",
        },
      ],
    };
  });
  await assert.rejects(
    duplicate.api.observeStripeBalanceStage(target, {
      stage: "refunds",
      cursor: null,
      cutoff: new Date(),
    }),
  );
  assert.equal(duplicate.calls.length, 3, "duplicate link is rejected before a second BT request");
});
