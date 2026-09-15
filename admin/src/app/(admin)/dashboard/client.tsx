"use client";

import { type FocusEventHandler, useEffect, useMemo, useState } from "react";
import { useAdminDashboardSummary } from "@/api/callers/dashboard";
import { resolveApiError } from "@/api/handle";
import type { DashboardPeriodPreset, DashboardSummaryQuery } from "@/api/req/dashboard";
import { DashboardHero, DashboardPeriodControls } from "./components/chart-period";
import { ErrorState, LoadingGrid } from "./components/common";
import { DashboardOverviewPanel } from "./components/reports-overview";
import {
  type DashboardDateRange,
  type DashboardPeriodValue,
  formatPeriodDescription,
  getDashboardRangeForPeriod,
  isValidRange,
} from "./modules/dashboard-support";

import { DashboardContent } from "./views/dashboard-content";

export const AdminDashboardClient = () => {
  const initialRange = useMemo(() => getDashboardRangeForPeriod("7d"), []);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodValue>("7d");
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPeriodValue>("7d");
  const [draftRange, setDraftRange] = useState<DashboardDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<DashboardDateRange>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validRange = isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const appliedQuery = useMemo<DashboardSummaryQuery>(
    () =>
      appliedPeriod === "custom"
        ? { from: appliedRange.from, period: "custom", to: appliedRange.to }
        : { period: appliedPeriod },
    [appliedPeriod, appliedRange.from, appliedRange.to],
  );
  const query = useAdminDashboardSummary(appliedQuery, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodDescription = useMemo(() => {
    const range = query.data
      ? {
          from: query.data.period.from,
          to: query.data.period.to,
        }
      : draftRange;

    return formatPeriodDescription(query.data ? appliedPeriod : selectedPeriod, range);
  }, [appliedPeriod, draftRange, query.data, selectedPeriod]);

  useEffect(() => {
    if (!query.data || appliedPeriod === "custom") return;

    const resolvedRange = {
      from: query.data.period.from,
      to: query.data.period.to,
    };

    const timeout = window.setTimeout(() => {
      setAppliedRange(resolvedRange);

      if (selectedPeriod === appliedPeriod) {
        setDraftRange(resolvedRange);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [appliedPeriod, query.data, selectedPeriod]);

  const handlePeriodChange = (period: DashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(period);

    setRangeError(null);
    setSelectedPeriod(period);
    setAppliedPeriod(period);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };

  const handleDashboardDateChange = (field: keyof DashboardDateRange, value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange((current) => ({ ...current, [field]: value }));
  };

  const commitCustomRange = () => {
    if (selectedPeriod !== "custom") return;

    if (!validDraftRange) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
  };

  const handleDateControlsBlur: FocusEventHandler<HTMLDivElement> = (event) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitCustomRange();
    }, 0);
  };

  const resetPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod("7d");

    setRangeError(null);
    setSelectedPeriod("7d");
    setAppliedPeriod("7d");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };

  const periodControls = (
    <DashboardPeriodControls
      onDateChange={handleDashboardDateChange}
      onDateControlsBlur={handleDateControlsBlur}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      range={draftRange}
      rangeError={rangeError}
    />
  );

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      <DashboardHero />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={periodDescription}
        >
          <LoadingGrid />
        </DashboardOverviewPanel>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent
          periodControls={periodControls}
          periodDescription={periodDescription}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
