import assert from "node:assert/strict";
import { test } from "node:test";
import { hasSubscriptionBenefits } from "./subscription-period.ts";

const now = Date.parse("2026-11-02T12:00:00Z");
test("cancelamento mantem beneficios ate o instante final, sem renovar", () => {
  const subscription = {
    status: "cancelada",
    source: "mercadopago",
    current_period_end: "2026-11-03T12:00:00Z",
  };
  assert.equal(hasSubscriptionBenefits(subscription, now), true);
  assert.equal(
    hasSubscriptionBenefits(subscription, Date.parse(subscription.current_period_end)),
    false,
  );
  assert.equal(hasSubscriptionBenefits({ ...subscription, current_period_end: null }, now), false);
  assert.equal(hasSubscriptionBenefits({ ...subscription, source: "admin_grant" }, now), false);
});
test("mantem cortesia e tolerancia sem conceder beneficios a plano pendente", () => {
  assert.equal(hasSubscriptionBenefits({ status: "ativa" }, now), true);
  assert.equal(hasSubscriptionBenefits({ status: "inativa" }, now), false);
  assert.equal(
    hasSubscriptionBenefits({ status: "inadimplente", billing_grace_ends_at: "2026-11-03" }, now),
    true,
  );
  assert.equal(
    hasSubscriptionBenefits(
      {
        status: "inadimplente",
        billing_grace_ends_at: "2026-11-03",
        billing_downgraded_at: "2026-11-01",
      },
      now,
    ),
    false,
  );
});
