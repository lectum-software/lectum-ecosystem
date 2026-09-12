import assert from "node:assert/strict";
import test from "node:test";
import { describeProfileConversionBehaviorDominantPlan } from "@/modules/api/admin/private/psychologists/dashboard/use-cases/services/conversion-behavior/support";
import {
  getPlanSegmentAt,
  pickCurrentPlan,
} from "@/modules/api/admin/private/psychologists/dashboard/use-cases/services/plan/segments";
import { calculateChurnPercent } from "@/modules/api/admin/private/psychologists/dashboard/use-cases/services/subscriptions/timeline";
import {
  isPlanHistoryKnownAt,
  type PlanHistorySnapshot,
  type ProfessionalPlanHistory,
  professionalSubscriptionsAt,
  type SubscriptionHistorySnapshot,
} from "./professional-plan-history";

const instant = (offset = 0) => new Date(Date.UTC(2026, 8, 12, 12, 0, 0, offset));
const plan = (patch: Partial<PlanHistorySnapshot> = {}): PlanHistorySnapshot => ({
  id: 1n,
  observed_at: instant(),
  observation: "baseline_observed",
  plan_id: "free-plan",
  active: true,
  deleted: false,
  slug: "gratuito",
  name: "Gratuito",
  price_cents: 0,
  ...patch,
});
const subscription = (
  patch: Partial<SubscriptionHistorySnapshot> = {},
): SubscriptionHistorySnapshot => ({
  id: 1n,
  observed_at: instant(),
  observation: "baseline_observed",
  subscription_id: "free-sub",
  psychologist_id: "profile",
  plan_id: "free-plan",
  deleted: false,
  source_created_at: new Date("2020-01-01T00:00:00Z"),
  status: "ativa",
  source: "legacy",
  gateway: null,
  has_gateway_subscription_id: false,
  current_period_end: null,
  grant_started_at: null,
  ...patch,
});
const history = (patch: Partial<ProfessionalPlanHistory> = {}): ProfessionalPlanHistory => ({
  coverage_started_at: instant(),
  plans: [plan()],
  subscriptions: [subscription()],
  ...patch,
});
const paidPlan = plan({
  id: 2n,
  plan_id: "paid-plan",
  slug: "profissional",
  name: "Profissional",
  price_cents: 9900,
});
const paid = subscription({
  id: 2n,
  subscription_id: "paid-sub",
  plan_id: "paid-plan",
  source: "mercadopago",
  observed_at: instant(100),
});
const courtesy = subscription({
  id: 3n,
  subscription_id: "courtesy-sub",
  plan_id: "paid-plan",
  source: "admin_grant",
  observed_at: instant(50),
});

test("sem cobertura e antes do baseline são unknown, nunca gratuito inferido", () => {
  for (const value of [undefined, history({ coverage_started_at: null }), history()]) {
    assert.equal(isPlanHistoryKnownAt(value, instant(-1)), false);
    assert.equal(getPlanSegmentAt({ plan_history: value }, instant(-1)), "unknown");
    assert.deepEqual(professionalSubscriptionsAt(value, instant(-1)), []);
  }
});

test("baseline é inclusivo, createdAt antigo não antecipa cobertura", () => {
  assert.equal(getPlanSegmentAt({ plan_history: history() }, instant()), "free");
  assert.equal(getPlanSegmentAt({ plan_history: history() }, instant(-1)), "unknown");
});

test("ausência comprovada de assinatura após cobertura é none, não unknown/free", () => {
  assert.equal(
    getPlanSegmentAt({ plan_history: history({ subscriptions: [] }) }, instant()),
    "none",
  );
});

test("upgrade não reclassifica o período gratuito anterior", () => {
  const profile = {
    plan_history: history({ plans: [plan(), paidPlan], subscriptions: [subscription(), paid] }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(99)), "free");
  assert.equal(getPlanSegmentAt(profile, instant(100)), "subscriber");
});

test("sobreposição mantém precedência pago > cortesia > gratuito", () => {
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), paid, courtesy],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(49)), "free");
  assert.equal(getPlanSegmentAt(profile, instant(50)), "courtesy");
  assert.equal(getPlanSegmentAt(profile, instant(100)), "subscriber");
});

test("expiração é exclusiva mesmo sem nova escrita; cortesia remanescente permanece", () => {
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), { ...paid, current_period_end: instant(150) }, courtesy],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(149)), "subscriber");
  assert.equal(getPlanSegmentAt(profile, instant(150)), "courtesy");
});

test("renovação tardia não preenche intervalo expirado", () => {
  const initial = { ...paid, current_period_end: instant(150) };
  const renewed = {
    ...initial,
    id: 4n,
    observation: "update_observed",
    observed_at: instant(200),
    current_period_end: instant(400),
  };
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), initial, renewed],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(170)), "free");
  assert.equal(getPlanSegmentAt(profile, instant(200)), "subscriber");
});

test("cancelamento não apaga aprovação do plano pago em datas anteriores", () => {
  const canceled = {
    ...paid,
    id: 4n,
    status: "cancelada",
    observed_at: instant(200),
    observation: "update_observed",
  };
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), paid, canceled],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(199)), "subscriber");
  assert.equal(getPlanSegmentAt(profile, instant(200)), "free");
});

