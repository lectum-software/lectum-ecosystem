"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardBreakdownItem,
  PsychologistsDashboardDailyPoint,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";

import {
  CARD_ORDER,
  CONVERSION_JOURNEY_OPTIONS,
  type ConversionJourney,
  type DashboardMetricKey,
  normalizeFilterOptionKey,
  numberFormatter,
  PLAN_SEGMENT_FILTER_OPTIONS,
  PLATFORM_PAGES_VIEW_OPTIONS,
  type PlanSegmentFilter,
  type PlatformPagesView,
  type ProfileCrossMatrixAxis,
  type ProfileCrossMatrixAxisId,
} from "../modules/dashboard-support";

import { DASHBOARD_METRIC_CONFIG } from "./metric-cards";

export const TimelineChart = ({
  points,
  visibleMetricKeys,
}: {
  points: PsychologistsDashboardDailyPoint[];
  visibleMetricKeys: DashboardMetricKey[];
}) => {
  const width = 1120;
  const height = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const series = visibleMetricKeys.map((key) => ({
    color: DASHBOARD_METRIC_CONFIG[key].color,
    key,
  }));

  if (series.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Selecione pelo menos um contador para visualizar a evolução.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
        Nenhum ponto de evolução foi encontrado para o período.
      </div>
    );
  }

  const chartPoints = aggregateCalendarChartPoints(points, CARD_ORDER, {
    metricAggregations: {
      churn: "last",
      courtesy_psychologists: "last",
      free_psychologists: "last",
      subscriber_psychologists: "last",
      total_psychologists: "last",
    },
  });
  const maxValue = Math.max(
    1,
    ...chartPoints.flatMap((point) => series.map((item) => point[item.key])),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? chartWidth / 2 : (index * chartWidth) / (chartPoints.length - 1));
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <figure className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Gráfico temporal dos contadores de psicólogos"
          className="block h-auto w-full"
          height={height}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
          width={width}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`psych-grid-${value}-${y}`}>
                <line
                  opacity="0.58"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="var(--admin-muted)" fontSize="11" fontWeight="500" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {series.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: getX(index),
              y: getY(point[item.key]),
            }));
            const path = buildSmoothSvgPath(linePoints);

            return (
              <g key={item.key}>
                <path
                  d={path}
                  fill="none"
                  opacity="0.88"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.05"
                />
                {linePoints.map((point, index) => (
                  <circle
                    cx={point.x}
                    cy={point.y}
                    fill="var(--admin-surface)"
                    key={`${item.key}-${chartPoints[index].date}`}
                    opacity={index === linePoints.length - 1 ? "1" : "0.72"}
                    r={index === linePoints.length - 1 ? "3.1" : "2.1"}
                    stroke={item.color}
                    strokeWidth="1.45"
                  />
                ))}
              </g>
            );
          })}
        </svg>
        <div
          className="mt-1 grid gap-1"
          style={{ gridTemplateColumns: `repeat(${dateLabels.length}, 1fr)` }}
        >
          {dateLabels.map(({ date, label }) => (
            <span className="min-w-0 text-center text-[10px] font-bold text-subtle" key={date}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
};

export const PanelTitle = ({
  description,
  icon: Icon,
  title,
}: {
  description?: string;
  icon: LucideIcon;
  title: ReactNode;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
  </div>
);

export const PlanSegmentSelect = ({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: PlanSegmentFilter) => void;
  value: PlanSegmentFilter;
}) => (
  <label className="block" htmlFor={id}>
    <span className="sr-only">Filtrar por plano do psicólogo</span>
    <span className="relative block">
      <select
        className="h-10 w-full min-w-[9.25rem] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as PlanSegmentFilter)}
        value={value}
      >
        {PLAN_SEGMENT_FILTER_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

export const ConversionJourneyTitleSelect = ({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: ConversionJourney) => void;
  value: ConversionJourney;
}) => (
  <label className="inline-flex max-w-full" htmlFor={id}>
    <span className="sr-only">Selecionar trilha de conversão</span>
    <span className="relative inline-flex max-w-full items-center">
      <select
        className="max-w-full appearance-none truncate rounded-control bg-transparent py-0 pl-0 pr-7 text-left text-lg font-semibold text-foreground outline-none transition hover:text-primary focus:text-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as ConversionJourney)}
        value={value}
      >
        {CONVERSION_JOURNEY_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
      />
    </span>
  </label>
);

export const ProfileCrossMatrixAxisSelect = ({
  axes,
  id,
  label,
  onChange,
  value,
}: {
  axes: ProfileCrossMatrixAxis[];
  id: string;
  label: string;
  onChange: (value: ProfileCrossMatrixAxisId) => void;
  value: ProfileCrossMatrixAxisId;
}) => (
  <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[14rem]" htmlFor={id}>
    <span className="text-[0.58rem] font-bold uppercase tracking-[0.12em] text-subtle">
      {label}
    </span>
    <span className="relative inline-flex max-w-full items-center rounded-xl border border-border/70 bg-surface px-2.5 py-1.5">
      <select
        className="w-full appearance-none truncate bg-transparent py-0 pl-0 pr-6 text-left text-sm font-semibold text-foreground outline-none transition hover:text-primary focus:text-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as ProfileCrossMatrixAxisId)}
        value={value}
      >
        {axes.map((axis) => (
          <option key={axis.id} value={axis.id}>
            {axis.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-1 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle"
      />
    </span>
  </label>
);

export const PlatformPagesTitleSelect = ({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: PlatformPagesView) => void;
  value: PlatformPagesView;
}) => (
  <label className="inline-flex max-w-full" htmlFor={id}>
    <span className="sr-only">Selecionar ranking de páginas por acessos ou tempo médio</span>
    <span className="relative inline-flex max-w-full items-center">
      <select
        className="max-w-full appearance-none truncate rounded-control bg-transparent py-0 pl-0 pr-7 text-left text-sm font-black text-foreground outline-none transition hover:text-primary focus:text-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as PlatformPagesView)}
        value={value}
      >
        {PLATFORM_PAGES_VIEW_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
      />
    </span>
  </label>
);

export const getPlanSegmentSummary = (
  summary: AdminPsychologistsDashboard,
  segment: PlanSegmentFilter,
) =>
  summary.plan_segments?.[segment] ?? {
    device_usage: summary.device_usage,
    id: "all" as const,
    label: "Todos",
    platform_usage: summary.platform_usage,
    pre_signup_conversion: summary.pre_signup_conversion,
    psychologists_count: summary.cards.total_psychologists.value,
    signup_method: summary.signup_method,
    statistics: summary.statistics,
    profile_activity: summary.profile_activity,
    profile_coverage: summary.profile_coverage,
    profile_conversion_activity: summary.profile_conversion_activity,
    profile_conversion_behavior: summary.profile_conversion_behavior,
    profile_conversion_goal: summary.profile_conversion_goal,
    profile_cross_matrix: summary.profile_cross_matrix,
    profile_conversion: summary.profile_conversion,
    profile_engagement_favorites: summary.profile_engagement_favorites,
    profile_conversion_engagement: summary.profile_conversion_engagement,
    profile_conversion_engagement_favorites: summary.profile_conversion_engagement_favorites,
    profile_conversion_visibility: summary.profile_conversion_visibility,
    profile_exposure: summary.profile_exposure,
    traffic_sources: summary.traffic_sources,
  };

export const formatComparisonNumber = (value: number) =>
  value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });

export const normalizeComparisonLabel = normalizeFilterOptionKey;

export const findSupplyItem = (
  demandItem: PsychologistsDashboardBreakdownItem,
  supplyItems: PsychologistsDashboardBreakdownItem[],
) => {
  const demandId = normalizeComparisonLabel(demandItem.id);
  const demandLabel = normalizeComparisonLabel(demandItem.label);

  return (
    supplyItems.find((supplyItem) => {
      const supplyId = normalizeComparisonLabel(supplyItem.id);
      const supplyLabel = normalizeComparisonLabel(supplyItem.label);

      return supplyId === demandId || supplyLabel === demandLabel;
    }) ?? {
      count: 0,
      id: `empty-${demandItem.id}`,
      label: demandItem.label,
      percentage: 0,
    }
  );
};
