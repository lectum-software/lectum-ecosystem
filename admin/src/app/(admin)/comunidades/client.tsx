"use client";
import { useAdminCommunitiesDashboard } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import { CommunitiesHeader, ErrorState, LoadingGrid } from "./components/common";

import {
  formatSelectedPeriod,
  getCommunityDashboardLastSixMonthsRange,
  getCommunityDashboardPeriodLabel,
} from "./modules/period-support";

import { useCommunityDashboardPeriod } from "./modules/use-dashboard-period";

import { DashboardContent } from "./views/dashboard-content";

export const AdminCommunitiesClient = () => {
  const { appliedPeriod, periodControls, queryInput, validRange } = useCommunityDashboardPeriod();
  const fixedSixMonthQueryInput = getCommunityDashboardLastSixMonthsRange();
  const query = useAdminCommunitiesDashboard(queryInput, { enabled: validRange });
  const fixedSixMonthQuery = useAdminCommunitiesDashboard(fixedSixMonthQueryInput, {
    enabled: validRange,
  });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const fixedSixMonthQueryError = fixedSixMonthQuery.error
    ? resolveApiError(fixedSixMonthQuery.error)
    : null;

  return (
    <div className="min-w-0 overflow-x-hidden space-y-7">
      <CommunitiesHeader />

      {!validRange ? (
        <ErrorState
          message="Selecione um período válido."
          onRetry={() => periodControls.onPeriodChange("all")}
        />
      ) : null}

      {validRange && (query.isLoading || fixedSixMonthQuery.isLoading) ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && fixedSixMonthQuery.isError && fixedSixMonthQueryError ? (
        <ErrorState
          message={fixedSixMonthQueryError}
          onRetry={() => void fixedSixMonthQuery.refetch()}
        />
      ) : null}

      {validRange && query.data && fixedSixMonthQuery.data ? (
        <DashboardContent
          fixedSixMonthPeriodLabel={formatSelectedPeriod(
            fixedSixMonthQuery.data.period,
            "Últimos 6 meses",
          )}
          fixedSixMonthSummary={fixedSixMonthQuery.data}
          periodControls={periodControls}
          periodLabel={formatSelectedPeriod(
            query.data.period,
            getCommunityDashboardPeriodLabel(appliedPeriod),
          )}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
