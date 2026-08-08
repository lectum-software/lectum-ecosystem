"use client";
import { useState } from "react";
import { useAdminCommunitiesDashboard } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { CommunitiesDashboardQuery } from "@/api/req/communities";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { CommunitiesHeader, ErrorState, LoadingGrid } from "./components/common";

import {
  buildCommunityDashboardPeriodQuery,
  formatSelectedPeriod,
  getCommunityDashboardLastSixMonthsRange,
  getCommunityDashboardPeriodLabel,
  getCommunityDashboardRangeForPeriod,
} from "./modules/period-support";

import { isValidCustomRange } from "./modules/statistics-builders";
import type {
  CommunityDashboardPeriodPreset,
  CommunityDashboardPeriodValue,
} from "./modules/statistics-config";

import { DashboardContent } from "./views/dashboard-content";

export const AdminCommunitiesClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<CommunityDashboardPeriodValue>("all");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange: handleDraftDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<CommunitiesDashboardQuery>({
    errorMessage:
      "Informe um período personalizado completo, com data inicial menor ou igual à final.",
    initialRange: () => getCommunityDashboardRangeForPeriod("all"),
    isValidRange: isValidCustomRange,
  });
  const validRange = selectedPeriod === "custom" ? isValidCustomRange(appliedRange) : true;
  const queryInput = buildCommunityDashboardPeriodQuery(selectedPeriod, appliedRange);
  const fixedSixMonthQueryInput = getCommunityDashboardLastSixMonthsRange();
  const query = useAdminCommunitiesDashboard(queryInput, { enabled: validRange });
  const fixedSixMonthQuery = useAdminCommunitiesDashboard(fixedSixMonthQueryInput, {
    enabled: validRange,
  });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const fixedSixMonthQueryError = fixedSixMonthQuery.error
    ? resolveApiError(fixedSixMonthQuery.error)
    : null;
  const handlePeriodChange = (nextPeriod: CommunityDashboardPeriodPreset) => {
    setSelectedPeriod(nextPeriod);
    applyRange(getCommunityDashboardRangeForPeriod(nextPeriod));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDraftDateChange(field, value);
  };

  return (
    <div className="min-w-0 overflow-x-hidden space-y-7">
      <CommunitiesHeader />

      {!validRange ? (
        <ErrorState
          message="Selecione um período válido."
          onRetry={() => handlePeriodChange("all")}
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
          periodControls={{
            displayRange: draftRange,
            onDateChange: handleDateChange,
            onDateControlsBlur: handleDateControlsBlur,
            onPeriodChange: handlePeriodChange,
            period: selectedPeriod,
            rangeError,
          }}
          periodLabel={formatSelectedPeriod(
            query.data.period,
            getCommunityDashboardPeriodLabel(selectedPeriod),
          )}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
