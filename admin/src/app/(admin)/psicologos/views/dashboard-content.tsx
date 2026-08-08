"use client";
import { type ReactNode, useState } from "react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { DashboardProfileConversionBehaviorFunnelCard } from "../components/conversion-funnel";
import { CardsGrid, DashboardOverviewPanel } from "../components/dashboard-header";
import { EmptyState } from "../components/metric-cards";
import { DashboardProfileConversionCard } from "../components/profile-signals";
import { ConversionAndUsageBlocks } from "../components/signup-conversion";
import { TimelineChart } from "../components/timeline-filters";
import { DashboardTrafficSourcesCard } from "../components/traffic-card";
import {
  CARD_ORDER,
  type DashboardMetricKey,
  formatSelectedPeriod,
  hasDashboardRecords,
} from "../modules/dashboard-support";
import { StatsContent } from "./stats-content";

export const DashboardContent = ({
  periodControls,
  summary,
}: {
  periodControls: ReactNode;
  summary: AdminPsychologistsDashboard;
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
      {!hasDashboardRecords(summary) ? <EmptyState period={summary.period} /> : null}

      <section className="space-y-4">
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={formatSelectedPeriod(summary.period)}
        >
          <CardsGrid
            activeMetricKeys={activeMetricKeys}
            onToggleMetric={toggleMetric}
            summary={summary}
          />
          <TimelineChart points={summary.timeline.points} visibleMetricKeys={activeMetricKeys} />
        </DashboardOverviewPanel>
        <DashboardTrafficSourcesCard summary={summary} />
        <DashboardProfileConversionBehaviorFunnelCard summary={summary} />
        <DashboardProfileConversionCard summary={summary} />
      </section>

      <StatsContent summary={summary} />

      <ConversionAndUsageBlocks summary={summary} />
    </div>
  );
};
