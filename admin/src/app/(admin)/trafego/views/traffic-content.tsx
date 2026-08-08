"use client";

import { Activity, FileText, PieChart, Smartphone, Users } from "lucide-react";
import { useState } from "react";
import type { AdminTrafficSummary } from "@/api/req/traffic";
import { RankingList } from "../components/location";
import {
  buildDeviceDonutItems,
  ConversionsPanel,
  DonutChart,
  PageNavigationPanel,
  PanelTitle,
} from "../components/navigation-conversions";
import { CardShell, EmptyState, OnlineNowPanel } from "../components/overview-cards";
import {
  LocationPanel,
  TrafficOverviewCardsGrid,
  TrafficOverviewPanel,
  TrafficTimelineChart,
} from "../components/timeline";
import {
  hasPeriodRecords,
  TRAFFIC_OVERVIEW_CHART_ORDER,
  type TrafficOverviewMetricKey,
} from "../modules/traffic-support";

export const TrafficHeader = () => (
  <CardShell className="border-border/70 bg-surface/90 p-5 md:p-6">
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        Análise de acessos
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Tráfego
      </h1>
      <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
        Acompanhe o comportamento de acesso, os principais canais, dispositivos, páginas e
        conversões da plataforma.
      </p>
    </div>
  </CardShell>
);

export const TrafficContent = ({
  periodControls,
  periodDescription,
  summary,
}: {
  periodControls: React.ReactNode;
  periodDescription: string;
  summary: AdminTrafficSummary;
}) => {
  const [visibleMetricKeys, setVisibleMetricKeys] = useState<TrafficOverviewMetricKey[]>(() => [
    ...TRAFFIC_OVERVIEW_CHART_ORDER,
  ]);
  const activeMetricKeys = TRAFFIC_OVERVIEW_CHART_ORDER.filter((key) =>
    visibleMetricKeys.includes(key),
  );
  const toggleMetric = (metricKey: TrafficOverviewMetricKey) => {
    setVisibleMetricKeys((current) => {
      if (!current.includes(metricKey)) return [...current, metricKey];

      const next = current.filter((item) => item !== metricKey);
      return next.length > 0 ? next : current;
    });
  };

  return (
    <div className="max-w-full space-y-6 overflow-x-clip">
      {!hasPeriodRecords(summary) ? <EmptyState period={summary.period} /> : null}

      <OnlineNowPanel onlineNow={summary.online_now} />

      <TrafficOverviewPanel periodControls={periodControls} periodDescription={periodDescription}>
        <TrafficOverviewCardsGrid
          activeMetricKeys={activeMetricKeys}
          onToggleMetric={toggleMetric}
          summary={summary}
        />
        <TrafficTimelineChart
          points={summary.timeline.points}
          visibleMetricKeys={activeMetricKeys}
        />
      </TrafficOverviewPanel>

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle
            icon={PieChart}
            periodDescription={periodDescription}
            title="Origem do tráfego"
          />
          <DonutChart
            ariaLabel="Distribuição de sessões por origem de tráfego"
            items={summary.traffic_sources.items}
            total={summary.traffic_sources.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            icon={Smartphone}
            periodDescription={periodDescription}
            title="Dispositivos e sistemas"
          />
          <DonutChart
            ariaLabel="Distribuição de sessões por dispositivo"
            items={buildDeviceDonutItems(summary.devices.items)}
            total={summary.devices.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Users} periodDescription={periodDescription} title="Tipo de usuário" />
          <DonutChart
            ariaLabel="Distribuição de sessões por tipo de usuário"
            items={summary.user_types.items}
            total={summary.user_types.total}
          />
        </CardShell>
      </div>

      <ConversionsPanel periodDescription={periodDescription} summary={summary} />

      <PageNavigationPanel periodDescription={periodDescription} summary={summary} />

      <div className="grid min-w-0 gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle icon={Activity} title="Tráfego por comunidade" />
          <RankingList destinationLabel="a comunidade" items={summary.top_communities.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={FileText} title="Tráfego por post" />
          <RankingList destinationLabel="o post" items={summary.top_posts.items} />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle icon={Users} title="Tráfego por psicólogo" />
          <RankingList
            destinationLabel="o perfil do psicólogo"
            items={summary.top_psychologists.items}
          />
        </CardShell>
      </div>

      <LocationPanel locations={summary.locations} periodDescription={periodDescription} />
    </div>
  );
};
