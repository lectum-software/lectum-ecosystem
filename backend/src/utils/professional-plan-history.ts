type Observation = { id: bigint; observed_at: Date; observation: string };

export type PlanHistorySnapshot = Observation & {
  plan_id: string;
  deleted: boolean;
  active: boolean;
  slug: string;
  name: string;
  price_cents: number;
};

export type SubscriptionHistorySnapshot = Observation & {
  subscription_id: string;
  psychologist_id: string;
  plan_id: string;
  deleted: boolean;
  source_created_at: Date;
  status: string;
  source: string;
  gateway: string | null;
  has_gateway_subscription_id: boolean;
  current_period_end: Date | null;
  grant_started_at: Date | null;
};

export type ProfessionalPlanHistory = {
  coverage_started_at: Date | null;
  plans: PlanHistorySnapshot[];
  subscriptions: SubscriptionHistorySnapshot[];
};

export const isPlanHistoryKnownAt = (history: ProfessionalPlanHistory | undefined, date: Date) =>
  Boolean(history?.coverage_started_at && history.coverage_started_at <= date);

const latestAt = <T extends Observation>(rows: T[], date: Date, key: (row: T) => string) => {
  const latest = new Map<string, T>();
  for (const row of rows) {
    if (row.observed_at > date) continue;
    const previous = latest.get(key(row));
    if (
      !previous ||
      row.observed_at > previous.observed_at ||
      (row.observed_at.getTime() === previous.observed_at.getTime() && row.id > previous.id)
    ) {
      latest.set(key(row), row);
    }
  }
  return latest;
};

// These are observed states, never a reconstruction from the current mutable row.
export const professionalSubscriptionsAt = (
  history: ProfessionalPlanHistory | undefined,
  date: Date,
) => {
  if (!history || !isPlanHistoryKnownAt(history, date)) return [];
  const plans = latestAt(history.plans, date, (row) => row.plan_id);
  const subscriptions = latestAt(history.subscriptions, date, (row) => row.subscription_id);
  return [...subscriptions.values()].flatMap((row) => {
    const plan = plans.get(row.plan_id);
    if (row.deleted || !plan || plan.deleted || !plan.active) return [];
    return [
      {
        createdAt: row.source_created_at,
        current_period_end: row.current_period_end,
        gateway: row.gateway,
        has_gateway_subscription_id: row.has_gateway_subscription_id,
        grant_started_at: row.grant_started_at,
        id: row.subscription_id,
        plan: { name: plan.name, price_cents: plan.price_cents, slug: plan.slug },
        source: row.source,
        status: row.status,
        updatedAt: row.observed_at,
      },
    ];
  });
};

export const PLAN_HISTORY_UNAVAILABLE_REASON =
  "O plano nessa data é desconhecido: o histórico observado ainda não cobria esse período.";
