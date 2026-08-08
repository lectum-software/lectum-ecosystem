"use client";

import {
  Activity,
  Award,
  type LucideIcon,
  TrendingDown,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardMetric,
} from "@/api/req/psychologists";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

import {
  CARD_ORDER,
  currencyFormatter,
  type DashboardMetricKey,
  formatChange,
  formatDate,
  formatPercentageValue,
  numberFormatter,
  type ProfileActivityCategoryId,
  type ProfileConversionCategoryItem,
  type ProfileConversionGoalCategoryItem,
  type ProfileCoverageCategoryId,
  type ProfileEngagementFavoritesCommunityCategoryId,
  type ProfileEngagementFavoritesFavoriteCategoryId,
  type ProfileExposureCommunityCategoryId,
  type ProfileExposureVideoCategoryId,
  type SignupMethodItem,
  toOneDecimal,
} from "../modules/dashboard-support";

export const CardShell = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

export const hexToRgba = colorWithAlpha;

export const DASHBOARD_METRIC_CONFIG = {
  churn: { color: "var(--admin-danger)", icon: TrendingDown },
  courtesy_psychologists: { color: "var(--admin-chart-accent)", icon: Award },
  free_psychologists: { color: "var(--admin-success)", icon: UsersRound },
  new_signups: { color: "var(--admin-warning)", icon: UserPlus },
  subscriber_psychologists: { color: "var(--admin-primary)", icon: UserCheck },
  total_psychologists: { color: "var(--admin-primary)", icon: UsersRound },
} satisfies Record<DashboardMetricKey, { color: string; icon: LucideIcon }>;

export const PROFILE_CONVERSION_CHART_COLORS = {
  insufficient_data: "var(--admin-subtle)",
  low_conversion: "var(--admin-warning)",
  no_conversion: "var(--admin-danger)",
  standard_conversion: "var(--admin-primary)",
  strong_conversion: "var(--admin-success)",
} satisfies Record<ProfileConversionCategoryItem["id"], string>;

export const PROFILE_CONVERSION_GOAL_CHART_COLORS = {
  excellent_conversion: "var(--admin-success)",
  good_conversion: "var(--admin-primary)",
  insufficient_data: "var(--admin-subtle)",
  low_conversion: "var(--admin-warning)",
} satisfies Record<ProfileConversionGoalCategoryItem["id"], string>;

export const PROFILE_ACTIVITY_CHART_COLORS = {
  ativo: "var(--admin-primary)",
  muito_ativo: "var(--admin-success)",
  pouco_ativo: "var(--admin-warning)",
  sem_base: "var(--admin-muted)",
} satisfies Record<ProfileActivityCategoryId, string>;

export const PROFILE_COVERAGE_CHART_COLORS = {
  above_average_coverage: "var(--admin-success)",
  average_coverage: "var(--admin-primary)",
  below_average_coverage: "var(--admin-warning)",
  no_coverage: "var(--admin-muted)",
} satisfies Record<ProfileCoverageCategoryId, string>;

export const PROFILE_EXPOSURE_CHART_COLORS = {
  high_community: "var(--admin-success)",
  low_community: "var(--admin-warning)",
  no_community: "var(--admin-muted)",
  standard_community: "var(--admin-primary)",
} satisfies Record<ProfileExposureCommunityCategoryId, string>;

export const PROFILE_VIDEO_VISIBILITY_CHART_COLORS = {
  high_video: "var(--admin-success)",
  low_video: "var(--admin-warning)",
  no_video: "var(--admin-muted)",
  standard_video: "var(--admin-primary)",
} satisfies Record<ProfileExposureVideoCategoryId, string>;

export const PROFILE_EXPOSURE_COMMUNITY_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileExposureCommunityCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.high_community,
    description:
      "Psicólogos com atenção acima da faixa padrão em posts e respostas autorais nas comunidades.",
    id: "high_community",
    label: "Alta visibilidade",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.standard_community,
    description:
      "Psicólogos com atenção dentro da faixa padrão em posts e respostas autorais nas comunidades.",
    id: "standard_community",
    label: "Visibilidade padrão",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.low_community,
    description:
      "Psicólogos com atenção abaixo da faixa padrão em posts e respostas autorais nas comunidades.",
    id: "low_community",
    label: "Baixa visibilidade",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.no_community,
    description:
      "Psicólogos sem atenção registrada em conteúdo autoral nas comunidades no período.",
    id: "no_community",
    label: "Sem visibilidade",
  },
];

export const PROFILE_EXPOSURE_VIDEO_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileExposureVideoCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.high_video,
    description: "Psicólogos com tempo assistido acima da faixa padrão no vídeo de apresentação.",
    id: "high_video",
    label: "Alta visibilidade",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.standard_video,
    description: "Psicólogos com tempo assistido dentro da faixa padrão no vídeo de apresentação.",
    id: "standard_video",
    label: "Visibilidade padrão",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.low_video,
    description: "Psicólogos com tempo assistido abaixo da faixa padrão no vídeo de apresentação.",
    id: "low_video",
    label: "Baixa visibilidade",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.no_video,
    description: "Psicólogos sem tempo assistido no vídeo de apresentação no período.",
    id: "no_video",
    label: "Sem visibilidade",
  },
];

export const PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS = {
  high_engagement: "var(--admin-success)",
  low_engagement: "var(--admin-warning)",
  no_engagement: "var(--admin-muted)",
  standard_engagement: "var(--admin-primary)",
} satisfies Record<ProfileEngagementFavoritesCommunityCategoryId, string>;

