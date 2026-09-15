"use client";
import { type FocusEvent, useEffect, useMemo, useState } from "react";
import { useAdminTrafficSummary } from "@/api/callers/traffic";
import { resolveApiError } from "@/api/handle";
import type { TrafficSummaryQuery } from "@/api/req/traffic";
import { ErrorState, LoadingGrid, OnlineNowSkeleton } from "./components/overview-cards";

import { TrafficOverviewPanel, TrafficPeriodControls } from "./components/timeline";
import {
  formatPeriodDescription,
  getTrafficRangeForPeriod,
  isValidRange,
  type TrafficDateRange,
  type TrafficPeriodPreset,
  type TrafficPeriodValue,
} from "./modules/traffic-support";
import { TrafficContent, TrafficHeader } from "./views/traffic-content";

export const AdminTrafficClient = () => {
  const initialRange = useMemo(() => getTrafficRangeForPeriod("30d"), []);
  const [selectedPeriod, setSelectedPeriod] = useState<TrafficPeriodValue>("30d");
  const [appliedPeriod, setAppliedPeriod] = useState<TrafficPeriodValue>("30d");
  const [draftRange, setDraftRange] = useState<TrafficDateRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<TrafficDateRange>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validRange = isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const appliedQuery = useMemo<TrafficSummaryQuery>(
    () =>
      appliedPeriod === "custom"
        ? { from: appliedRange.from, period: "custom", to: appliedRange.to }
        : { period: appliedPeriod },
    [appliedPeriod, appliedRange.from, appliedRange.to],
  );
  const query = useAdminTrafficSummary(appliedQuery, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
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
  const handlePeriodChange = (nextPeriod: TrafficPeriodPreset) => {
    const nextRange = getTrafficRangeForPeriod(nextPeriod);

    setRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleDateChange = (field: keyof TrafficDateRange, value: string) => {
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
  const handleDateControlsBlur = (event: FocusEvent<HTMLDivElement>) => {
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
    const defaultRange = getTrafficRangeForPeriod("30d");

    setRangeError(null);
    setSelectedPeriod("30d");
    setAppliedPeriod("30d");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };
  const periodControls = (
    <TrafficPeriodControls
      displayRange={draftRange}
      onDateControlsBlur={handleDateControlsBlur}
      onDateChange={handleDateChange}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      rangeError={rangeError}
    />
  );

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      <TrafficHeader />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <>
          <OnlineNowSkeleton />
          <TrafficOverviewPanel
            periodControls={periodControls}
            periodDescription={formatPeriodDescription(selectedPeriod, draftRange)}
          >
            <LoadingGrid />
            <div className="mt-4 h-[20rem] animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-muted" />
          </TrafficOverviewPanel>
        </>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <TrafficContent
          periodControls={periodControls}
          periodDescription={formatPeriodDescription(appliedPeriod, {
            from: query.data.period.from,
            to: query.data.period.to,
          })}
          summary={query.data}
        />
      ) : null}
    </div>
  );
};
