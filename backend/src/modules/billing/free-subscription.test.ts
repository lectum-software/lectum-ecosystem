import assert from "node:assert/strict";
import { test } from "node:test";
import type { professional_subscription, subscription_plan } from "@/interfaces/objects";
import {
  type BillingFreeSubscriptionClient,
  restoreFreePlanAfterProfessionalCancellation,
} from "./free-subscription";

type SubscriptionRecord = professional_subscription & {
  plan: subscription_plan;
};

type DelegateArgs = {
  data?: Record<string, unknown>;
  include?: unknown;
  orderBy?: unknown;
  where?: Record<string, unknown>;
};

const baseDate = new Date("2026-08-15T12:00:00.000Z");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const plan = (slug: "gratuito" | "profissional"): subscription_plan => ({
  active: true,
  deleted: false,
  id: `${slug}-plan`,
  name: slug === "gratuito" ? "Plano Gratuito" : "Plano Profissional",
  price_cents: slug === "gratuito" ? 0 : 2990,
  slug,
});

const subscription = ({
  id,
  plan: subscriptionPlan,
  psychologistId = "psy-1",
  source,
  status,
}: {
  id: string;
  plan: subscription_plan;
  psychologistId?: string;
  source: string;
  status: string;
}): SubscriptionRecord => ({
  createdAt: baseDate,
  current_period_end: null,
  deleted: false,
  gateway: source === "mercadopago" ? "mercadopago" : null,
  gateway_subscription_id: source === "mercadopago" ? `gateway-${id}` : null,
  id,
  plan: subscriptionPlan,
  plan_id: subscriptionPlan.id,
  psychologist_id: psychologistId,
  source,
  status,
  updatedAt: baseDate,
});

const planSlugMatches = (planSlug: string, requirement: unknown) => {
  if (typeof requirement === "string") return planSlug === requirement;

  const record = isRecord(requirement) ? requirement : null;
  const notValue = typeof record?.not === "string" ? record.not : null;

  return notValue ? planSlug !== notValue : true;
};

const idMatches = (subscriptionId: string, requirement: unknown) => {
  if (typeof requirement === "string") return subscriptionId === requirement;

  const record = isRecord(requirement) ? requirement : null;
  const notValue = typeof record?.not === "string" ? record.not : null;

  return notValue ? subscriptionId !== notValue : true;
};

const matchesSubscriptionWhere = (
  item: SubscriptionRecord,
  where: Record<string, unknown> = {},
) => {
  if (where.deleted === false && item.deleted) return false;
  if (typeof where.psychologist_id === "string" && item.psychologist_id !== where.psychologist_id) {
    return false;
  }
  if (!idMatches(item.id!, where.id)) return false;

  const planWhere = isRecord(where.plan) ? where.plan : null;
  if (planWhere) {
    if (planWhere.active === true && item.plan.active !== true) return false;
    if (planWhere.deleted === false && item.plan.deleted) return false;
    if (!planSlugMatches(item.plan.slug!, planWhere.slug)) return false;
  }

  const hasActivePeriodConstraint = Array.isArray(where.OR);
  if (hasActivePeriodConstraint && item.status !== "ativa") return false;

  return true;
};

const sortByUpdatedAndCreatedDesc = (items: SubscriptionRecord[]) =>
  [...items].sort((left, right) => {
    const leftUpdated = left.updatedAt?.getTime() ?? 0;
    const rightUpdated = right.updatedAt?.getTime() ?? 0;
    if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

    return (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0);
  });

const makeClient = ({
  plans = [plan("gratuito"), plan("profissional")],
  subscriptions = [],
}: {
  plans?: subscription_plan[];
  subscriptions?: SubscriptionRecord[];
} = {}) => {
  const state = {
    createdCount: 0,
    plans,
    subscriptions,
  };

  const client = {
    professional_subscription: {
      create: async ({ data }: DelegateArgs) => {
        const subscriptionPlan = state.plans.find((item) => item.id === data?.plan_id);
        assert.ok(subscriptionPlan, "test setup requires a matching plan");

        const created = {
          createdAt: baseDate,
          deleted: false,
          id: `created-free-${state.createdCount + 1}`,
          plan: subscriptionPlan,
          updatedAt: baseDate,
          ...data,
        } as SubscriptionRecord;

        state.createdCount += 1;
        state.subscriptions.push(created);

        return created;
      },
      findFirst: async ({ where }: DelegateArgs) =>
        sortByUpdatedAndCreatedDesc(
          state.subscriptions.filter((item) => matchesSubscriptionWhere(item, where)),
        )[0] ?? null,
      update: async ({ data, where }: DelegateArgs) => {
        const id = typeof where?.id === "string" ? where.id : null;
        assert.ok(id, "test update requires id");

        const index = state.subscriptions.findIndex((item) => item.id === id);
        assert.notEqual(index, -1, "test update target must exist");

        const updated = {
          ...state.subscriptions[index],
          ...data,
          updatedAt: baseDate,
        } as SubscriptionRecord;
        state.subscriptions[index] = updated;

        return updated;
      },
    },
    subscription_plan: {
      findFirst: async ({ where }: DelegateArgs) =>
        state.plans.find(
          (item) =>
            where?.slug === item.slug &&
            (where?.active !== true || item.active) &&
            (where?.deleted !== false || !item.deleted),
        ) ?? null,
    },
  } as unknown as BillingFreeSubscriptionClient;

  return {
    client,
    state,
  };
};