export const PROFILE_FAVORITES_CHART_COLORS = {
  high_favorites: "var(--admin-success)",
  low_favorites: "var(--admin-warning)",
  no_favorites: "var(--admin-muted)",
  standard_favorites: "var(--admin-primary)",
} satisfies Record<ProfileEngagementFavoritesFavoriteCategoryId, string>;

export const PROFILE_ENGAGEMENT_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileEngagementFavoritesCommunityCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS.high_engagement,
    description: "Score de relacionamento recebido na comunidade acima da faixa padrão.",
    id: "high_engagement",
    label: "Alto Engajamento",
  },
  {
    color: PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS.standard_engagement,
    description: "Score de relacionamento recebido na comunidade dentro da faixa padrão.",
    id: "standard_engagement",
    label: "Engajamento Padrão",
  },
  {
    color: PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS.low_engagement,
    description: "Score de relacionamento recebido na comunidade abaixo da faixa padrão.",
    id: "low_engagement",
    label: "Baixo Engajamento",
  },
  {
    color: PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS.no_engagement,
    description: "Nenhum comentário, voto positivo, salvamento ou compartilhamento recebido.",
    id: "no_engagement",
    label: "Sem Engajamento",
  },
];

export const PROFILE_FAVORITES_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileEngagementFavoritesFavoriteCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_FAVORITES_CHART_COLORS.high_favorites,
    description: "Favoritos recebidos acima da faixa padrão.",
    id: "high_favorites",
    label: "Muito favoritado",
  },
  {
    color: PROFILE_FAVORITES_CHART_COLORS.standard_favorites,
    description: "Favoritos recebidos dentro da faixa padrão.",
    id: "standard_favorites",
    label: "Favoritado padrão",
  },
  {
    color: PROFILE_FAVORITES_CHART_COLORS.low_favorites,
    description: "Favoritos recebidos abaixo da faixa padrão, mas com ao menos um favorito.",
    id: "low_favorites",
    label: "Pouco favoritado",
  },
  {
    color: PROFILE_FAVORITES_CHART_COLORS.no_favorites,
    description: "Nenhum favorito recebido no período.",
    id: "no_favorites",
    label: "Sem favoritos",
  },
];

export const SIGNUP_METHOD_CHART_COLORS = {
  email_password: "var(--admin-success)",
  google: "var(--admin-primary)",
} satisfies Record<SignupMethodItem["id"], string>;

export const RATE_WITH_COUNT_METRICS = [
  "courtesy_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
] as const;

export const shouldShowPlanShareRate = (metric: PsychologistsDashboardMetric) =>
  RATE_WITH_COUNT_METRICS.includes(metric.id as (typeof RATE_WITH_COUNT_METRICS)[number]);

export const getPlanShareRate = (
  metric: PsychologistsDashboardMetric,
  total: number | undefined,
) => {
  if (!shouldShowPlanShareRate(metric)) return null;

  return total && total > 0 ? toOneDecimal((metric.value / total) * 100) : 0;
};

export const getMetricValueParts = (
  metric: PsychologistsDashboardMetric,
  options?: { totalPsychologists?: number },
) => {
  const planShareRate = getPlanShareRate(metric, options?.totalPsychologists);

  if (planShareRate !== null) {
    return {
      main: numberFormatter.format(metric.value),
      rate: `(${formatPercentageValue(planShareRate)})`,
    };
  }

  if (metric.id === "churn" && typeof metric.value_count === "number") {
    return {
      main: numberFormatter.format(metric.value_count),
      rate: `(${formatPercentageValue(metric.value)})`,
    };
  }

  if (metric.unit === "currency_cents") {
    return { main: currencyFormatter.format(metric.value / 100), rate: null };
  }

  if (metric.unit === "percentage") {
    return { main: formatPercentageValue(metric.value), rate: null };
  }

  return { main: numberFormatter.format(metric.value), rate: null };
};

export const TrendBadge = ({ metric }: { metric: PsychologistsDashboardMetric }) => {
  if (metric.unavailable)
    return (
      <span className="whitespace-nowrap text-[0.68rem] font-bold text-warning">Indisponível</span>
    );

  return (
    <span
      className={cn(
        "whitespace-nowrap text-[0.68rem] font-semibold",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-muted",
      )}
    >
      {formatChange(metric.change_percent)}
    </span>
  );
};

export const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
  totalPsychologists,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PsychologistsDashboardMetric;
  onToggle: () => void;
  totalPsychologists?: number;
}) => {
  const valueParts = getMetricValueParts(metric, { totalPsychologists });
  const formattedValue = valueParts.rate
    ? `${valueParts.main} ${valueParts.rate}`
    : valueParts.main;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${metric.label}: ${formattedValue}. ${
        active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p
          className="truncate whitespace-nowrap text-xs font-semibold text-foreground"
          title={metric.label}
        >
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <span className="min-w-0 truncate">{valueParts.main}</span>
          {valueParts.rate ? (
            <span className="shrink-0 text-base font-semibold text-muted xl:text-sm">
              {valueParts.rate}
            </span>
          ) : null}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

export const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`psych-skeleton-${key}`}
      />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Psicólogos"
  />
);

export const EmptyState = ({ period }: { period: AdminPsychologistsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma métrica foi encontrada entre {formatDate(period.from)} e {formatDate(period.to)}.
          Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);
