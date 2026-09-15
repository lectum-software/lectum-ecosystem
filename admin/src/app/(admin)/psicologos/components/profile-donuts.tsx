"use client";

import { CircleHelp } from "lucide-react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { buildDonutCircleSegments } from "@/lib/chart-geometry";

import {
  calculatePercentage,
  formatPercentageValue,
  numberFormatter,
  type PsychologistsDonutChartItem,
} from "../modules/dashboard-support";

import {
  PROFILE_ACTIVITY_CHART_COLORS,
  PROFILE_CONVERSION_CHART_COLORS,
  PROFILE_CONVERSION_GOAL_CHART_COLORS,
  PROFILE_COVERAGE_CHART_COLORS,
  PROFILE_ENGAGEMENT_CATEGORY_OPTIONS,
  PROFILE_EXPOSURE_COMMUNITY_CATEGORY_OPTIONS,
  PROFILE_EXPOSURE_VIDEO_CATEGORY_OPTIONS,
  PROFILE_FAVORITES_CATEGORY_OPTIONS,
} from "./metric-cards";

export const PsychologistsDonutChart = ({
  ariaLabel,
  emptyMessage,
  items,
  showDescriptionTooltips = true,
  total,
}: {
  ariaLabel: string;
  emptyMessage: string;
  items: PsychologistsDonutChartItem[];
  showDescriptionTooltips?: boolean;
  total: number;
}) => {
  const radius = 42;
  const { circumference, segments, visibleItems } = buildDonutCircleSegments(items, total, radius);

  if (items.length === 0 || visibleItems.length === 0 || total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <figure className="relative z-10 mt-5 overflow-visible">
      <div className="grid min-w-0 gap-4">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-full max-w-[9.75rem] min-w-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
            strokeWidth="18"
          />
          {segments.map(({ dash, item, strokeDashoffset }) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.id}
              r={radius}
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          ))}
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x="60"
            y="58"
          >
            {numberFormatter.format(total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x="60"
            y="72"
          >
            total
          </text>
        </svg>

        <div className="min-w-0 space-y-2.5">
          {items.map((item) => (
            <div
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
              key={item.id}
            >
              <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-foreground">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 break-words">{item.label}</span>
                {showDescriptionTooltips && item.description ? (
                  <button
                    aria-label={`${item.label}: ${item.description}`}
                    className="group/legend-tooltip relative mt-0.5 inline-flex shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    type="button"
                  >
                    <CircleHelp aria-hidden className="h-3.5 w-3.5 text-muted" />
                    <span
                      className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 text-left text-xs font-medium leading-5 text-foreground shadow-admin-soft group-hover/legend-tooltip:block group-focus/legend-tooltip:block group-focus-within/legend-tooltip:block sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                      role="tooltip"
                    >
                      {item.description}
                    </span>
                  </button>
                ) : null}
              </span>
              <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                {numberFormatter.format(item.count)}{" "}
                <span className="text-xs font-medium text-muted">
                  ({formatPercentageValue(item.percentage)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        {items
          .map(
            (item) =>
              `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
                item.percentage,
              )})`,
          )
          .join("; ")}
      </figcaption>
    </figure>
  );
};

export const buildProfileExposureSurfaceDonutItems = (
  profileExposure: AdminPsychologistsDashboard["profile_exposure"],
  surface: "community" | "video",
): PsychologistsDonutChartItem[] => {
  const total = Math.max(0, profileExposure.totals.psychologists);
  const options =
    surface === "community"
      ? PROFILE_EXPOSURE_COMMUNITY_CATEGORY_OPTIONS
      : PROFILE_EXPOSURE_VIDEO_CATEGORY_OPTIONS;
  const countsById = new Map(options.map((option) => [option.id, 0]));
  const insufficientDataCount =
    profileExposure.categories.find((item) => item.id === "insufficient_data")?.count ?? 0;

  for (const item of profileExposure.categories) {
    if (item.id === "insufficient_data") continue;

    const categoryId = surface === "community" ? item.community_id : item.video_id;
    if (!categoryId) continue;

    countsById.set(categoryId, (countsById.get(categoryId) ?? 0) + item.count);
  }

  return [
    ...options.map((option) => {
      const count = countsById.get(option.id) ?? 0;

      return {
        color: option.color,
        count,
        description: option.description,
        id: option.id,
        label: option.label,
        percentage: calculatePercentage(count, total),
      };
    }),
    {
      color: PROFILE_CONVERSION_CHART_COLORS.insufficient_data,
      count: insufficientDataCount,
      description:
        "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; a visibilidade ainda não é comparada com a plataforma.",
      id: "insufficient_data",
      label: "Dados Insuficientes",
      percentage: calculatePercentage(insufficientDataCount, total),
    },
  ];
};

export const buildProfileEngagementFavoritesAxisDonutItems = (
  profileEngagementFavorites: AdminPsychologistsDashboard["profile_engagement_favorites"],
  axis: "engagement" | "favorites",
): PsychologistsDonutChartItem[] => {
  const total = Math.max(0, profileEngagementFavorites.totals.psychologists);
  const options =
    axis === "engagement"
      ? PROFILE_ENGAGEMENT_CATEGORY_OPTIONS
      : PROFILE_FAVORITES_CATEGORY_OPTIONS;
  const countsById = new Map(options.map((option) => [option.id, 0]));
  const insufficientDataCount =
    profileEngagementFavorites.categories.find((item) => item.id === "insufficient_data")?.count ??
    0;

  for (const item of profileEngagementFavorites.categories) {
    if (item.id === "insufficient_data") continue;

    const categoryId = axis === "engagement" ? item.engagement_id : item.favorites_id;
    if (!categoryId) continue;

    countsById.set(categoryId, (countsById.get(categoryId) ?? 0) + item.count);
  }

  return [
    ...options.map((option) => {
      const count = countsById.get(option.id) ?? 0;

      return {
        color: option.color,
        count,
        description: option.description,
        id: option.id,
        label: option.label,
        percentage: calculatePercentage(count, total),
      };
    }),
    {
      color: PROFILE_CONVERSION_CHART_COLORS.insufficient_data,
      count: insufficientDataCount,
      description:
        "Psicólogo ainda dentro dos primeiros 30 dias de adaptação; engajamento e favoritos ainda não são comparados com a plataforma.",
      id: "insufficient_data",
      label: "Dados Insuficientes",
      percentage: calculatePercentage(insufficientDataCount, total),
    },
  ];
};

export const ProfileActivityDonutChart = ({
  profileActivity,
}: {
  profileActivity: AdminPsychologistsDashboard["profile_activity"];
}) => {
  const total = Math.max(0, profileActivity.totals.psychologists);
  const items = profileActivity.categories.map((item) => ({
    color: PROFILE_ACTIVITY_CHART_COLORS[item.id],
    count: item.count,
    description: item.description,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel = `Gráfico de donut de Atividade dos psicólogos: ${profileActivity.categories
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileActivity.unavailable_reason ??
        "Sem psicólogos ativos no período selecionado para classificar Atividade."
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};

export const ProfileCoverageDonutChart = ({
  profileCoverage,
}: {
  profileCoverage: AdminPsychologistsDashboard["profile_coverage"];
}) => {
  const total = Math.max(0, profileCoverage.totals.psychologists);
  const items = profileCoverage.categories.map((item) => ({
    color: PROFILE_COVERAGE_CHART_COLORS[item.id],
    count: item.count,
    description: item.description,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel = `Gráfico de donut de Cobertura dos psicólogos: ${profileCoverage.categories
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileCoverage.unavailable_reason ??
        "Sem psicólogos ativos no período selecionado para classificar Cobertura."
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};

export const ProfileConversionDonutChart = ({
  profileConversion,
}: {
  profileConversion: AdminPsychologistsDashboard["profile_conversion"];
}) => {
  const total = Math.max(0, profileConversion.totals.psychologists);
  const items = profileConversion.categories.map((item) => ({
    color: PROFILE_CONVERSION_CHART_COLORS[item.id],
    count: item.count,
    description: item.description,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel = `Gráfico de donut de Conversão dos psicólogos: ${profileConversion.categories
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileConversion.unavailable_reason ??
        "Sem psicólogos ativos no período selecionado para classificar Conversão."
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};

export const ProfileConversionGoalDonutChart = ({
  profileConversionGoal,
}: {
  profileConversionGoal: AdminPsychologistsDashboard["profile_conversion_goal"];
}) => {
  const total = Math.max(0, profileConversionGoal.totals.psychologists);
  const items = profileConversionGoal.categories.map((item) => ({
    color: PROFILE_CONVERSION_GOAL_CHART_COLORS[item.id],
    count: item.count,
    description: item.description,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel = `Gráfico de donut de Meta de conversão dos psicólogos: ${profileConversionGoal.categories
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileConversionGoal.unavailable_reason ??
        "Sem psicólogos ativos no período selecionado para classificar Meta de conversão."
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};

export const ProfileExposureSurfaceDonutChart = ({
  profileExposure,
  surface,
}: {
  profileExposure: AdminPsychologistsDashboard["profile_exposure"];
  surface: "community" | "video";
}) => {
  const total = Math.max(0, profileExposure.totals.psychologists);
  const items = buildProfileExposureSurfaceDonutItems(profileExposure, surface);
  const title = surface === "community" ? "Visibilidade na comunidade" : "Vídeo de apresentação";
  const ariaLabel = `Gráfico de donut de ${title} dos psicólogos: ${items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileExposure.unavailable_reason ??
        `Sem psicólogos ativos no período selecionado para classificar ${title}.`
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};

export const formatActivityActionsValue = (value: number) => {
  const label = value === 1 ? "ação" : "ações";

  return `${numberFormatter.format(value)} ${label}`;
};

export const formatPatientPostsAnsweredValue = (value: number) => {
  const label = value === 1 ? "post" : "posts";

  return `${numberFormatter.format(value)} ${label}`;
};

export const formatWhatsappClicksValue = (value: number) => {
  const label = value === 1 ? "clique" : "cliques";

  return `${numberFormatter.format(value)} ${label}`;
};

export const formatCommunityEngagementScoreValue = (value: number) => {
  const label = value === 1 ? "ponto" : "pontos";

  return `${numberFormatter.format(value)} ${label}`;
};

export const formatFavoritesValue = (value: number) => {
  const label = value === 1 ? "favorito" : "favoritos";

  return `${numberFormatter.format(value)} ${label}`;
};

export const formatVisibilityDurationValue = (value: number) => {
  const seconds = Math.max(0, Math.round(value));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${String(minutes).padStart(2, "0")}min` : `${hours}h`;
  }

  if (minutes > 0) {
    return remainder > 0 ? `${minutes}min ${String(remainder).padStart(2, "0")}s` : `${minutes}min`;
  }

  return `${seconds}s`;
};

export const formatProfileConversionStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_conversion"]["benchmark"],
) => {
  const min = benchmark.standard_min_whatsapp_clicks;
  const max = benchmark.standard_max_whatsapp_clicks;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatWhatsappClicksValue(min);

  return `${formatWhatsappClicksValue(min)} a ${formatWhatsappClicksValue(max)}`;
};

export const formatProfileConversionGoalRange = (
  thresholds: AdminPsychologistsDashboard["profile_conversion_goal"]["thresholds"]["absolute"],
) => {
  const minGoal = thresholds.good_whatsapp_clicks_30d;
  const maxGoal = Math.max(minGoal, thresholds.excellent_whatsapp_clicks_30d - 1);

  if (minGoal === maxGoal) return `${numberFormatter.format(minGoal)} em 30 dias`;

  return `Entre ${numberFormatter.format(minGoal)} e ${numberFormatter.format(maxGoal)} em 30 dias`;
};

export const formatProfileActivityStandardRange = (
  thresholds: AdminPsychologistsDashboard["profile_activity"]["thresholds"],
) => {
  const min = thresholds.active_min_actions;
  const max = Math.max(min, thresholds.very_active_min_actions - 1);

  if (min === max) return formatActivityActionsValue(min);

  return `${numberFormatter.format(min)} a ${formatActivityActionsValue(max)}`;
};

export const formatProfileExposureSurfaceStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_exposure"]["benchmark"][
    | "community_visibility"
    | "presentation_video"],
) => {
  const min = benchmark.standard_min_visibility_seconds;
  const max = benchmark.standard_max_visibility_seconds;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatVisibilityDurationValue(min);

  return `${formatVisibilityDurationValue(min)} a ${formatVisibilityDurationValue(max)}`;
};

export const formatProfileEngagementStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_engagement_favorites"]["benchmark"]["community_engagement"],
) => {
  const min = benchmark.standard_min_engagement_score;
  const max = benchmark.standard_max_engagement_score;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatCommunityEngagementScoreValue(min);

  return `${formatCommunityEngagementScoreValue(min)} a ${formatCommunityEngagementScoreValue(max)}`;
};

export const formatProfileFavoritesStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_engagement_favorites"]["benchmark"]["favorites"],
) => {
  const min = benchmark.standard_min_favorites;
  const max = benchmark.standard_max_favorites;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatFavoritesValue(min);

  return `${formatFavoritesValue(min)} a ${formatFavoritesValue(max)}`;
};

export const ProfileEngagementFavoritesAxisDonutChart = ({
  axis,
  profileEngagementFavorites,
}: {
  axis: "engagement" | "favorites";
  profileEngagementFavorites: AdminPsychologistsDashboard["profile_engagement_favorites"];
}) => {
  const total = Math.max(0, profileEngagementFavorites.totals.psychologists);
  const items = buildProfileEngagementFavoritesAxisDonutItems(profileEngagementFavorites, axis);
  const title = axis === "engagement" ? "Engajamento" : "Favoritados";
  const ariaLabel = `Gráfico de donut de ${title} dos psicólogos: ${items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
          item.percentage,
        )})`,
    )
    .join("; ")}.`;

  return (
    <PsychologistsDonutChart
      ariaLabel={ariaLabel}
      emptyMessage={
        profileEngagementFavorites.unavailable_reason ??
        `Sem psicólogos ativos no período selecionado para classificar ${title}.`
      }
      items={items}
      showDescriptionTooltips={false}
      total={total}
    />
  );
};
