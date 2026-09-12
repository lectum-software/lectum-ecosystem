import type { Prisma } from "@/external/generated/prisma/client";
import type {
  PlanHistorySnapshot,
  ProfessionalPlanHistory,
  SubscriptionHistorySnapshot,
} from "@/utils/professional-plan-history";
import type { AdminPsychologistsDashboardDateRange } from "../../DTOs/IAdminPsychologistsDashboardDTO";
import {
  PLAN_HISTORY_PAGE_SIZE,
  PLAN_HISTORY_SCOPE_BATCH_SIZE,
  planHistoryPage,
  subscriptionHistoryPage,
} from "./plan-history-pages";

export const loadPlanHistoryByProfile = async (
  transaction: Prisma.TransactionClient,
  psychologistIds: string[],
  range: AdminPsychologistsDashboardDateRange,
) => {
  const coverage = await transaction.professional_plan_history_coverage.findUnique({
    where: { id: 1 },
  });
  const plans: PlanHistorySnapshot[] = [];
  const histories = new Map<string, ProfessionalPlanHistory>();
  const profileIds = [...new Set(psychologistIds)];
  for (const id of profileIds) {
    histories.set(id, {
      coverage_started_at: coverage?.started_at ?? null,
      plans,
      subscriptions: [],
    });
  }
  if (!coverage || coverage.started_at > range.end) return histories;

  const planIds = new Set<string>();
  for (let offset = 0; offset < profileIds.length; offset += PLAN_HISTORY_SCOPE_BATCH_SIZE) {
    const ids = profileIds.slice(offset, offset + PLAN_HISTORY_SCOPE_BATCH_SIZE);
    let afterId: bigint | undefined;
    for (;;) {
      const page: SubscriptionHistorySnapshot[] = await transaction.$queryRaw(
        subscriptionHistoryPage({ ids, range, afterId }),
      );
      for (const row of page) {
        histories.get(row.psychologist_id)?.subscriptions.push(row);
        planIds.add(row.plan_id);
      }
      if (page.length < PLAN_HISTORY_PAGE_SIZE) break;
      afterId = page[page.length - 1].id;
    }
  }
  const associatedPlanIds = [...planIds];
  for (let offset = 0; offset < associatedPlanIds.length; offset += PLAN_HISTORY_SCOPE_BATCH_SIZE) {
    const ids = associatedPlanIds.slice(offset, offset + PLAN_HISTORY_SCOPE_BATCH_SIZE);
    let afterId: bigint | undefined;
    for (;;) {
      const page: PlanHistorySnapshot[] = await transaction.$queryRaw(
        planHistoryPage({ ids, range, afterId }),
      );
      plans.push(...page);
      if (page.length < PLAN_HISTORY_PAGE_SIZE) break;
      afterId = page[page.length - 1].id;
    }
  }
  return histories;
};
