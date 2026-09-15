import assert from "node:assert/strict";
import { test } from "node:test";
import type { GatewaySubscriptionPlan } from "@/modules/billing/payment-gateway/PaymentGateway";
import { isCompatibleGatewayPlan, isValidLocalPaidPlan } from "./plan-compatibility";

const localPlan = { price_cents: 2990, interval: "month" };
const remotePlan: GatewaySubscriptionPlan = {
  gateway_plan_id: "local-test-plan",
  gateway_status: "active",
  amount_cents: 2990,
  raw: {
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      currency_id: "BRL",
      transaction_amount: 29.9,
    },
  },
};

test("a matching amount alone cannot authorize a different currency, cadence or inactive plan", () => {
  assert.equal(isCompatibleGatewayPlan(remotePlan, localPlan), true);
  for (const recurring of [
    { frequency: 1, frequency_type: "months", currency_id: "USD" },
    { frequency: 1, frequency_type: "days", currency_id: "BRL" },
    { frequency: 12, frequency_type: "months", currency_id: "BRL" },
    undefined,
  ]) {
    assert.equal(
      isCompatibleGatewayPlan({ ...remotePlan, raw: { auto_recurring: recurring } }, localPlan),
      false,
    );
  }
  assert.equal(
    isCompatibleGatewayPlan({ ...remotePlan, gateway_status: "inactive" }, localPlan),
    false,
  );
});

test("local paid plan must have positive integral cents and monthly cadence", () => {
  assert.equal(isValidLocalPaidPlan(localPlan), true);
  for (const price_cents of [-1, 0, NaN, Infinity, 29.9, null]) {
    assert.equal(isValidLocalPaidPlan({ ...localPlan, price_cents }), false);
  }
  assert.equal(isValidLocalPaidPlan({ ...localPlan, interval: "year" }), false);
});
