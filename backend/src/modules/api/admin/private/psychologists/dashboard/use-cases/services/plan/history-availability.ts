import {
  isPlanHistoryKnownAt,
  PLAN_HISTORY_UNAVAILABLE_REASON,
} from "@/utils/professional-plan-history";
import type {
  AdminPsychologistsDashboardDateRange,
  AdminPsychologistsDashboardSummary,
} from "../../../DTOs/IAdminPsychologistsDashboardDTO";
import type { AdminPsychologistProfileRecord } from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";

export const applyPlanHistoryAvailability = (
  summary: AdminPsychologistsDashboardSummary,
  profiles: AdminPsychologistProfileRecord[],
  current: AdminPsychologistsDashboardDateRange,
  previous: AdminPsychologistsDashboardDateRange,
  coverageStartedAt: Date | null,
) => {
  const knownAt = (date: Date) =>
    Boolean(coverageStartedAt && coverageStartedAt <= date) &&
    profiles.every((profile) => isPlanHistoryKnownAt(profile.plan_history, date));
  const currentKnown = knownAt(current.end);
  const previousKnown = knownAt(previous.end);
  // Global coverage is still unknown when a segment has no profiles to inspect.
  if (!currentKnown) {
    for (const statistics of [
      summary.statistics,
      ...Object.values(summary.plan_segments).map((segment) => segment.statistics),
    ]) {
      const verified = statistics.features.items.find((item) => item.id === "verified");
      if (verified) {
        verified.unavailable = true;
        verified.unavailable_reason = PLAN_HISTORY_UNAVAILABLE_REASON;
      }
    }
  }
  summary.plan_history = {
    coverage_started_at: coverageStartedAt,
    classification_at: current.end,
    current_known: currentKnown,
    previous_known: previousKnown,
    unknown_psychologists: profiles.filter(
      (profile) =>
        profile.user.createdAt <= current.end &&
        !isPlanHistoryKnownAt(profile.plan_history, current.end),
    ).length,
    description:
      "Os segmentos usam o plano observado no fim do período. Antes do início da cobertura, o plano é desconhecido; não é presumido gratuito nem reclassificado pela assinatura atual.",
  };
  for (const key of [
    "courtesy_psychologists",
    "free_psychologists",
    "subscriber_psychologists",
    "churn",
  ] as const) {
    const card = summary.cards[key];
    const currentAvailable = key === "churn" ? knownAt(current.start) : currentKnown;
    const previousAvailable = key === "churn" ? knownAt(previous.start) : previousKnown;
    card.source = "professional_subscription_history+subscription_plan_history";
    card.previous_unavailable = !previousAvailable;
    if (!currentAvailable) {
      card.unavailable = true;
      card.unavailable_reason = PLAN_HISTORY_UNAVAILABLE_REASON;
    }
    if (!currentAvailable || !previousAvailable) {
      card.change_percent = null;
      card.trend = "unavailable";
    }
  }
  for (const key of ["courtesy", "free", "subscribers"] as const) {
    summary.plan_segments[key].unavailable_reason = currentKnown
      ? null
      : PLAN_HISTORY_UNAVAILABLE_REASON;
  }
};
