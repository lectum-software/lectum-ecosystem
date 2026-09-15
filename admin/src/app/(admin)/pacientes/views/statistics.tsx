"use client";

import { Activity, MapPin, Smartphone, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import type { AdminPatientsDashboard, PatientsDashboardIntentFilterId } from "@/api/req/patients";
import { BreakdownDonutChart, DeviceUsageDonutChart } from "../components/donut-charts";
import { AnonymousConversionCard } from "../components/intent-analysis";
import { LocationOverview } from "../components/location-map";
import {
  CardShell,
  IntentFilterSelect,
  PanelTitle,
  PlatformPagesTitleSelect,
} from "../components/metric-cards";
import { MiniBar } from "../components/timeline-donuts";
import {
  CHART_COLORS,
  DEFAULT_PATIENTS_STATISTICS_INTENT_FILTERS,
  formatDaysMetric,
  formatDecimalMetric,
  formatNullablePercentage,
  formatPercentageValue,
  formatSecondsMetric,
  formatSelectedPeriod,
  GENDER_CHART_COLORS,
  numberFormatter,
  type PatientsStatisticsIntentFilterKey,
  type PatientsStatisticsIntentFilters,
  type PlatformPagesView,
  SIGNUP_SOURCE_CHART_COLORS,
} from "../modules/dashboard-support";

export const Statistics = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const [intentFilters, setIntentFilters] = useState<PatientsStatisticsIntentFilters>(
    DEFAULT_PATIENTS_STATISTICS_INTENT_FILTERS,
  );
  const getFilteredMetrics = (filterId: PatientsDashboardIntentFilterId) =>
    summary.intent_filters.breakdowns[filterId] ??
    summary.intent_filters.breakdowns[summary.intent_filters.default_filter];
  const setIntentFilter =
    (key: PatientsStatisticsIntentFilterKey) => (value: PatientsDashboardIntentFilterId) => {
      setIntentFilters((current) => ({ ...current, [key]: value }));
    };
  const genderMetrics = getFilteredMetrics(intentFilters.gender).demographics.gender;
  const signupSourceMetrics = getFilteredMetrics(intentFilters.signupSources).demographics
    .signup_sources;
  const deviceUsage = getFilteredMetrics(intentFilters.deviceUsage).device_usage;
  const platformUsage = getFilteredMetrics(intentFilters.platformUsage).platform_usage;
  const locations = getFilteredMetrics(intentFilters.locations).locations;

  return (
    <section aria-label="Estatísticas agregadas de pacientes">
      <div className="grid gap-4 xl:grid-cols-3">
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-gender-intent-filter"
                onChange={setIntentFilter("gender")}
                options={summary.intent_filters.options}
                value={intentFilters.gender}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={UserRound}
            title="Gênero"
          />
          <BreakdownDonutChart
            colorForItem={(item, index) =>
              GENDER_CHART_COLORS[item.id] ?? CHART_COLORS[index % CHART_COLORS.length]
            }
            countLabel="paciente(s)"
            emptyMessage="Sem dados de gênero disponíveis para pacientes."
            items={genderMetrics.items}
            total={genderMetrics.total}
          />
        </CardShell>
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-signup-source-intent-filter"
                onChange={setIntentFilter("signupSources")}
                options={summary.intent_filters.options}
                value={intentFilters.signupSources}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={UserPlus}
            title="Forma de cadastro"
          />
          <BreakdownDonutChart
            colorForItem={(item, index) =>
              SIGNUP_SOURCE_CHART_COLORS[item.id] ?? CHART_COLORS[index % CHART_COLORS.length]
            }
            emptyMessage="Sem dados de forma de cadastro disponíveis para pacientes."
            items={signupSourceMetrics.items}
            total={signupSourceMetrics.total}
          />
        </CardShell>
        <DeviceUsageCard
          deviceUsage={deviceUsage}
          intentFilter={intentFilters.deviceUsage}
          onIntentFilterChange={setIntentFilter("deviceUsage")}
          period={summary.period}
          summary={summary}
        />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CardShell className="p-5">
          <PanelTitle
            action={
              <IntentFilterSelect
                id="patients-location-intent-filter"
                onChange={setIntentFilter("locations")}
                options={summary.intent_filters.options}
                value={intentFilters.locations}
              />
            }
            description={formatSelectedPeriod(summary.period)}
            icon={MapPin}
            title="Localização"
          />
          <LocationOverview locations={locations} />
        </CardShell>
        <div className="order-2 min-w-0 xl:order-3 xl:col-span-2">
          <AnonymousConversionCard summary={summary} />
        </div>
        <div className="order-3 min-w-0 xl:order-2">
          <PlatformUsageCard
            intentFilter={intentFilters.platformUsage}
            onIntentFilterChange={setIntentFilter("platformUsage")}
            platformUsage={platformUsage}
            summary={summary}
          />
        </div>
      </div>
    </section>
  );
};

