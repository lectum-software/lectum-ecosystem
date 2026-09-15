import { endOfDate, parseDateOnly, startOfDate, toDateKey } from "@/utils/date-range";
import {
  isPlanHistoryKnownAt,
  professionalSubscriptionsAt,
} from "@/utils/professional-plan-history";
import type {
  AdminPsychologistsDashboardBreakdownItem,
  AdminPsychologistsDashboardDailyPoint,
  AdminPsychologistsDashboardDateRange,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type {
  AdminPsychologistDeletedAccountRecord,
  AdminPsychologistProfileRecord,
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
import { STATUS_CANCELLED } from "../support/constants";
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

/** Churn keeps the existing numerator/denominator; only its evidence becomes historical. */
export const calculateChurnPercent = (
  profiles: Pick<AdminPsychologistProfileRecord, "plan_history">[],
  range: AdminPsychologistsDashboardDateRange,
) => {
  const known =
    profiles.length > 0 &&
    profiles.every((profile) => isPlanHistoryKnownAt(profile.plan_history, range.start));
  const openingBase = profiles
    .flatMap((profile) => activeSubscriptionsAt(profile, range.start))
    .filter(isPaidGatewaySubscription);
  const canceledIds = new Set<string>();
  for (const profile of profiles) {
    const history = profile.plan_history;
    if (!history) continue;
    const ordered = [...history.subscriptions].sort(
      (left, right) =>
        left.observed_at.getTime() - right.observed_at.getTime() ||
        (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
    );
    const previousStatus = new Map<string, string>();
    for (const row of ordered) {
      const previous = previousStatus.get(row.subscription_id);
      previousStatus.set(row.subscription_id, row.status);
      if (
        row.observation !== "update_observed" ||
        previous === undefined ||
        previous === STATUS_CANCELLED ||
        row.status !== STATUS_CANCELLED ||
        row.deleted ||
        row.observed_at < range.start ||
        row.observed_at > range.end
      )
        continue;
      const atCancellation = professionalSubscriptionsAt(
        { ...history, subscriptions: [row] },
        row.observed_at,
      ).find((subscription) => subscription.id === row.subscription_id);
      if (
        atCancellation &&
        isPaidGatewaySubscription({ ...atCancellation, status: STATUS_CANCELLED })
      ) {
        canceledIds.add(row.subscription_id);
      }
    }
  }
  const denominator = openingBase.length;
  return {
    canceled: canceledIds.size,
    denominator,
    known,
    value: denominator === 0 ? 0 : roundPercent((canceledIds.size / denominator) * 100),
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
  planHistoryCoverage?: Date | null;
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
      plan_history_known:
        Boolean(params.planHistoryCoverage && params.planHistoryCoverage <= dayEnd) &&
        params.profiles.every((profile) => isPlanHistoryKnownAt(profile.plan_history, dayEnd)),
      churn_history_known:
        Boolean(params.planHistoryCoverage && params.planHistoryCoverage <= dayStart) &&
        params.profiles.every((profile) => isPlanHistoryKnownAt(profile.plan_history, dayStart)),
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