test("restoreFreePlanAfterProfessionalCancellation reativa plano gratuito anterior", async () => {
  const freePlan = plan("gratuito");
  const professionalPlan = plan("profissional");
  const previousFree = subscription({
    id: "free-previous",
    plan: freePlan,
    source: "free_signup",
    status: "cancelada",
  });
  const cancelledProfessional = subscription({
    id: "paid-cancelled",
    plan: professionalPlan,
    source: "mercadopago",
    status: "cancelada",
  });
  const { client, state } = makeClient({
    plans: [freePlan, professionalPlan],
    subscriptions: [previousFree, cancelledProfessional],
  });

  const current = await restoreFreePlanAfterProfessionalCancellation({
    cancelledSubscriptionId: cancelledProfessional.id,
    psychologistId: "psy-1",
    tx: client,
  });

  assert.equal(current?.id, previousFree.id);
  assert.equal(current?.status, "ativa");
  assert.equal(current?.plan?.slug, "gratuito");
  assert.equal(current?.gateway, null);
  assert.equal(state.createdCount, 0);
});

test("restoreFreePlanAfterProfessionalCancellation cria plano gratuito quando nao havia anterior", async () => {
  const professionalPlan = plan("profissional");
  const cancelledProfessional = subscription({
    id: "paid-cancelled",
    plan: professionalPlan,
    source: "mercadopago",
    status: "cancelada",
  });
  const { client, state } = makeClient({
    subscriptions: [cancelledProfessional],
  });

  const current = await restoreFreePlanAfterProfessionalCancellation({
    cancelledSubscriptionId: cancelledProfessional.id,
    psychologistId: "psy-1",
    tx: client,
  });

  assert.equal(current?.status, "ativa");
  assert.equal(current?.source, "free_signup");
  assert.equal(current?.plan?.slug, "gratuito");
  assert.equal(state.createdCount, 1);
});

test("restoreFreePlanAfterProfessionalCancellation preserva cortesia ativa ao cancelar cobranca agendada", async () => {
  const professionalPlan = plan("profissional");
  const activeCourtesy = subscription({
    id: "courtesy-active",
    plan: professionalPlan,
    source: "admin_grant",
    status: "ativa",
  });
  const cancelledScheduledCharge = subscription({
    id: "paid-scheduled-cancelled",
    plan: professionalPlan,
    source: "mercadopago",
    status: "cancelada",
  });
  const { client, state } = makeClient({
    subscriptions: [activeCourtesy, cancelledScheduledCharge],
  });

  const current = await restoreFreePlanAfterProfessionalCancellation({
    cancelledSubscriptionId: cancelledScheduledCharge.id,
    psychologistId: "psy-1",
    tx: client,
  });

  assert.equal(current?.id, activeCourtesy.id);
  assert.equal(current?.source, "admin_grant");
  assert.equal(state.createdCount, 0);
});

test("restoreFreePlanAfterProfessionalCancellation reutiliza gratuito ativo sem duplicar", async () => {
  const freePlan = plan("gratuito");
  const professionalPlan = plan("profissional");
  const activeFree = subscription({
    id: "free-active",
    plan: freePlan,
    source: "free_signup",
    status: "ativa",
  });
  const cancelledProfessional = subscription({
    id: "paid-cancelled",
    plan: professionalPlan,
    source: "mercadopago",
    status: "cancelada",
  });
  const { client, state } = makeClient({
    plans: [freePlan, professionalPlan],
    subscriptions: [activeFree, cancelledProfessional],
  });

  const current = await restoreFreePlanAfterProfessionalCancellation({
    cancelledSubscriptionId: cancelledProfessional.id,
    psychologistId: "psy-1",
    tx: client,
  });

  assert.equal(current?.id, activeFree.id);
  assert.equal(state.createdCount, 0);
});