export const DeviceUsageCard = ({
  deviceUsage,
  intentFilter,
  onIntentFilterChange,
  period,
  summary,
}: {
  deviceUsage: AdminPatientsDashboard["device_usage"];
  intentFilter: PatientsDashboardIntentFilterId;
  onIntentFilterChange: (value: PatientsDashboardIntentFilterId) => void;
  period: AdminPatientsDashboard["period"];
  summary: AdminPatientsDashboard;
}) => {
  return (
    <CardShell className="p-5">
      <PanelTitle
        action={
          <IntentFilterSelect
            id="patients-device-intent-filter"
            onChange={onIntentFilterChange}
            options={summary.intent_filters.options}
            value={intentFilter}
          />
        }
        description={formatSelectedPeriod(period)}
        icon={Smartphone}
        title="Devices e sistemas"
      />
      <DeviceUsageDonutChart deviceUsage={deviceUsage} />
    </CardShell>
  );
};

export const PlatformUsageCard = ({
  intentFilter,
  onIntentFilterChange,
  platformUsage,
  summary,
}: {
  intentFilter: PatientsDashboardIntentFilterId;
  onIntentFilterChange: (value: PatientsDashboardIntentFilterId) => void;
  platformUsage: AdminPatientsDashboard["platform_usage"];
  summary: AdminPatientsDashboard;
}) => {
  const [platformPagesView, setPlatformPagesView] = useState<PlatformPagesView>("accesses");
  const platformDurationPages = platformUsage.top_pages_by_average_duration;
  const platformMaxAverageDuration = Math.max(
    0,
    ...platformDurationPages.map((page) => page.average_duration_seconds),
  );

  return (
    <CardShell className="p-5">
      <PanelTitle
        action={
          <IntentFilterSelect
            id="patients-platform-usage-intent-filter"
            onChange={onIntentFilterChange}
            options={summary.intent_filters.options}
            value={intentFilter}
          />
        }
        description={formatSelectedPeriod(summary.period)}
        icon={Activity}
        title="Uso da plataforma"
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Ativos", numberFormatter.format(platformUsage.active_patients_count)],
          ["Taxa ativa", formatNullablePercentage(platformUsage.active_patients_rate)],
          ["PWA instalado", formatNullablePercentage(platformUsage.pwa_installed_patients_rate)],
          ["Dias médios", formatDaysMetric(platformUsage.average_access_days)],
          ["Sessões médias", formatDecimalMetric(platformUsage.average_sessions)],
          ["Tempo médio", formatSecondsMetric(platformUsage.average_duration_seconds)],
        ].map(([label, value]) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-lg font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>
      {platformUsage.duration_unavailable_reason ? (
        <p className="mt-3 text-xs font-bold text-subtle">
          {platformUsage.duration_unavailable_reason}
        </p>
      ) : null}
      {platformUsage.unavailable_reason ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
          {platformUsage.unavailable_reason}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <PlatformPagesTitleSelect
              id="patients-platform-pages-view"
              onChange={setPlatformPagesView}
              value={platformPagesView}
            />
            <p className="text-[0.68rem] font-bold leading-4 text-subtle sm:text-right">
              {platformPagesView === "accesses"
                ? "Ranking por quantidade de visualizações."
                : "Ranking por tempo médio; acessos aparecem como contexto."}
            </p>
          </div>
          {platformPagesView === "accesses" ? (
            platformUsage.top_pages.map((page) => (
              <MiniBar
                key={page.label}
                label={page.label}
                percentage={page.percentage}
                value={`${numberFormatter.format(page.count)} · ${formatPercentageValue(
                  page.percentage,
                )}`}
              />
            ))
          ) : platformDurationPages.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
              Sem páginas com duração confiável para calcular tempo médio no período.
            </p>
          ) : (
            platformDurationPages.map((page) => (
              <MiniBar
                key={page.label}
                label={page.label}
                percentage={
                  platformMaxAverageDuration > 0
                    ? (page.average_duration_seconds / platformMaxAverageDuration) * 100
                    : 0
                }
                value={`${formatSecondsMetric(page.average_duration_seconds)} méd. · ${numberFormatter.format(
                  page.count,
                )} acessos`}
              />
            ))
          )}
        </div>
      )}
    </CardShell>
  );
};
