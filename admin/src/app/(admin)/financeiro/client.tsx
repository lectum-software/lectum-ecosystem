"use client";

import { Loader2 } from "lucide-react";
import { type FocusEvent, useMemo, useState } from "react";
import { useAdminFinanceDashboard, useAdminFinanceExport } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import { FinanceHeader } from "./components/header-chart";
import { ErrorState } from "./components/metrics";
import {
  buildFinanceDashboardQuery,
  CARD_ORDER,
  DEFAULT_FINANCE_PERIOD,
  downloadBlob,
  type FinanceDashboardRange,
  type FinanceMetricKey,
  type FinancePeriodPreset,
  type FinancePeriodValue,
  getDashboardRangeForPeriod,
  isValidRange,
} from "./modules/finance-support";
import { DashboardContent, FinanceOverview } from "./views/overview";

export const AdminFinanceClient = () => {
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
  const [appliedPeriod, setAppliedPeriod] = useState<FinancePeriodValue>(DEFAULT_FINANCE_PERIOD);
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<FinanceMetricKey[]>(() => [
    ...CARD_ORDER,
  ]);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<FinanceDashboardRange>(() =>
    getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD),
  );
  const [appliedRange, setAppliedRange] = useState<FinanceDashboardRange>(() =>
    getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD),
  );
  const queryInput = useMemo(
    () => buildFinanceDashboardQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = appliedPeriod !== "custom" || isValidRange(appliedRange);
  const validDraftRange = isValidRange(draftRange);
  const visibleRangeValid = selectedPeriod !== "custom" || validDraftRange;
  const activeMetricKeys = CARD_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const query = useAdminFinanceDashboard(queryInput, { enabled: validRange });
  const exportMutation = useAdminFinanceExport();
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;

  const clearExportMessages = () => {
    setExportFeedback(null);
    setExportError(null);
  };

  const resetToDefaultPeriod = () => {
    const defaultRange = getDashboardRangeForPeriod(DEFAULT_FINANCE_PERIOD);
    setRangeError(null);
    setSelectedPeriod(DEFAULT_FINANCE_PERIOD);
    setAppliedPeriod(DEFAULT_FINANCE_PERIOD);
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
    clearExportMessages();
  };

  const handleFinancePeriodChange = (nextPeriod: FinancePeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    clearExportMessages();
  };

  const handleFinanceDateChange = (field: "from" | "to", value: string) => {
    setRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange({ ...displayRange, [field]: value });
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
    setSelectedPeriod("custom");
    setAppliedPeriod("custom");
    setAppliedRange(draftRange);
    clearExportMessages();
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

  const toggleMetric = (metricKey: FinanceMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (current.includes(metricKey)) {
        if (current.length === 1) return current;

        return current.filter((key) => key !== metricKey);
      }

      return [...current, metricKey];
    });
  };

  const handleExport = async () => {
    if (selectedPeriod === "custom" && !validDraftRange) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    if (!validRange) return;

    setExportFeedback(null);
    setExportError(null);

    const exportQuery =
      selectedPeriod === "custom" ? buildFinanceDashboardQuery("custom", draftRange) : queryInput;

    if (selectedPeriod === "custom") {
      setAppliedPeriod("custom");
      setAppliedRange(draftRange);
    }

    try {
      const result = await exportMutation.mutateAsync(exportQuery);
      downloadBlob(result.blob, result.filename);
      setExportFeedback(`Relatório ${result.filename} baixado em CSV.`);
    } catch (error) {
      setExportError(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <FinanceHeader
        exportError={exportError}
        exportDisabled={!validRange || !visibleRangeValid}
        exportFeedback={exportFeedback}
        exportPending={exportMutation.isPending}
        onExport={handleExport}
      />

      <FinanceOverview
        activeMetricKeys={activeMetricKeys}
        dashboard={query.data}
        displayRange={displayRange}
        isLoading={validRange && query.isLoading}
        onDateChange={handleFinanceDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handleFinancePeriodChange}
        onToggleMetric={toggleMetric}
        period={selectedPeriod}
        rangeError={rangeError}
        rangeValid={visibleRangeValid}
      />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetToDefaultPeriod}
        />
      ) : null}

      {validRange && query.isFetching && !query.isLoading ? (
        <p className="inline-flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Atualizando dados financeiros...
        </p>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent dashboard={query.data} /> : null}
    </div>
  );
};