for (const patch of [
  { deleted: true },
  { active: false },
  { price_cents: 0 },
  { slug: "gratuito" },
]) {
  test(`alteração do catálogo não modifica passado: ${JSON.stringify(patch)}`, () => {
    const changed = {
      ...paidPlan,
      ...patch,
      id: 4n,
      observed_at: instant(200),
      observation: "update_observed",
    };
    const profile = {
      plan_history: history({
        plans: [plan(), paidPlan, changed],
        subscriptions: [subscription(), paid],
      }),
    };
    assert.equal(getPlanSegmentAt(profile, instant(199)), "subscriber");
    assert.notEqual(getPlanSegmentAt(profile, instant(200)), "subscriber");
  });
}

test("nome do plano vem da versão da época", () => {
  const renamed = { ...paidPlan, id: 4n, observed_at: instant(200), name: "Nome novo" };
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan, renamed],
      subscriptions: [subscription(), paid],
    }),
  };
  assert.equal(pickCurrentPlan(profile, instant(199))?.plan.name, "Profissional");
  assert.equal(pickCurrentPlan(profile, instant(200))?.plan.name, "Nome novo");
});

test("tombstone da assinatura não elimina estado anterior", () => {
  const removed = {
    ...paid,
    id: 4n,
    observed_at: instant(200),
    deleted: true,
    observation: "delete_observed",
  };
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), paid, removed],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(199)), "subscriber");
  assert.equal(getPlanSegmentAt(profile, instant(200)), "free");
});

test("mesmo milissegundo: revisão maior vence, independente da ordem do array", () => {
  const canceled = { ...paid, id: 4n, status: "cancelada" };
  for (const records of [
    [paid, canceled],
    [canceled, paid],
  ]) {
    const profile = {
      plan_history: history({
        plans: [plan(), paidPlan],
        subscriptions: [subscription(), ...records],
      }),
    };
    assert.equal(getPlanSegmentAt(profile, instant(100)), "free");
  }
});

test("origem por presença do identificador preservada sem copiar o identificador", () => {
  const profile = {
    plan_history: history({
      plans: [paidPlan],
      subscriptions: [{ ...paid, source: "legacy", has_gateway_subscription_id: true }],
    }),
  };
  assert.equal(getPlanSegmentAt(profile, instant(100)), "subscriber");
  assert.equal(
    "gateway_subscription_id" in professionalSubscriptionsAt(profile.plan_history, instant(100))[0],
    false,
  );
});

test("leitura histórica não modifica snapshots recebidos", () => {
  const source = history({ plans: [plan(), paidPlan], subscriptions: [subscription(), paid] });
  const before = structuredClone(source);
  professionalSubscriptionsAt(source, instant(100));
  assert.deepEqual(source, before);
});

test("churn usa abertura histórica e transição observada, não updatedAt atual", () => {
  const canceled = {
    ...paid,
    id: 4n,
    observed_at: instant(200),
    status: "cancelada",
    observation: "update_observed",
  };
  const later = { ...canceled, id: 5n, observed_at: instant(400) };
  const profile = {
    plan_history: history({
      plans: [plan(), paidPlan],
      subscriptions: [subscription(), paid, canceled, later],
    }),
  };
  assert.deepEqual(calculateChurnPercent([profile], { start: instant(150), end: instant(300) }), {
    canceled: 1,
    denominator: 1,
    known: true,
    value: 100,
  });
  assert.equal(
    calculateChurnPercent([profile], { start: instant(350), end: instant(450) }).canceled,
    0,
  );
});

test("baseline cancelado não inventa cancelamento no dia de instalação", () => {
  const profile = {
    plan_history: history({
      plans: [paidPlan],
      subscriptions: [
        { ...paid, observed_at: instant(), status: "cancelada", observation: "baseline_observed" },
      ],
    }),
  };
  assert.deepEqual(calculateChurnPercent([profile], { start: instant(), end: instant(300) }), {
    canceled: 0,
    denominator: 0,
    known: true,
    value: 0,
  });
});

test("churn não capa percentual; novas assinaturas canceladas não entram na abertura", () => {
  const newer = {
    ...paid,
    id: 4n,
    subscription_id: "newer",
    observed_at: instant(170),
    observation: "insert_observed",
  };
  const cancellations = [paid, newer].map((row, index) => ({
    ...row,
    id: BigInt(10 + index),
    observed_at: instant(200),
    status: "cancelada",
    observation: "update_observed",
  }));
  const profile = {
    plan_history: history({ plans: [paidPlan], subscriptions: [paid, newer, ...cancellations] }),
  };
  assert.deepEqual(calculateChurnPercent([profile], { start: instant(150), end: instant(300) }), {
    canceled: 2,
    denominator: 1,
    known: true,
    value: 200,
  });
});

test("churn anterior à cobertura fica desconhecido", () => {
  assert.equal(
    calculateChurnPercent([{ plan_history: history() }], { start: instant(-1), end: instant(300) })
      .known,
    false,
  );
});

test("texto do plano dominante distingue histórico desconhecido de sem plano comprovado", () => {
  assert.equal(
    describeProfileConversionBehaviorDominantPlan([{ plan_history: history() }], instant(-1)).label,
    "Plano desconhecido",
  );
  assert.equal(
    describeProfileConversionBehaviorDominantPlan(
      [{ plan_history: history({ subscriptions: [] }) }],
      instant(),
    ).label,
    "Sem plano",
  );
});
