"use client";

import { type FocusEvent, useState } from "react";
import type { AdminPatientsDashboard } from "@/api/req/patients";
import {
  PatientIntentAnalysisCard,
  PatientIntentEngagementCard,
} from "../components/intent-analysis";

import { CardShell, CardsGrid, PatientsPeriodControls } from "../components/metric-cards";

import { TimelineChart } from "../components/timeline-donuts";
import {
  CARD_ORDER,
  type DashboardMetricKey,
  formatDate,
  type PatientsDashboardPeriodPreset,
  type PatientsDashboardPeriodValue,
  type PatientsDashboardRange,
} from "../modules/dashboard-support";

import { Statistics } from "./statistics";

export const DashboardContent = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
  summary,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: PatientsDashboardPeriodPreset) => void;
  displayRange: PatientsDashboardRange;
  period: PatientsDashboardPeriodValue;
  rangeError: string | null;
  summary: AdminPatientsDashboard;
}) => {
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<DashboardMetricKey[]>(() => [
    ...CARD_ORDER,
  ]);
  const activeMetricKeys = CARD_ORDER.filter((key) => visibleMetricKeys.includes(key));
  const toggleMetric = (metricKey: DashboardMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <div className="space-y-7">
      <CardShell className="min-w-0 p-5">
        <div className="mb-5 flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-foreground">Visão Geral</h2>
            <p className="mt-1 text-sm font-bold leading-6 text-muted">
              {summary.period.label} · {formatDate(summary.period.from)} a{" "}
              {formatDate(summary.period.to)}
            </p>
          </div>
          <PatientsPeriodControls
            displayRange={displayRange}
            onDateChange={onDateChange}
            onDateControlsBlur={onDateControlsBlur}
            onPeriodChange={onPeriodChange}
            period={period}
            rangeError={rangeError}
          />
        </div>
        <CardsGrid
          activeMetricKeys={activeMetricKeys}
          onToggleMetric={toggleMetric}
          summary={summary}
        />
        <TimelineChart points={summary.series.points} visibleMetricKeys={activeMetricKeys} />
      </CardShell>

      <PatientIntentAnalysisCard summary={summary} />

      <PatientIntentEngagementCard summary={summary} />

      <Statistics summary={summary} />
    </div>
  );
};
