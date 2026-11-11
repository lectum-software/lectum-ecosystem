import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { billingPlanAdmission } from "./billing-plan-offer.ts";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("plan storefront uses the immutable admission price, not the legacy reference", () => {
  const plan = {
    id: "plan-local",
    slug: "profissional",
    active: true,
    price_cents: 2990,
    admission_offer: {
      status: "available",
      source: "versioned_offer",
      amount_cents: 3990,
      currency: "BRL",
      interval: "month",
      revision: "opaque-revision:2",
    },
  };
  assert.deepEqual(billingPlanAdmission(plan), {
    amountCents: 3990,
    canContinue: true,
    status: "available",
  });
  for (const status of ["paused", "unavailable"]) {
    const unavailable = billingPlanAdmission({
      ...plan,
      admission_offer: { ...plan.admission_offer, status },
    });
    assert.equal(unavailable.amountCents, null);
    assert.equal(unavailable.canContinue, false);
  }
  for (const change of [
    { amount_cents: 0 },
    { amount_cents: 49 },
    { amount_cents: 100_000_000 },
    { amount_cents: NaN },
    { amount_cents: 39.9 },
    { currency: "USD" },
    { interval: "year" },
    { revision: null },
    { source: "unknown" },
  ]) {
    assert.deepEqual(
      billingPlanAdmission({ ...plan, admission_offer: { ...plan.admission_offer, ...change } }),
      {
        amountCents: null,
        canContinue: false,
        status: "unavailable",
      },
    );
  }
  assert.equal(plan.price_cents, 2990);
});

test("old backend rollout hides the paid reference but retains explicit availability consultation", () => {
  const plan = { id: "plan-local", slug: "profissional", active: true, price_cents: 2990 };
  assert.deepEqual(billingPlanAdmission(plan), {
    amountCents: null,
    canContinue: true,
    status: "unknown",
  });
  assert.deepEqual(billingPlanAdmission({ ...plan, admission_offer: null }), {
    amountCents: null,
    canContinue: false,
    status: "unavailable",
  });
  assert.deepEqual(billingPlanAdmission({ ...plan, slug: "gratuito", price_cents: 0 }), {
    amountCents: 0,
    canContinue: true,
    status: "available",
  });
  assert.equal(
    billingPlanAdmission({
      ...plan,
      admission_offer: {
        status: "available",
        source: "legacy_plan",
        amount_cents: 2990,
        currency: "BRL",
        interval: "month",
        revision: null,
      },
    }).amountCents,
    2990,
  );
  const card = source("../app/app/professional/billing/plans/logic.tsx");
  assert.match(card, /<PlanAdmissionPrice plan=\{plan\}/);
  assert.doesNotMatch(card, /formatPrice\(plan\.price_cents\)/);
  assert.match(card, /Consultar disponibilidade/);
  assert.match(card, /canManageBillingContract\(currentSubscription\)/);
  assert.match(card, /Seu contrato existente mantém/);
});

test("real plan price component renders the new admission amount and hides stale paused prices", async () => {
  await import("../../scripts/register-source-modules.mjs");
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { PlanAdmissionPrice } = await import("../app/app/professional/billing/plans/price.tsx");
  const plan = {
    id: "render-only",
    slug: "profissional",
    active: true,
    price_cents: 2990,
    admission_offer: {
      status: "available",
      source: "versioned_offer",
      amount_cents: 3990,
      currency: "BRL",
      interval: "month",
      revision: "opaque:2",
    },
  };
  const render = (value) =>
    renderToStaticMarkup(createElement(PlanAdmissionPrice, { plan: value }));
  const available = render(plan);
  assert.match(available, /39,90/);
  assert.doesNotMatch(available, /29,90/);
  assert.match(available, /Valor para novas assinaturas/);
  const paused = render({
    ...plan,
    admission_offer: { ...plan.admission_offer, status: "paused" },
  });
  assert.match(paused, /Novas assinaturas pausadas/);
  assert.doesNotMatch(paused, /29,90|39,90|<strong/);
  const oldBackend = render({ ...plan, admission_offer: undefined });
  assert.match(oldBackend, /Confira o valor ao continuar/);
  assert.doesNotMatch(oldBackend, /29,90|<strong/);
});
