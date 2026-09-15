"use client";
import type { FocusEvent } from "react";
import type { AdminFinanceDashboard } from "@/api/req/finance";
import {
  CardsGrid,
  FinanceChart,
  FinancePeriodControls,
  RevenuePanel,
} from "../components/header-chart";

import { CardShell, LoadingGrid } from "../components/metrics";
import { LatestCharges, SubscriptionRelation } from "../components/subscription-lists";
import {
  FINANCE_PERIOD_OPTIONS,
  type FinanceDashboardRange,
  type FinanceMetricKey,
  type FinancePeriodPreset,
  type FinancePeriodValue,
  formatDate,
} from "../modules/finance-support";

export const FinanceOverview = ({
  activeMetricKeys,
  dashboard,
  displayRange,
  isLoading,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  onToggleMetric,
  period,
  rangeError,
  rangeValid,
}: {
  activeMetricKeys: FinanceMetricKey[];
  dashboard?: AdminFinanceDashboard;
  displayRange: FinanceDashboardRange;
  isLoading: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: FinancePeriodPreset) => void;
  onToggleMetric: (key: FinanceMetricKey) => void;
  period: FinancePeriodValue;
  rangeError: string | null;
  rangeValid: boolean;
}) => {
  const selectedPeriodLabel =
    FINANCE_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Personalizado";
  const periodSummary =
    period === "custom"
      ? rangeValid
        ? `Período personalizado · ${formatDate(displayRange.from ?? "")} a ${formatDate(
            displayRange.to ?? "",
          )}`
        : "Período personalizado"
      : dashboard
        ? `${dashboard.period.label} · ${formatDate(dashboard.period.from)} a ${formatDate(
            dashboard.period.to,
          )}`
        : selectedPeriodLabel;

  return (
    <CardShell className="min-w-0 p-5">
      <div className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodSummary}</p>
        </div>

        <FinancePeriodControls
          displayRange={displayRange}
          onDateChange={onDateChange}
          onDateControlsBlur={onDateControlsBlur}
          onPeriodChange={onPeriodChange}
          period={period}
          rangeError={rangeError}
        />
      </div>

      {isLoading ? <LoadingGrid /> : null}
      {!isLoading && !rangeValid ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Ajuste o período personalizado para carregar a visão geral financeira.
        </p>
      ) : null}
      {!isLoading && rangeValid && dashboard ? (
        <>
          <CardsGrid
            activeMetricKeys={activeMetricKeys}
            dashboard={dashboard}
            onToggleMetric={onToggleMetric}
          />
          <FinanceChart points={dashboard.series.points} visibleMetricKeys={activeMetricKeys} />
        </>
      ) : null}
    </CardShell>
  );
};

export const DashboardContent = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => (
  <div className="space-y-6">
    <RevenuePanel dashboard={dashboard} />
    <LatestCharges dashboard={dashboard} />
    <SubscriptionRelation dashboard={dashboard} />
  </div>
);
