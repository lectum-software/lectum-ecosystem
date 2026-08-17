import { endOfDate, parseDateOnly, startOfDate, toDateKey } from "@/utils/date-range";
import type {
  AdminPsychologistsDashboardBreakdownItem,
  AdminPsychologistsDashboardDailyPoint,
  AdminPsychologistsDashboardDateRange,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistDeletedAccountRecord,
  AdminPsychologistProfileRecord,
  AdminPsychologistSubscriptionRecord,
} from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import {
  activeSubscriptionsAt,
  hasActiveCourtesyAt,
  hasActiveSubscriberAt,
  hasCurrentFreePlanAt,
  isPaidGatewaySubscription,
  isProfessionalPlan,
  profileCreatedUntil,
} from "../plan/segments";
import { dateInRange } from "../pre-signup/conversion";
import { STATUS_ACTIVE, STATUS_CANCELLED } from "../support/constants";
import { roundPercent, safePercentage } from "../support/metrics";

const activeProfessionalSubscriptionsAt = (profile: AdminPsychologistProfileRecord, date: Date) =>
  activeSubscriptionsAt(profile, date).filter(isProfessionalPlan);

export const hasVerifiedEntitlementAt = (profile: AdminPsychologistProfileRecord, date: Date) => {
  const entitlements = activeProfessionalSubscriptionsAt(profile, date);
  if (entitlements.length === 0) return false;

  if (profile.crp_status === "aprovado") return true;
  if (profile.cfp_verified_at && profile.cfp_verified_at <= date) return true;

  return entitlements.some(
    (subscription) =>
      subscription.source === "admin_grant" &&
      (subscription.grant_started_at ?? subscription.createdAt) <= date,
  );
};

const flattenSubscriptions = (profiles: AdminPsychologistProfileRecord[]) =>
  profiles.flatMap((profile) => profile.subscriptions);

const paidGatewayCanceledInRange = (
  subscriptions: AdminPsychologistSubscriptionRecord[],
  range: AdminPsychologistsDashboardDateRange,
) =>
  subscriptions.filter(
    (item) =>
      isPaidGatewaySubscription(item) &&
      item.status === STATUS_CANCELLED &&
      dateInRange(item.updatedAt, range),
  );

const paidGatewaySubscriptionInOpeningBaseAt = (
  subscription: AdminPsychologistSubscriptionRecord,
  date: Date,
) => {
  if (!isPaidGatewaySubscription(subscription)) return false;
  if (subscription.createdAt > date) return false;
  if (subscription.current_period_end && subscription.current_period_end <= date) return false;
  if (subscription.status === STATUS_ACTIVE) return true;

  return subscription.status === STATUS_CANCELLED && subscription.updatedAt > date;
};

/**
 * Churn V1 do Admin Psicólogos:
 * cancelamentos reais de assinaturas profissionais originadas no gateway Mercado Pago no período
 * divididos pela base paga ativa no início do período. Novas assinaturas iniciadas dentro do
 * período não entram no denominador. Cortesias/admin_grant e plano gratuito não entram no
 * numerador nem denominador.
 */
export const calculateChurnPercent = (
  profiles: AdminPsychologistProfileRecord[],
  range: AdminPsychologistsDashboardDateRange,
) => {
  const subscriptions = flattenSubscriptions(profiles);
  const openingBase = subscriptions.filter((item) =>
    paidGatewaySubscriptionInOpeningBaseAt(item, range.start),
  );
  const denominator = openingBase.length;
  const canceled = paidGatewayCanceledInRange(subscriptions, range).length;

  if (denominator === 0) {
    return {
      canceled,
      denominator,
      value: 0,
    };
  }

  return {
    canceled,
    denominator,
    value: roundPercent((canceled / denominator) * 100),
  };
};

const countByDate = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

const getDateCount = (counts: Map<string, number>, label: string) => counts.get(label) ?? 0;

export const deletedAccountInRange = (
  account: AdminPsychologistDeletedAccountRecord,
  range: AdminPsychologistsDashboardDateRange,
) => Boolean(account.deletedAt && dateInRange(account.deletedAt, range));

export const buildTimeline = (params: {
  deletedAccounts?: AdminPsychologistDeletedAccountRecord[];
  labels: string[];
  profiles: AdminPsychologistProfileRecord[];
}): AdminPsychologistsDashboardDailyPoint[] => {
  const newSignupsByDate = countByDate(
    params.profiles.map((profile) => ({ createdAt: profile.user.createdAt })),
    params.labels,
  );
  const deletedAccountsByDate = countByDate(
    (params.deletedAccounts ?? []).flatMap((account) =>
      account.deletedAt ? [{ createdAt: account.deletedAt }] : [],
    ),
    params.labels,
  );

  return params.labels.map((date) => {
    const dayStart = parseDateOnly(date, "start") ?? startOfDate(new Date(date));
    const dayEnd = parseDateOnly(date, "end") ?? endOfDate(new Date(date));
    const profilesCreatedUntilDay = params.profiles.filter((profile) =>
      profileCreatedUntil(profile, dayEnd),
    );

    return {
      churn: calculateChurnPercent(params.profiles, { end: dayEnd, start: dayStart }).value,
      courtesy_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveCourtesyAt(profile, dayEnd),
      ).length,
      date,
      deleted_accounts: getDateCount(deletedAccountsByDate, date),
      free_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasCurrentFreePlanAt(profile, dayEnd),
      ).length,
      new_signups: getDateCount(newSignupsByDate, date),
      subscriber_psychologists: profilesCreatedUntilDay.filter((profile) =>
        hasActiveSubscriberAt(profile, dayEnd),
      ).length,
      total_psychologists: profilesCreatedUntilDay.length,
    };
  });
};

export const addMapCount = (
  map: Map<string, { count: number; label: string }>,
  id: string,
  label: string,
) => {
  const current = map.get(id);
  map.set(id, {
    count: (current?.count ?? 0) + 1,
    label: current?.label ?? label,
  });
};

export const buildBreakdown = (
  map: Map<string, { count: number; label: string }>,
  total: number,
  limit?: number,
): AdminPsychologistsDashboardBreakdownItem[] => {
  const items = [...map.entries()]
    .map(([id, item]) => ({
      count: item.count,
      id,
      label: item.label,
      percentage: safePercentage(item.count, total),
    }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;

      return left.label.localeCompare(right.label, "pt-BR");
    });

  return typeof limit === "number" ? items.slice(0, limit) : items;
};
