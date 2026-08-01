"use client";

import {
  Activity,
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Funnel,
  type LucideIcon,
  MessageCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  UsersRound,
} from "lucide-react";
import {
  type FocusEvent,
  Fragment,
  type ReactNode,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAdminPsychologistsDashboard } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistsDashboard,
  PsychologistsDashboardBreakdownItem,
  PsychologistsDashboardDailyPoint,
  PsychologistsDashboardMetric,
  PsychologistsDashboardPlanSegment,
  PsychologistsDashboardQuery,
} from "@/api/req/psychologists";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const CARD_ORDER = [
  "total_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
  "courtesy_psychologists",
  "new_signups",
  "churn",
] as const;

type DashboardMetricKey = (typeof CARD_ORDER)[number];
type DashboardPeriodValue = NonNullable<PsychologistsDashboardQuery["period"]>;
type DashboardPeriodPreset = Exclude<DashboardPeriodValue, "custom">;
type DashboardRange = Pick<PsychologistsDashboardQuery, "from" | "to">;
type DeviceUsageItem = AdminPsychologistsDashboard["device_usage"]["items"][number];
type ProfileActivityCategoryItem =
  AdminPsychologistsDashboard["profile_activity"]["categories"][number];
type ProfileActivityCategoryId = ProfileActivityCategoryItem["id"];
type ProfileConversionCategoryItem =
  AdminPsychologistsDashboard["profile_conversion"]["categories"][number];
type ProfileExposureCategoryItem =
  AdminPsychologistsDashboard["profile_exposure"]["categories"][number];
type ProfileExposureCommunityCategoryId = NonNullable<ProfileExposureCategoryItem["community_id"]>;
type ProfileExposureVideoCategoryId = NonNullable<ProfileExposureCategoryItem["video_id"]>;
type ProfileEngagementFavoritesCategoryItem =
  AdminPsychologistsDashboard["profile_engagement_favorites"]["categories"][number];
type ProfileEngagementFavoritesCommunityCategoryId = NonNullable<
  ProfileEngagementFavoritesCategoryItem["engagement_id"]
>;
type ProfileEngagementFavoritesFavoriteCategoryId = NonNullable<
  ProfileEngagementFavoritesCategoryItem["favorites_id"]
>;
type ProfileConversionBehaviorResults = AdminPsychologistsDashboard["profile_conversion_behavior"];
type ProfileConversionBehaviorCell = ProfileConversionBehaviorResults["cells"][number];
type ProfileConversionBehaviorMetric = ProfileConversionBehaviorCell["metrics"][number];
type ProfileCrossMatrixResults = AdminPsychologistsDashboard["profile_cross_matrix"];
type ProfileCrossMatrixAxisId = ProfileCrossMatrixResults["default_row_axis_id"];
type ProfileCrossMatrixAxis = ProfileCrossMatrixResults["axes"][number];
type ProfileCrossMatrixCategory = ProfileCrossMatrixAxis["categories"][number];
type ProfileCrossMatrix = ProfileCrossMatrixResults["matrices"][number];
type ProfileCrossMatrixQuadrant = ProfileCrossMatrix["quadrants"][number];
type PsychologistsDonutChartItem = {
  color: string;
  count: number;
  description?: string;
  id: string;
  label: string;
  percentage: number;
};
type PlanSegmentFilter = PsychologistsDashboardPlanSegment;
type SignupMethodItem = AdminPsychologistsDashboard["signup_method"]["items"][number];
type SupplyDemandSortKey = "psychologists" | "searches" | "searches_per_psychologist";
type ConversionJourney = "registration" | "subscription";
type PlatformPagesView = "accesses" | "average_duration";
type TrafficSourceItem = AdminPsychologistsDashboard["traffic_sources"]["sources"][number];
type CommunityTrafficSourceId = Extract<
  TrafficSourceItem["id"],
  | "community_post_text"
  | "community_post_video"
  | "community_reply_text"
  | "community_reply_video"
  | "community_top_mentors"
>;
type PresentationVideoTrafficSourceId = Extract<
  TrafficSourceItem["id"],
  "explore" | "search_filters"
>;
type TrafficSourceGroupId = "communities_group" | "presentation_video_group" | "profile_group";
type TrafficSourceGroupKind = "communities" | "presentation_video" | "profile";
type TrafficSourceDisplayItem = Omit<TrafficSourceItem, "id"> & {
  children?: TrafficSourceItem[];
  groupKind?: TrafficSourceGroupKind;
  id: TrafficSourceItem["id"] | TrafficSourceGroupId;
  isExpandableGroup?: boolean;
};

const PLAN_SEGMENT_FILTER_OPTIONS: { id: PlanSegmentFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "subscribers", label: "Assinantes" },
  { id: "free", label: "Gratuitos" },
  { id: "courtesy", label: "Cortesia" },
];

const SUPPLY_DEMAND_SORT_OPTIONS: { id: SupplyDemandSortKey; label: string }[] = [
  { id: "searches", label: "Mais buscas" },
  { id: "psychologists", label: "Mais psicólogos" },
  { id: "searches_per_psychologist", label: "Mais buscas por psicólogo" },
];

const CONVERSION_JOURNEY_OPTIONS: { id: ConversionJourney; label: string }[] = [
  { id: "subscription", label: "Conversão do cadastro até assinatura" },
  { id: "registration", label: "Conversão até o cadastro" },
];

const PLATFORM_PAGES_VIEW_OPTIONS: { id: PlatformPagesView; label: string }[] = [
  { id: "accesses", label: "Páginas mais acessadas" },
  { id: "average_duration", label: "Páginas com maior tempo médio" },
];

const COMMUNITY_TRAFFIC_SOURCE_IDS = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
  "community_top_mentors",
] as const satisfies readonly CommunityTrafficSourceId[];
const COMMUNITY_TRAFFIC_SOURCE_ID_SET = new Set<TrafficSourceItem["id"]>(
  COMMUNITY_TRAFFIC_SOURCE_IDS,
);
const COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS = {
  community_post_text: "Posts sem vídeo",
  community_post_video: "Posts com vídeo",
  community_reply_text: "Respostas sem vídeo",
  community_reply_video: "Respostas com vídeo",
  community_top_mentors: "Ranking Top Mentores",
} satisfies Record<CommunityTrafficSourceId, string>;
const PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS = [
  "explore",
  "search_filters",
] as const satisfies readonly PresentationVideoTrafficSourceId[];
const PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET = new Set<TrafficSourceItem["id"]>(
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS,
);

const toOneDecimal = (value: number) => Math.round(value * 10) / 10;

const normalizeFilterOptionKey = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

const DASHBOARD_PERIOD_OPTIONS: { id: DashboardPeriodPreset; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "year", label: "Este ano" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "90d", label: "Últimos 90 dias" },
  { id: "all", label: "Todo o período" },
];

const numberFormatter = new Intl.NumberFormat("pt-BR");
const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

const startOfLastDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));

  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

const startOfCurrentYear = () => new Date(new Date().getFullYear(), 0, 1);

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getDashboardRangeForPeriod = (period: DashboardPeriodPreset): DashboardRange => {
  const today = toInputDate(new Date());

  if (period === "today") return { from: today, to: today };
  if (period === "all") return { from: "", to: today };
  if (period === "7d") return { from: toInputDate(startOfLastDays(7)), to: today };
  if (period === "30d") return { from: toInputDate(startOfLastDays(30)), to: today };
  if (period === "90d") return { from: toInputDate(startOfLastDays(90)), to: today };
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };
  if (period === "year") return { from: toInputDate(startOfCurrentYear()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const buildDashboardPeriodQuery = (
  period: DashboardPeriodValue,
  range: DashboardRange,
): PsychologistsDashboardQuery =>
  period === "custom" ? { from: range.from, period, to: range.to } : { period };

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatSelectedPeriod = (period: AdminPsychologistsDashboard["period"]) => {
  if (!period.from || !period.to) return period.label;

  return `${period.label} · ${formatDate(period.from)} a ${formatDate(period.to)}`;
};

const getDashboardPeriodLabel = (period: DashboardPeriodValue) => {
  if (period === "custom") return "Personalizado";

  return DASHBOARD_PERIOD_OPTIONS.find((option) => option.id === period)?.label ?? "Todo o período";
};

const formatDraftSelectedPeriod = (period: DashboardPeriodValue, range: DashboardRange) => {
  const label = getDashboardPeriodLabel(period);

  if (!range.from || !range.to) return label;

  return `${label} · ${formatDate(range.from)} a ${formatDate(range.to)}`;
};

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatPercentageValue = (value: number) => `${numberFormatter.format(value)}%`;

const calculatePercentage = (value: number, total: number) =>
  total > 0 ? toOneDecimal((Math.max(0, value) / total) * 100) : 0;

const formatNullablePercentage = (value: number | null) =>
  typeof value === "number" ? formatPercentageValue(value) : "Indisponível";

const formatDaysMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";
  if (value === 0) return "Mesmo dia";

  return `${numberFormatter.format(value)} dias`;
};

const formatDecimalMetric = (value: number | null) =>
  typeof value === "number" ? numberFormatter.format(value) : "Indisponível";

const formatSecondsMetric = (value: number | null) => {
  if (typeof value !== "number") return "Indisponível";

  const seconds = Math.round(value);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes <= 0) return `${seconds}s`;

  return `${minutes}min ${String(remainder).padStart(2, "0")}s`;
};

const formatNullableCount = (value: number | null) =>
  numberFormatter.format(typeof value === "number" ? value : 0);

const isValidRange = (range: DashboardRange, period: DashboardPeriodValue) => {
  if (period !== "custom") return true;
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const hasDashboardRecords = (summary: AdminPsychologistsDashboard) => {
  const cardsHaveData = Object.values(summary.cards).some((metric) => metric.value > 0);
  const timelineHasData = summary.timeline.points.some(
    (point) =>
      point.total_psychologists > 0 ||
      point.free_psychologists > 0 ||
      point.subscriber_psychologists > 0 ||
      point.courtesy_psychologists > 0 ||
      point.new_signups > 0 ||
      point.churn > 0,
  );

  return cardsHaveData || timelineHasData;
};

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const hexToRgba = (hex: string | null | undefined, alpha: number) => {
  const normalized = typeof hex === "string" ? hex.replace("#", "") : "";
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return `rgba(100, 116, 139, ${alpha})`;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const DASHBOARD_METRIC_CONFIG = {
  churn: { color: "#e5484d", icon: TrendingDown },
  courtesy_psychologists: { color: "#8b5cf6", icon: Award },
  free_psychologists: { color: "#13a85b", icon: UsersRound },
  new_signups: { color: "#f59f00", icon: UserPlus },
  subscriber_psychologists: { color: "#5d9df6", icon: UserCheck },
  total_psychologists: { color: "#308ce8", icon: UsersRound },
} satisfies Record<DashboardMetricKey, { color: string; icon: LucideIcon }>;

const PROFILE_CONVERSION_CHART_COLORS = {
  insufficient_data: "#94a3b8",
  low_conversion: "#f59f00",
  no_conversion: "#ef4444",
  standard_conversion: "#308ce8",
  strong_conversion: "#13a85b",
} satisfies Record<ProfileConversionCategoryItem["id"], string>;

const PROFILE_ACTIVITY_CHART_COLORS = {
  ativo: "#308ce8",
  muito_ativo: "#13a85b",
  pouco_ativo: "#f59f00",
  sem_base: "#64748b",
} satisfies Record<ProfileActivityCategoryId, string>;

const PROFILE_EXPOSURE_CHART_COLORS = {
  high_community: "#13a85b",
  low_community: "#f59f00",
  no_community: "#64748b",
  standard_community: "#308ce8",
} satisfies Record<ProfileExposureCommunityCategoryId, string>;
const PROFILE_VIDEO_VISIBILITY_CHART_COLORS = {
  high_video: "#13a85b",
  low_video: "#f59f00",
  no_video: "#64748b",
  standard_video: "#308ce8",
} satisfies Record<ProfileExposureVideoCategoryId, string>;

const PROFILE_EXPOSURE_COMMUNITY_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileExposureCommunityCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.high_community,
    description: "Atenção em conteúdo autoral nas comunidades acima da faixa padrão.",
    id: "high_community",
    label: "Alta Comunidade",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.standard_community,
    description: "Atenção em conteúdo autoral nas comunidades dentro da faixa padrão.",
    id: "standard_community",
    label: "Comunidade Padrão",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.low_community,
    description: "Atenção em conteúdo autoral nas comunidades abaixo da faixa padrão.",
    id: "low_community",
    label: "Baixa Comunidade",
  },
  {
    color: PROFILE_EXPOSURE_CHART_COLORS.no_community,
    description: "Nenhuma atenção registrada em conteúdo autoral nas comunidades.",
    id: "no_community",
    label: "Sem Comunidade",
  },
];

const PROFILE_EXPOSURE_VIDEO_CATEGORY_OPTIONS: Array<{
  color: string;
  description: string;
  id: ProfileExposureVideoCategoryId;
  label: string;
}> = [
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.high_video,
    description: "Tempo assistido no vídeo de apresentação acima da faixa padrão.",
    id: "high_video",
    label: "Alto Vídeo",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.standard_video,
    description: "Tempo assistido no vídeo de apresentação dentro da faixa padrão.",
    id: "standard_video",
    label: "Vídeo Padrão",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.low_video,
    description: "Tempo assistido no vídeo de apresentação abaixo da faixa padrão.",
    id: "low_video",
    label: "Baixo Vídeo",
  },
  {
    color: PROFILE_VIDEO_VISIBILITY_CHART_COLORS.no_video,
    description: "Nenhum tempo assistido no vídeo de apresentação no período.",
    id: "no_video",
    label: "Vídeo sem view",
  },
];

const PROFILE_ENGAGEMENT_FAVORITES_CHART_COLORS = {
  high_engagement: "#13a85b",
  low_engagement: "#f59f00",
  no_engagement: "#64748b",
  standard_engagement: "#308ce8",
} satisfies Record<ProfileEngagementFavoritesCommunityCategoryId, string>;
const PROFILE_FAVORITES_CHART_COLORS = {
  high_favorites: "#13a85b",
  low_favorites: "#f59f00",
  no_favorites: "#64748b",
  standard_favorites: "#308ce8",
} satisfies Record<ProfileEngagementFavoritesFavoriteCategoryId, string>;

const PROFILE_ENGAGEMENT_CATEGORY_OPTIONS: Array<{
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

const PROFILE_FAVORITES_CATEGORY_OPTIONS: Array<{
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

const SIGNUP_METHOD_CHART_COLORS = {
  email_password: "#13a85b",
  google: "#308ce8",
} satisfies Record<SignupMethodItem["id"], string>;

const RATE_WITH_COUNT_METRICS = [
  "courtesy_psychologists",
  "free_psychologists",
  "subscriber_psychologists",
] as const;

const shouldShowPlanShareRate = (metric: PsychologistsDashboardMetric) =>
  RATE_WITH_COUNT_METRICS.includes(metric.id as (typeof RATE_WITH_COUNT_METRICS)[number]);

const getPlanShareRate = (metric: PsychologistsDashboardMetric, total: number | undefined) => {
  if (!shouldShowPlanShareRate(metric)) return null;

  return total && total > 0 ? toOneDecimal((metric.value / total) * 100) : 0;
};

const getMetricValueParts = (
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

const TrendBadge = ({ metric }: { metric: PsychologistsDashboardMetric }) => {
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

const MetricCard = ({
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

const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`psych-skeleton-${key}`}
      />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar Psicólogos</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = ({ period }: { period: AdminPsychologistsDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma métrica real foi encontrada entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);

const TimelineChart = ({
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
        Nenhum ponto real de evolução foi encontrado para o período.
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

const PanelTitle = ({
  description,
  icon: Icon,
  source,
  title,
}: {
  description?: string;
  icon: LucideIcon;
  source?: string;
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
    {source ? (
      <span className="w-fit rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        {source}
      </span>
    ) : null}
  </div>
);

const PlanSegmentSelect = ({
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

const ConversionJourneyTitleSelect = ({
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

const ProfileCrossMatrixAxisSelect = ({
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
  <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[18rem]" htmlFor={id}>
    <span className="text-[0.62rem] font-black uppercase tracking-[0.14em] text-subtle">
      {label}
    </span>
    <span className="relative inline-flex max-w-full items-center rounded-2xl border border-border bg-surface-muted px-3 py-2">
      <select
        className="w-full appearance-none truncate bg-transparent py-0 pl-0 pr-7 text-left text-sm font-black text-foreground outline-none transition hover:text-primary focus:text-primary focus:ring-2 focus:ring-primary/20"
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
        className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
      />
    </span>
  </label>
);

const PlatformPagesTitleSelect = ({
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

const getPlanSegmentSummary = (summary: AdminPsychologistsDashboard, segment: PlanSegmentFilter) =>
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
    profile_conversion_activity: summary.profile_conversion_activity,
    profile_conversion_behavior: summary.profile_conversion_behavior,
    profile_cross_matrix: summary.profile_cross_matrix,
    profile_conversion: summary.profile_conversion,
    profile_engagement_favorites: summary.profile_engagement_favorites,
    profile_conversion_engagement: summary.profile_conversion_engagement,
    profile_conversion_engagement_favorites: summary.profile_conversion_engagement_favorites,
    profile_conversion_visibility: summary.profile_conversion_visibility,
    profile_exposure: summary.profile_exposure,
    traffic_sources: summary.traffic_sources,
  };

const formatComparisonNumber = (value: number) =>
  value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
  });

const normalizeComparisonLabel = normalizeFilterOptionKey;

const findSupplyItem = (
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

type SupplyDemandDimensionConfig = {
  demand: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
  icon: LucideIcon;
  id: string;
  label: string;
  supply: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
};

type SupplyDemandComparisonRow = {
  id: string;
  label: string;
  psychologistsCount: number;
  psychologistsPercentage: number;
  searchesPerPsychologist: number | null;
  searchesCount: number;
  searchesPercentage: number;
};

const getSupplyDemandStatus = (row: SupplyDemandComparisonRow) => {
  if (row.searchesCount > 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-red-50 text-danger",
      label: "Sem oferta",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount > 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem demanda",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem sinal",
    };
  }

  const pressure = row.searchesPerPsychologist ?? 0;

  if (pressure >= 100) {
    return {
      className: "bg-red-50 text-danger",
      label: "Alta demanda",
    };
  }

  if (pressure >= 25) {
    return {
      className: "bg-amber-50 text-warning",
      label: "Atenção",
    };
  }

  if (pressure >= 5) {
    return {
      className: "bg-primary-soft text-primary",
      label: "Equilibrado",
    };
  }

  return {
    className: "bg-emerald-50 text-success",
    label: "Oferta confortável",
  };
};

const buildSupplyDemandRows = (config: SupplyDemandDimensionConfig) =>
  config.demand.items.map<SupplyDemandComparisonRow>((demandItem) => {
    const supplyItem = findSupplyItem(demandItem, config.supply.items);

    return {
      id: demandItem.id,
      label: demandItem.label,
      psychologistsCount: supplyItem.count,
      psychologistsPercentage: supplyItem.percentage,
      searchesPerPsychologist:
        supplyItem.count > 0 ? toOneDecimal(demandItem.count / supplyItem.count) : null,
      searchesCount: demandItem.count,
      searchesPercentage: demandItem.percentage,
    };
  });

const getSupplyDemandSortValue = (row: SupplyDemandComparisonRow, sortKey: SupplyDemandSortKey) => {
  if (sortKey === "psychologists") return row.psychologistsCount;
  if (sortKey === "searches_per_psychologist") {
    if (row.searchesPerPsychologist !== null) return row.searchesPerPsychologist;

    return row.searchesCount > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  return row.searchesCount;
};

const SupplyDemandHeaderCell = ({
  align = "left",
  label,
  total,
}: {
  align?: "center" | "left" | "right";
  label: string;
  total: number;
}) => (
  <span
    className={cn(
      "inline-flex items-baseline gap-1",
      align === "center" && "justify-center text-center",
      align === "right" && "justify-end text-right",
    )}
  >
    <span>{label}</span>
    <span className="text-[0.68rem] font-medium tracking-normal text-subtle">
      ({numberFormatter.format(total)})
    </span>
  </span>
);

const SupplyDemandCountCell = ({
  count,
  label,
  percentage,
}: {
  count: number;
  label: string;
  percentage: number;
}) => (
  <div>
    <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
      <span className="font-bold text-muted lg:hidden">{label}</span>
      <span className="inline-flex items-baseline gap-1 text-base font-semibold text-foreground lg:justify-center lg:text-center">
        <span>{numberFormatter.format(count)}</span>
        <span className="text-sm font-medium text-muted">
          ({formatPercentageValue(percentage)})
        </span>
      </span>
    </div>
  </div>
);

const SearchesPerPsychologistCell = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const value =
    row.searchesPerPsychologist === null
      ? "—"
      : formatComparisonNumber(row.searchesPerPsychologist);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
        <span className="font-bold text-muted lg:hidden">Buscas/psicólogo</span>
        <span className="text-base font-semibold text-foreground lg:text-center">{value}</span>
      </div>
    </div>
  );
};

const SupplyDemandListRow = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const status = getSupplyDemandStatus(row);

  return (
    <li className="grid gap-4 border-t border-border p-4 lg:grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] lg:items-center">
      <div>
        <p className="text-sm font-semibold text-foreground">{row.label}</p>
      </div>
      <SupplyDemandCountCell
        count={row.searchesCount}
        label="Buscas"
        percentage={row.searchesPercentage}
      />
      <SupplyDemandCountCell
        count={row.psychologistsCount}
        label="Psicólogos"
        percentage={row.psychologistsPercentage}
      />
      <SearchesPerPsychologistCell row={row} />
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <span
          className={cn("rounded-full px-2 py-1 text-[0.65rem] font-semibold", status.className)}
        >
          {status.label}
        </span>
      </div>
    </li>
  );
};

const MiniBar = ({
  label,
  percentage,
  value,
}: {
  label: string;
  percentage: number;
  value: ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-xs font-black">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div
        aria-hidden
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  </div>
);

const getPiePoint = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

const buildPieSlicePath = (
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

const renderPiePercentageLabel = ({
  color,
  label,
  x,
  y,
}: {
  color: string;
  label: string;
  x: number;
  y: number;
}) => {
  const width = 39;
  const height = 16;

  return (
    <g>
      <rect
        fill={hexToRgba(color, 0.86)}
        height={height}
        rx={height / 2}
        width={width}
        x={x - width / 2}
        y={y - height / 2}
      />
      <text
        dominantBaseline="middle"
        fill="white"
        fontSize="8.5"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 0.25}
      >
        {label}
      </text>
    </g>
  );
};

const SignupMethodDonutChart = ({
  signupMethod,
}: {
  signupMethod: AdminPsychologistsDashboard["signup_method"];
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const total = Math.max(0, signupMethod.total);
  const visibleItems = signupMethod.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: SignupMethodItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;

  if (total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Sem cadastros de psicólogos nas categorias Google ou E-mail e senha no período selecionado.
      </p>
    );
  }

  const ariaLabel = `Gráfico de donut do modo de cadastro: ${signupMethod.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} cadastro(s), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <figure className="mt-5 grid gap-5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-center">
      <svg
        aria-label={ariaLabel}
        className="mx-auto aspect-square w-40 sm:w-44"
        role="img"
        viewBox="0 0 120 120"
      >
        <circle
          cx={center}
          cy={center}
          fill="var(--admin-surface-muted)"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="1"
        />
        {segments.map((segment) => {
          const color = SIGNUP_METHOD_CHART_COLORS[segment.item.id];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.id}>
                <circle
                  cx={center}
                  cy={center}
                  fill={color}
                  r={radius}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {renderPiePercentageLabel({
                  color,
                  label: percentageLabel,
                  x: center,
                  y: center,
                })}
              </g>
            );
          }

          return (
            <g key={segment.item.id}>
              <path
                d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                fill={color}
                stroke="var(--admin-surface)"
                strokeWidth="1.4"
              />
              {segment.share > 1
                ? renderPiePercentageLabel({
                    color,
                    label: percentageLabel,
                    x: labelPoint.x,
                    y: labelPoint.y,
                  })
                : null}
            </g>
          );
        })}
        <circle
          aria-hidden
          cx={center}
          cy={center}
          fill="var(--admin-surface)"
          r={innerRadius}
          stroke="var(--admin-surface)"
          strokeWidth="1"
        />
        <text
          fill="var(--admin-foreground)"
          fontSize="15"
          fontWeight="900"
          textAnchor="middle"
          x={center}
          y={center - 2}
        >
          {numberFormatter.format(total)}
        </text>
        <text
          fill="var(--admin-muted)"
          fontSize="8"
          fontWeight="700"
          textAnchor="middle"
          x={center}
          y={center + 12}
        >
          total
        </text>
      </svg>
      <figcaption className="space-y-3">
        {signupMethod.items.map((item) => {
          const signupLabel = item.count === 1 ? "cadastro" : "cadastros";

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: SIGNUP_METHOD_CHART_COLORS[item.id] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-muted">
                {numberFormatter.format(item.count)} {signupLabel}
              </p>
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};
const ConversionAndUsageBlocks = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const conversion = summary.conversion;
  const [conversionJourney, setConversionJourney] = useState<ConversionJourney>("subscription");
  const [preSignupConversionPlanSegment, setPreSignupConversionPlanSegment] =
    useState<PlanSegmentFilter>("all");
  const [signupMethodPlanSegment, setSignupMethodPlanSegment] = useState<PlanSegmentFilter>("all");
  const [deviceUsagePlanSegment, setDeviceUsagePlanSegment] = useState<PlanSegmentFilter>("all");
  const [platformUsagePlanSegment, setPlatformUsagePlanSegment] =
    useState<PlanSegmentFilter>("all");
  const [platformPagesView, setPlatformPagesView] = useState<PlatformPagesView>("accesses");
  const preSignupConversionSummary = getPlanSegmentSummary(summary, preSignupConversionPlanSegment);
  const signupMethodSummary = getPlanSegmentSummary(summary, signupMethodPlanSegment);
  const deviceUsageSummary = getPlanSegmentSummary(summary, deviceUsagePlanSegment);
  const platformUsageSummary = getPlanSegmentSummary(summary, platformUsagePlanSegment);
  const preSignupConversion = preSignupConversionSummary.pre_signup_conversion;
  const platformUsage = platformUsageSummary.platform_usage;
  const platformDurationPages = platformUsage.top_pages_by_average_duration;
  const platformMaxAverageDuration = Math.max(
    0,
    ...platformDurationPages.map((page) => page.average_duration_seconds),
  );
  const selectedPeriodLabel = formatSelectedPeriod(summary.period);

  return (
    <section className="grid gap-5">
      <CardShell className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PanelTitle
            description={selectedPeriodLabel}
            icon={conversionJourney === "registration" ? TrendingUp : TrendingDown}
            title={
              <ConversionJourneyTitleSelect
                id="psychologist-conversion-journey"
                onChange={setConversionJourney}
                value={conversionJourney}
              />
            }
          />
          {conversionJourney === "registration" ? (
            <PlanSegmentSelect
              id="pre-signup-conversion-plan-segment"
              onChange={setPreSignupConversionPlanSegment}
              value={preSignupConversionPlanSegment}
            />
          ) : null}
        </div>

        {conversionJourney === "subscription" ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Cadastros",
                  value: numberFormatter.format(conversion.registered_count),
                },
                {
                  label: "Assinaram",
                  value: numberFormatter.format(conversion.converted_paid_count),
                },
                {
                  label: "Taxa paga",
                  value: formatNullablePercentage(conversion.conversion_rate),
                },
                { label: "Média", value: formatDaysMetric(conversion.average_days) },
                { label: "Mediana", value: formatDaysMetric(conversion.median_days) },
                {
                  description: "75% assinam até esse prazo",
                  label: "P75",
                  value: formatDaysMetric(conversion.p75_days),
                },
                {
                  description: "90% assinam até esse prazo",
                  label: "P90",
                  value: formatDaysMetric(conversion.p90_days),
                },
              ].map(({ description, label, value }) => (
                <div className="rounded-2xl bg-surface-muted p-3" key={label}>
                  <p className="text-xs font-black text-muted">{label}</p>
                  <p className="mt-1 text-xl font-black text-foreground">{value}</p>
                  {description ? (
                    <p className="mt-1 text-[0.68rem] font-bold leading-snug text-subtle">
                      {description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">Distribuição por prazo</h3>
                <div className="mt-4 space-y-3">
                  {conversion.buckets.map((bucket) => (
                    <MiniBar
                      key={bucket.id}
                      label={bucket.label}
                      percentage={bucket.percentage}
                      value={`${numberFormatter.format(bucket.count)} · ${formatPercentageValue(
                        bucket.percentage,
                      )}`}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">
                  Conversão por modo de cadastro
                </h3>
                <div className="mt-4 space-y-4">
                  {summary.conversion_by_signup_method.map((item) => (
                    <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">{item.label}</p>
                          <p className="text-xs font-bold text-muted">
                            {numberFormatter.format(item.converted_paid_count)} de{" "}
                            {numberFormatter.format(item.registered_count)} assinaram
                          </p>
                        </div>
                        <span className="text-sm font-black text-primary">
                          {formatNullablePercentage(item.conversion_rate)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-muted">
                        Mediana: {formatDaysMetric(item.median_days)} · Média:{" "}
                        {formatDaysMetric(item.average_days)}
                      </p>
                      {!item.sample_sufficient && item.unavailable_reason ? (
                        <p className="mt-2 text-xs font-bold text-subtle">
                          {item.unavailable_reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Psicólogos cadastrados",
                  value: numberFormatter.format(preSignupConversion.registered_psychologists_count),
                },
                {
                  label: "Com trilha prévia",
                  value: numberFormatter.format(
                    preSignupConversion.psychologists_with_anonymous_history_count,
                  ),
                },
                {
                  label: "Sem trilha capturada",
                  value: numberFormatter.format(
                    preSignupConversion.psychologists_without_anonymous_history_count,
                  ),
                },
                {
                  label: "Cobertura da trilha",
                  value: formatNullablePercentage(preSignupConversion.history_coverage_rate),
                },
                { label: "Média", value: formatDaysMetric(preSignupConversion.average_days) },
                { label: "Mediana", value: formatDaysMetric(preSignupConversion.median_days) },
                {
                  description: "75% dos psicólogos com trilha cadastram até esse prazo",
                  label: "P75",
                  value: formatDaysMetric(preSignupConversion.p75_days),
                },
                {
                  description: "90% dos psicólogos com trilha cadastram até esse prazo",
                  label: "P90",
                  value: formatDaysMetric(preSignupConversion.p90_days),
                },
              ].map(({ description, label, value }) => (
                <div className="rounded-2xl bg-surface-muted p-3" key={label}>
                  <p className="text-xs font-black text-muted">{label}</p>
                  <p className="mt-1 text-xl font-black text-foreground">{value}</p>
                  {description ? (
                    <p className="mt-1 text-[0.68rem] font-bold leading-snug text-subtle">
                      {description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            {preSignupConversion.unavailable_reason ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
                {preSignupConversion.unavailable_reason}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">
                  Distribuição do tempo até cadastro
                </h3>
                <div className="mt-4 space-y-3">
                  {preSignupConversion.buckets.map((bucket) => (
                    <MiniBar
                      key={bucket.id}
                      label={bucket.label}
                      percentage={bucket.percentage}
                      value={[
                        numberFormatter.format(bucket.count),
                        formatPercentageValue(bucket.percentage),
                      ].join(" · ")}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">
                  Primeira página antes do cadastro
                </h3>
                {preSignupConversion.first_touch_pages.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
                    Sem primeira página anônima vinculada aos psicólogos cadastrados no período.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {preSignupConversion.first_touch_pages.map((item) => (
                      <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-foreground">{item.label}</p>
                            <p className="text-xs font-bold text-muted">
                              {numberFormatter.format(item.psychologists_count)} psicólogos com
                              trilha
                            </p>
                          </div>
                          <span className="text-sm font-black text-primary">
                            {formatPercentageValue(item.percentage)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-bold text-muted">
                          Tempo médio até cadastro: {formatDaysMetric(item.average_days)}
                        </p>
                        {item.unavailable_reason ? (
                          <p className="mt-2 text-xs font-bold text-subtle">
                            {item.unavailable_reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardShell>

      <div className="grid gap-5 xl:grid-cols-2">
        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={UserPlus}
              title="Modo de cadastro"
            />
            <PlanSegmentSelect
              id="signup-method-plan-segment"
              onChange={setSignupMethodPlanSegment}
              value={signupMethodPlanSegment}
            />
          </div>
          <SignupMethodDonutChart signupMethod={signupMethodSummary.signup_method} />
          {signupMethodSummary.signup_method.unknown_count > 0 ? (
            <p className="mt-4 text-xs font-bold text-subtle">
              {numberFormatter.format(signupMethodSummary.signup_method.unknown_count)} cadastro(s)
              legado(s) com via indisponível foram mantidos fora das duas categorias de produto.
            </p>
          ) : null}
        </CardShell>

        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Smartphone}
              title="Devices e sistemas"
            />
            <PlanSegmentSelect
              id="device-usage-plan-segment"
              onChange={setDeviceUsagePlanSegment}
              value={deviceUsagePlanSegment}
            />
          </div>
          <DeviceUsageDonutChart deviceUsage={deviceUsageSummary.device_usage} />
        </CardShell>

        <CardShell className="p-5 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Activity}
              title="Uso da plataforma"
            />
            <PlanSegmentSelect
              id="platform-usage-plan-segment"
              onChange={setPlatformUsagePlanSegment}
              value={platformUsagePlanSegment}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Ativos", numberFormatter.format(platformUsage.active_psychologists_count)],
              ["Taxa ativa", formatNullablePercentage(platformUsage.active_psychologists_rate)],
              [
                "PWA instalado",
                formatNullablePercentage(platformUsage.pwa_installed_psychologists_rate),
              ],
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
                  id="psychologist-platform-pages-view"
                  onChange={setPlatformPagesView}
                  value={platformPagesView}
                />
                <p className="text-[0.68rem] font-bold leading-4 text-subtle sm:text-right">
                  {platformPagesView === "accesses"
                    ? "Ranking por quantidade de pageviews."
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
      </div>
    </section>
  );
};

const DEVICE_USAGE_CHART_COLORS = {
  desktop: "#13a85b",
  mobile: "#308ce8",
  tablet: "#8b5cf6",
  unknown: "#94a3b8",
} satisfies Record<DeviceUsageItem["device_type"], string>;

const DeviceUsageDonutChart = ({
  deviceUsage,
}: {
  deviceUsage: AdminPsychologistsDashboard["device_usage"];
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const total = Math.max(0, deviceUsage.total_sessions);
  const visibleItems = deviceUsage.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: DeviceUsageItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;
  if (total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {deviceUsage.unavailable_reason ??
          "Sem sessões autenticadas de psicólogos no período selecionado."}
      </p>
    );
  }

  const ariaLabel = `Gráfico de donut dos devices usados por psicólogos: ${deviceUsage.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} sessão(ões), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <figure className="mt-5 grid gap-5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-center">
      <svg
        aria-label={ariaLabel}
        className="mx-auto aspect-square w-40 sm:w-44"
        role="img"
        viewBox="0 0 120 120"
      >
        <circle
          cx={center}
          cy={center}
          fill="var(--admin-surface-muted)"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="1"
        />
        {segments.map((segment) => {
          const color = DEVICE_USAGE_CHART_COLORS[segment.item.device_type];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.device_type}>
                <circle
                  cx={center}
                  cy={center}
                  fill={color}
                  r={radius}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {renderPiePercentageLabel({
                  color,
                  label: percentageLabel,
                  x: center,
                  y: center,
                })}
              </g>
            );
          }

          return (
            <g key={segment.item.device_type}>
              <path
                d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                fill={color}
                stroke="var(--admin-surface)"
                strokeWidth="1.4"
              />
              {segment.share > 1
                ? renderPiePercentageLabel({
                    color,
                    label: percentageLabel,
                    x: labelPoint.x,
                    y: labelPoint.y,
                  })
                : null}
            </g>
          );
        })}
        <circle
          aria-hidden
          cx={center}
          cy={center}
          fill="var(--admin-surface)"
          r={innerRadius}
          stroke="var(--admin-surface)"
          strokeWidth="1"
        />
        <text
          fill="var(--admin-foreground)"
          fontSize="15"
          fontWeight="900"
          textAnchor="middle"
          x={center}
          y={center - 2}
        >
          {numberFormatter.format(total)}
        </text>
        <text
          fill="var(--admin-muted)"
          fontSize="8"
          fontWeight="700"
          textAnchor="middle"
          x={center}
          y={center + 12}
        >
          total
        </text>
      </svg>
      <figcaption className="space-y-3">
        {deviceUsage.items.map((item) => {
          const operatingSystems =
            item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
          const operatingSystemSummary = operatingSystems
            .map(
              (operatingSystem) =>
                `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
            )
            .join(" · ");

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.device_type}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: DEVICE_USAGE_CHART_COLORS[item.device_type] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              {operatingSystemSummary ? (
                <p className="mt-2 whitespace-nowrap text-xs font-medium leading-5 text-subtle">
                  {operatingSystemSummary}
                </p>
              ) : null}
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};

const StatsContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [activeDimensionId, setActiveDimensionId] = useState("specialties");
  const [optionQuery, setOptionQuery] = useState("");
  const [planSegment, setPlanSegment] = useState<PlanSegmentFilter>("all");
  const [sortKey, setSortKey] = useState<SupplyDemandSortKey>("searches");
  const filterSearches = summary.filters_searches.dimensions;
  const planSegmentSummary = getPlanSegmentSummary(summary, planSegment);
  const statistics = planSegmentSummary.statistics;

  const comparisonDimensions: SupplyDemandDimensionConfig[] = [
    {
      demand: filterSearches.specialties,
      icon: Award,
      id: "specialties",
      label: "Especialidades",
      supply: statistics.specialties,
    },
    {
      demand: filterSearches.services,
      icon: ShieldCheck,
      id: "services",
      label: "Serviços",
      supply: statistics.services,
    },
    {
      demand: filterSearches.approaches,
      icon: MessageCircle,
      id: "approaches",
      label: "Abordagens",
      supply: statistics.approaches,
    },
    {
      demand: filterSearches.target_audiences,
      icon: UsersRound,
      id: "target-audience",
      label: "Público atendido",
      supply: statistics.target_audience,
    },
    {
      demand: filterSearches.modalities,
      icon: Activity,
      id: "modalities",
      label: "Modalidades",
      supply: statistics.modalities,
    },
    {
      demand: filterSearches.states,
      icon: Search,
      id: "states",
      label: "Estado",
      supply: statistics.states,
    },
    {
      demand: filterSearches.cities,
      icon: Search,
      id: "cities",
      label: "Cidade",
      supply: statistics.cities,
    },
    {
      demand: filterSearches.genders,
      icon: UserCheck,
      id: "genders",
      label: "Gênero",
      supply: statistics.gender,
    },
    {
      demand: filterSearches.race_colors,
      icon: UsersRound,
      id: "race-colors",
      label: "Raça",
      supply: statistics.race_colors,
    },
    {
      demand: filterSearches.religions,
      icon: ShieldCheck,
      id: "religions",
      label: "Religião",
      supply: statistics.religions,
    },
    {
      demand: filterSearches.features,
      icon: UserCheck,
      id: "features",
      label: "Selos e facilidades",
      supply: statistics.features,
    },
    {
      demand: filterSearches.languages,
      icon: Search,
      id: "languages",
      label: "Idiomas",
      supply: statistics.languages,
    },
  ];
  const selectedDimension =
    comparisonDimensions.find((dimension) => dimension.id === activeDimensionId) ??
    comparisonDimensions[0];
  const rows = buildSupplyDemandRows(selectedDimension);
  const normalizedQuery = normalizeComparisonLabel(optionQuery);
  const visibleRows = rows
    .filter((row) => normalizeComparisonLabel(row.label).includes(normalizedQuery))
    .toSorted((left, right) => {
      const sortDifference =
        getSupplyDemandSortValue(right, sortKey) - getSupplyDemandSortValue(left, sortKey);

      if (sortDifference !== 0) return sortDifference;

      return right.searchesCount - left.searchesCount;
    });
  const SelectedIcon = selectedDimension.icon;
  const periodLabel = formatSelectedPeriod(summary.period);
  const emptyRowsMessage =
    selectedDimension.id === "cities" && optionQuery.trim().length === 0
      ? `Nenhuma cidade com pelo menos ${numberFormatter.format(
          summary.filters_searches.minimum_city_searches,
        )} buscas ou psicólogo cadastrado no período selecionado.`
      : `Nenhuma opção encontrada para “${optionQuery}”.`;
  const handleDimensionChange = (dimensionId: string) => {
    setActiveDimensionId(dimensionId);
    setOptionQuery("");
  };

  return (
    <div className="space-y-4">
      <CardShell className="overflow-hidden">
        <div className="border-b border-border bg-surface-muted p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-primary">
                <SelectedIcon aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Comparativo de oferta e demanda
                  </h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{periodLabel}</p>
              </div>
            </div>
            <PlanSegmentSelect
              id="supply-demand-plan-segment"
              onChange={setPlanSegment}
              value={planSegment}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1.15fr)_minmax(220px,0.85fr)]">
            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-filter-type"
            >
              Tipo de filtro
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-filter-type"
                  onChange={(event) => handleDimensionChange(event.target.value)}
                  value={selectedDimension.id}
                >
                  {comparisonDimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-search"
            >
              Buscar opção
              <span className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm font-bold text-foreground shadow-control outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-search"
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder={`Buscar em ${selectedDimension.label.toLowerCase()}`}
                  type="search"
                  value={optionQuery}
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-sort"
            >
              Ordenar por
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-sort"
                  onChange={(event) => setSortKey(event.target.value as SupplyDemandSortKey)}
                  value={sortKey}
                >
                  {SUPPLY_DEMAND_SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                />
              </span>
            </label>
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] gap-4 border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted lg:grid">
          <SupplyDemandHeaderCell label="Opções do filtro" total={rows.length} />
          <SupplyDemandHeaderCell
            align="center"
            label="Buscas"
            total={selectedDimension.demand.total}
          />
          <SupplyDemandHeaderCell
            align="center"
            label="Psicólogos"
            total={selectedDimension.supply.total}
          />
          <span className="text-center">Buscas/psicólogo</span>
          <span className="text-right">Leitura</span>
        </div>

        {visibleRows.length > 0 ? (
          <ul className="max-h-[680px] overflow-y-auto">
            {visibleRows.map((row) => (
              <SupplyDemandListRow key={row.id} row={row} />
            ))}
          </ul>
        ) : (
          <div className="p-6 text-sm font-bold text-muted">{emptyRowsMessage}</div>
        )}
      </CardShell>
    </div>
  );
};

const PsychologistsHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Psicólogos</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Dashboard de Psicólogos
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
        Análise global dos psicólogos da plataforma.
      </p>
    </div>
  </section>
);

const DashboardPeriodControls = ({
  displayRange,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: DashboardRange;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof DashboardRange, value: string) => void;
  onPeriodChange: (period: DashboardPeriodPreset) => void;
  period: DashboardPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="psychologists-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="psychologists-period"
            onChange={(event) => onPeriodChange(event.target.value as DashboardPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {DASHBOARD_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
          />
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-semibold text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

const DashboardOverviewPanel = ({
  children,
  periodControls,
  periodDescription,
}: {
  children: ReactNode;
  periodControls: ReactNode;
  periodDescription: string;
}) => (
  <CardShell className="min-w-0 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);
const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPsychologistsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            totalPsychologists={cards.total_psychologists.value}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};

const PsychologistsDonutChart = ({
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
  const circumference = 2 * Math.PI * radius;
  const visibleItems = items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    cumulative: number;
    items: Array<{
      dash: number;
      item: PsychologistsDonutChartItem;
      strokeDashoffset: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      const dash = share * circumference;

      return {
        cumulative: accumulator.cumulative + dash,
        items: [
          ...accumulator.items,
          {
            dash,
            item,
            strokeDashoffset: -accumulator.cumulative,
          },
        ],
      };
    },
    { cumulative: 0, items: [] },
  ).items;

  if (items.length === 0 || visibleItems.length === 0 || total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <figure className="relative z-10 mt-5 overflow-visible">
      <div className="flex min-w-0 flex-col gap-4">
        <svg
          aria-label={ariaLabel}
          className="mx-auto block shrink-0"
          height="156"
          role="img"
          viewBox="0 0 120 120"
          width="156"
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
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2"
              key={item.id}
            >
              <span className="flex min-w-0 items-start gap-2 text-xs font-semibold leading-5 text-foreground xl:text-sm">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0 break-words">{item.label}</span>
                {showDescriptionTooltips && item.description ? (
                  <button
                    aria-label={`${item.label}: ${item.description}`}
                    className="group relative mt-0.5 inline-flex shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    type="button"
                  >
                    <CircleHelp aria-hidden className="h-3.5 w-3.5 text-muted" />
                    <span
                      className="pointer-events-none absolute bottom-full right-0 z-50 mb-2 hidden w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface p-3 text-left text-xs font-medium leading-5 text-foreground shadow-admin-soft group-hover:block group-focus:block sm:left-1/2 sm:right-auto sm:-translate-x-1/2"
                      role="tooltip"
                    >
                      {item.description}
                    </span>
                  </button>
                ) : null}
              </span>
              <span className="shrink-0 text-right text-xs font-semibold text-foreground xl:text-sm">
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

const buildProfileExposureSurfaceDonutItems = (
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

const buildProfileEngagementFavoritesAxisDonutItems = (
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

const ProfileActivityDonutChart = ({
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

const ProfileConversionDonutChart = ({
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

const ProfileExposureSurfaceDonutChart = ({
  profileExposure,
  surface,
}: {
  profileExposure: AdminPsychologistsDashboard["profile_exposure"];
  surface: "community" | "video";
}) => {
  const total = Math.max(0, profileExposure.totals.psychologists);
  const items = buildProfileExposureSurfaceDonutItems(profileExposure, surface);
  const title = surface === "community" ? "Visibilidade na Comunidade" : "Vídeo de apresentação";
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

const formatActivityActionsValue = (value: number) => {
  const label = value === 1 ? "ação" : "ações";

  return `${numberFormatter.format(value)} ${label}`;
};

const formatWhatsappClicksValue = (value: number) => {
  const label = value === 1 ? "clique" : "cliques";

  return `${numberFormatter.format(value)} ${label}`;
};

const formatCommunityEngagementScoreValue = (value: number) => {
  const label = value === 1 ? "ponto" : "pontos";

  return `${numberFormatter.format(value)} ${label}`;
};

const formatFavoritesValue = (value: number) => {
  const label = value === 1 ? "favorito" : "favoritos";

  return `${numberFormatter.format(value)} ${label}`;
};

const formatVisibilityDurationValue = (value: number) => {
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

const formatProfileConversionStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_conversion"]["benchmark"],
) => {
  const min = benchmark.standard_min_whatsapp_clicks;
  const max = benchmark.standard_max_whatsapp_clicks;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatWhatsappClicksValue(min);

  return `${formatWhatsappClicksValue(min)} a ${formatWhatsappClicksValue(max)}`;
};

const formatProfileActivityStandardRange = (
  thresholds: AdminPsychologistsDashboard["profile_activity"]["thresholds"],
) => {
  const min = thresholds.active_min_actions;
  const max = Math.max(min, thresholds.very_active_min_actions - 1);

  if (min === max) return formatActivityActionsValue(min);

  return `${numberFormatter.format(min)} a ${formatActivityActionsValue(max)}`;
};

const formatProfileExposureSurfaceStandardRange = (
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

const formatProfileEngagementStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_engagement_favorites"]["benchmark"]["community_engagement"],
) => {
  const min = benchmark.standard_min_engagement_score;
  const max = benchmark.standard_max_engagement_score;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatCommunityEngagementScoreValue(min);

  return `${formatCommunityEngagementScoreValue(min)} a ${formatCommunityEngagementScoreValue(max)}`;
};

const formatProfileFavoritesStandardRange = (
  benchmark: AdminPsychologistsDashboard["profile_engagement_favorites"]["benchmark"]["favorites"],
) => {
  const min = benchmark.standard_min_favorites;
  const max = benchmark.standard_max_favorites;

  if (min === null || max === null) return "Sem faixa padrão no período";
  if (min === max) return formatFavoritesValue(min);

  return `${formatFavoritesValue(min)} a ${formatFavoritesValue(max)}`;
};

const ProfileEngagementFavoritesAxisDonutChart = ({
  axis,
  profileEngagementFavorites,
}: {
  axis: "engagement" | "favorites";
  profileEngagementFavorites: AdminPsychologistsDashboard["profile_engagement_favorites"];
}) => {
  const total = Math.max(0, profileEngagementFavorites.totals.psychologists);
  const items = buildProfileEngagementFavoritesAxisDonutItems(profileEngagementFavorites, axis);
  const title = axis === "engagement" ? "Engajamento recebido" : "Favoritados recebidos";
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

const DashboardProfileSignalCard = ({
  children,
  className,
  standardValue,
  title,
  tooltipAriaLabel,
  tooltipContent,
}: {
  children: ReactNode;
  className?: string;
  standardValue: string;
  title: string;
  tooltipAriaLabel: string;
  tooltipContent: ReactNode;
}) => (
  <section
    className={cn(
      "flex h-full min-w-0 flex-col rounded-[1.6rem] border border-border/75 bg-surface-muted/70 p-4",
      className,
    )}
  >
    <div>
      <div className="min-w-[8rem]">
        <span className="inline-flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
          <button
            aria-label={tooltipAriaLabel}
            className="group relative inline-flex rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            type="button"
          >
            <CircleHelp aria-hidden className="h-4 w-4 text-muted" />
            <span
              className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-xl border border-border bg-surface p-3 text-left text-xs font-medium leading-5 text-foreground shadow-admin-soft group-hover:block group-focus:block"
              role="tooltip"
            >
              {tooltipContent}
            </span>
          </button>
        </span>
        <div className="mt-3 rounded-2xl border border-border/70 px-3 py-2">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-subtle">
            Padrão
          </p>
          <p className="mt-1 text-base font-black leading-snug text-foreground">{standardValue}</p>
        </div>
      </div>
    </div>
    {children}
  </section>
);

const DashboardProfileSignalsCarousel = ({ children }: { children: ReactNode }) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollCards = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(340, scroller.clientWidth * 0.9),
    });
  }, []);

  return (
    <div className="mt-5 min-w-0">
      <div className="relative min-w-0 px-11 sm:px-12">
        <button
          aria-label="Rolar gráficos de donut para a esquerda"
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollCards(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {children}
        </div>
        <button
          aria-label="Rolar gráficos de donut para a direita"
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollCards(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
const DashboardProfileConversionCard = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [profileConversionPlanSegment, setProfileConversionPlanSegment] =
    useState<PlanSegmentFilter>("all");
  const profileConversionSegmentSummary = getPlanSegmentSummary(
    summary,
    profileConversionPlanSegment,
  );
  const profileActivity = profileConversionSegmentSummary.profile_activity;
  const profileConversion = profileConversionSegmentSummary.profile_conversion;
  const profileEngagementFavorites = profileConversionSegmentSummary.profile_engagement_favorites;
  const profileExposure = profileConversionSegmentSummary.profile_exposure;
  if (!profileActivity || !profileConversion || !profileEngagementFavorites || !profileExposure) {
    return null;
  }

  const activityStandardRangeLabel = formatProfileActivityStandardRange(profileActivity.thresholds);
  const standardRangeLabel = formatProfileConversionStandardRange(profileConversion.benchmark);
  const communityVisibilityStandardRangeLabel = formatProfileExposureSurfaceStandardRange(
    profileExposure.benchmark.community_visibility,
  );
  const videoVisibilityStandardRangeLabel = formatProfileExposureSurfaceStandardRange(
    profileExposure.benchmark.presentation_video,
  );
  const engagementStandardRangeLabel = formatProfileEngagementStandardRange(
    profileEngagementFavorites.benchmark.community_engagement,
  );
  const favoritesStandardRangeLabel = formatProfileFavoritesStandardRange(
    profileEngagementFavorites.benchmark.favorites,
  );
  const hasConversionStandardRange =
    profileConversion.benchmark.standard_min_whatsapp_clicks !== null &&
    profileConversion.benchmark.standard_max_whatsapp_clicks !== null;
  const conversionTooltipStandardText = hasConversionStandardRange
    ? `${standardRangeLabel} no WhatsApp`
    : standardRangeLabel;

  return (
    <CardShell className="relative z-20 overflow-visible p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PanelTitle
          description={formatSelectedPeriod(summary.period)}
          icon={Activity}
          title="Atividade, visibilidade, engajamento, favoritos e conversão dos psicólogos"
        />
        <PlanSegmentSelect
          id="profile-conversion-plan-segment"
          onChange={setProfileConversionPlanSegment}
          value={profileConversionPlanSegment}
        />
      </div>

      <DashboardProfileSignalsCarousel>
        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={activityStandardRangeLabel}
            title="Atividade"
            tooltipAriaLabel={`Atividade mede ações autorais do psicólogo nas comunidades. Padrão da plataforma no período: ${activityStandardRangeLabel}.`}
            tooltipContent={
              <>
                Atividade mede ações autorais reais do psicólogo nas comunidades: posts publicados e
                respostas criadas no período. Padrão da plataforma no período:{" "}
                <strong className="font-black">{activityStandardRangeLabel}</strong>.
              </>
            }
          >
            <ProfileActivityDonutChart profileActivity={profileActivity} />
          </DashboardProfileSignalCard>
        </div>

        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={videoVisibilityStandardRangeLabel}
            title="Vídeo de apresentação"
            tooltipAriaLabel={`Vídeo de apresentação mede o tempo assistido no vídeo do perfil. Padrão da plataforma no período: ${videoVisibilityStandardRangeLabel}.`}
            tooltipContent={
              <>
                Vídeo de apresentação usa o tempo assistido real no vídeo do perfil. Padrão da
                plataforma no período:{" "}
                <strong className="font-black">{videoVisibilityStandardRangeLabel}</strong>.
              </>
            }
          >
            <ProfileExposureSurfaceDonutChart profileExposure={profileExposure} surface="video" />
          </DashboardProfileSignalCard>
        </div>

        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={communityVisibilityStandardRangeLabel}
            title="Visibilidade na comunidade"
            tooltipAriaLabel={`Visibilidade na comunidade mede a atenção recebida em conteúdo autoral nas comunidades. Padrão da plataforma no período: ${communityVisibilityStandardRangeLabel}.`}
            tooltipContent={
              <>
                Visibilidade na comunidade usa atenção recebida em posts e respostas autorais nas
                comunidades. Não conta listagens nem WhatsApp. Padrão da plataforma no período:{" "}
                <strong className="font-black">{communityVisibilityStandardRangeLabel}</strong>.
              </>
            }
          >
            <ProfileExposureSurfaceDonutChart
              profileExposure={profileExposure}
              surface="community"
            />
          </DashboardProfileSignalCard>
        </div>

        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={engagementStandardRangeLabel}
            title="Engajamento recebido"
            tooltipAriaLabel={`Engajamento recebido usa score ponderado de comentários, compartilhamentos, salvamentos e votos positivos recebidos na comunidade. Padrão da plataforma no período: ${engagementStandardRangeLabel}.`}
            tooltipContent={
              <>
                Engajamento recebido usa score ponderado de comentários, compartilhamentos,
                salvamentos e votos positivos recebidos na comunidade. Padrão da plataforma no
                período: <strong className="font-black">{engagementStandardRangeLabel}</strong>.
              </>
            }
          >
            <ProfileEngagementFavoritesAxisDonutChart
              axis="engagement"
              profileEngagementFavorites={profileEngagementFavorites}
            />
          </DashboardProfileSignalCard>
        </div>

        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={favoritesStandardRangeLabel}
            title="Favoritados recebidos"
            tooltipAriaLabel={`Favoritados recebidos mede favoritos reais recebidos pelo psicólogo. Padrão da plataforma no período: ${favoritesStandardRangeLabel}.`}
            tooltipContent={
              <>
                Favoritados recebidos mede favoritos reais recebidos pelo psicólogo no período.
                Padrão da plataforma no período:{" "}
                <strong className="font-black">{favoritesStandardRangeLabel}</strong>.
              </>
            }
          >
            <ProfileEngagementFavoritesAxisDonutChart
              axis="favorites"
              profileEngagementFavorites={profileEngagementFavorites}
            />
          </DashboardProfileSignalCard>
        </div>

        <div className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.75rem)/2)] xl:w-[calc((100%_-_1.5rem)/3)] 2xl:w-[calc((100%_-_2.25rem)/4)]">
          <DashboardProfileSignalCard
            standardValue={conversionTooltipStandardText}
            title="Conversão"
            tooltipAriaLabel={`Conversão mede cliques recebidos no WhatsApp, o sinal mais próximo de contato com o paciente. Padrão da plataforma no período: ${conversionTooltipStandardText}.`}
            tooltipContent={
              <>
                Conversão mede cliques recebidos no WhatsApp, o sinal mais próximo de contato com o
                paciente. Padrão da plataforma no período:{" "}
                <strong className="font-black">{standardRangeLabel}</strong>
                {hasConversionStandardRange ? " no WhatsApp." : "."}
              </>
            }
          >
            <ProfileConversionDonutChart profileConversion={profileConversion} />
          </DashboardProfileSignalCard>
        </div>
      </DashboardProfileSignalsCarousel>
    </CardShell>
  );
};
const findProfileCrossMatrixQuadrant = (
  matrix: ProfileCrossMatrix,
  row: ProfileCrossMatrixCategory,
  column: ProfileCrossMatrixCategory,
): ProfileCrossMatrixQuadrant =>
  matrix.quadrants.find(
    (quadrant) => quadrant.row_id === row.id && quadrant.column_id === column.id,
  ) ?? {
    column_id: column.id,
    column_label: column.label,
    count: 0,
    description: `Psicólogos em ${row.label} com ${column.label}.`,
    id: `${row.id}_${column.id}`,
    label: `${row.label} + ${column.label}`,
    percentage: 0,
    row_id: row.id,
    row_label: row.label,
  };

type ProfileCrossMatrixCell = {
  color: string;
  column: ProfileCrossMatrixCategory;
  quadrant: ProfileCrossMatrixQuadrant;
  row: ProfileCrossMatrixCategory;
  rowPercentage: number;
};

const buildProfileCrossMatrixRowCells = (
  matrix: ProfileCrossMatrix,
  row: ProfileCrossMatrixCategory,
): ProfileCrossMatrixCell[] => {
  const quadrants = matrix.columns.map((column) =>
    findProfileCrossMatrixQuadrant(matrix, row, column),
  );
  const rowTotal = quadrants.reduce((total, quadrant) => total + Math.max(0, quadrant.count), 0);

  return quadrants.map((quadrant, index) => {
    const column = matrix.columns[index] ?? {
      color: PROFILE_CONVERSION_CHART_COLORS.insufficient_data,
      count: 0,
      description: quadrant.description,
      id: quadrant.column_id,
      label: quadrant.column_label,
      percentage: 0,
    };

    return {
      color: column.color,
      column,
      quadrant,
      row,
      rowPercentage:
        rowTotal > 0 ? toOneDecimal((Math.max(0, quadrant.count) / rowTotal) * 100) : 0,
    };
  });
};
const ProfileConversionMatrixQuadrantCard = ({
  color,
  description,
  headingLabel,
  intensityPercentage,
  quadrant,
  showColumnLabel = false,
}: {
  color: string;
  description: string;
  headingLabel?: string;
  intensityPercentage?: number;
  quadrant: ProfileCrossMatrixQuadrant;
  showColumnLabel?: boolean;
}) => {
  const hasData = quadrant.count > 0;
  const intensity = hasData
    ? 0.08 + Math.min(0.2, ((intensityPercentage ?? quadrant.percentage) / 100) * 0.2)
    : 0;

  return (
    <div
      className="flex min-h-24 min-w-0 flex-col items-center justify-center rounded-2xl border p-2.5 text-center"
      style={{
        backgroundColor: hasData ? hexToRgba(color, intensity) : "var(--admin-surface-muted)",
        borderColor: hasData ? hexToRgba(color, 0.32) : "var(--admin-border)",
        minHeight: "6rem",
      }}
    >
      {showColumnLabel ? (
        <div className="mb-1.5 flex items-center justify-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h4 className="min-w-0 text-center text-xs font-black text-foreground">
            {headingLabel ?? quadrant.column_label}
          </h4>
        </div>
      ) : null}
      <p className="text-base font-black text-foreground">
        {numberFormatter.format(quadrant.count)}
        <span className="ml-1 text-xs font-bold text-muted">
          ({formatPercentageValue(quadrant.percentage)})
        </span>
      </p>
      <p className="mt-1.5 text-center text-[0.68rem] font-bold leading-4 text-muted">
        {description}
      </p>
      <p className="sr-only">
        {numberFormatter.format(quadrant.count)} profissionais,{" "}
        {formatPercentageValue(quadrant.percentage)} do total da matriz.
      </p>
    </div>
  );
};

const ProfileConversionBehaviorTableCell = ({
  cell,
}: {
  cell: ProfileConversionBehaviorCell | null;
}) => {
  const tagClassName =
    "inline-flex max-w-full min-w-0 items-center rounded-2xl bg-surface-muted px-2 py-0.5 text-[0.66rem] font-normal leading-4 text-foreground";

  if (!cell) {
    return (
      <div className="flex min-w-0 flex-wrap gap-1.5 px-1 py-1">
        <span
          className={cn(tagClassName, "text-muted")}
          title={"O backend não retornou a leitura desta célula."}
        >
          Sem dados
        </span>
      </div>
    );
  }

  if (cell.unavailable_reason) {
    return (
      <div className="flex min-w-0 flex-wrap gap-1.5 px-1 py-1">
        <span className={cn(tagClassName, "text-muted")} title={cell.unavailable_reason}>
          {getProfileConversionBehaviorUnavailableTag(cell)}
        </span>
      </div>
    );
  }

  const tags = getProfileConversionBehaviorTags(cell);

  if (tags.length === 0) {
    return (
      <div className="flex min-w-0 flex-wrap gap-1.5 px-1 py-1">
        <span className={cn(tagClassName, "text-muted")} title={cell.headline}>
          Sem sinais mensuráveis
        </span>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5 px-1 py-1" title={cell.headline}>
      {tags.map((tag) => (
        <span className={tagClassName} key={`${cell.id}-${tag.id}`} title={tag.description}>
          <span className="min-w-0 max-w-full whitespace-normal break-words">
            {tag.label}: {tag.value}
          </span>
        </span>
      ))}
    </div>
  );
};

const PROFILE_CONVERSION_BEHAVIOR_TAG_METRICS_BY_ELEMENT: Record<
  ProfileConversionBehaviorCell["element_id"],
  string[]
> = {
  communities: [
    "community_content_count",
    "activity_actions",
    "activity_active_psychologists",
    "activity_actions_per_psychologist",
    "community_views_per_content",
    "community_attention_per_content",
    "community_video_retention",
    "community_engagement_actions",
    "engagement_score",
    "engagement_comments_received",
    "engagement_content_saves",
    "engagement_content_shares",
    "engagement_positive_votes",
    "community_whatsapp_clicks",
  ],
  favorite: ["favorites_screen_whatsapp_clicks_per_psychologist"],
  presentation_video: [
    "presentation_video_retention",
    "presentation_video_engagement_actions",
    "presentation_video_average_ranking_position",
    "presentation_video_average_watch_seconds",
    "presentation_video_views_per_video",
    "presentation_video_replay_rate",
    "presentation_video_whatsapp_clicks",
  ],
  profile: [
    "profile_openings",
    "profile_openings_per_psychologist",
    "profile_average_stay_seconds",
    "profile_publications_tab_opens",
    "profile_reviews_tab_opens",
    "profile_favorites",
    "profile_whatsapp_clicks",
    "profile_whatsapp_rate",
  ],
};

const formatProfileConversionBehaviorMetricValue = (metric: ProfileConversionBehaviorMetric) => {
  if (typeof metric.value !== "number") return null;
  if (metric.unit === "percentage") return formatPercentageValue(metric.value);
  if (metric.unit === "seconds") return formatSecondsMetric(metric.value);
  if (metric.unit === "position") return `${numberFormatter.format(metric.value)}ª`;

  return numberFormatter.format(metric.value);
};

const getProfileConversionBehaviorTags = (cell: ProfileConversionBehaviorCell) => {
  const priority = PROFILE_CONVERSION_BEHAVIOR_TAG_METRICS_BY_ELEMENT[cell.element_id] ?? [];
  const metricsById = new Map(cell.metrics.map((metric) => [metric.id, metric]));
  const orderedMetrics = [
    ...priority.flatMap((id) => {
      const metric = metricsById.get(id);
      return metric ? [metric] : [];
    }),
    ...cell.metrics.filter((metric) => !priority.includes(metric.id)),
  ];

  return orderedMetrics.flatMap((metric) => {
    const value = formatProfileConversionBehaviorMetricValue(metric);
    if (!value) return [];

    return [
      {
        description: metric.description,
        id: metric.id,
        label: metric.label,
        value,
      },
    ];
  });
};

const getProfileConversionBehaviorUnavailableTag = (cell: ProfileConversionBehaviorCell) => {
  if (cell.unavailable_reason?.startsWith("Sem profissionais")) return "Sem profissionais";
  if (cell.element_id === "presentation_video") return "Sem vídeo publicado";
  if (cell.element_id === "profile") return "Sem sinais no perfil";
  if (cell.element_id === "communities") return "Sem sinais na comunidade";
  if (cell.element_id === "favorite") return "Sem base na tela de favoritos";

  return "Sem base";
};

const ProfileConversionBehaviorRowHeader = ({
  row,
}: {
  row: ProfileConversionBehaviorResults["rows"][number];
}) => {
  const color = PROFILE_CONVERSION_CHART_COLORS[row.id];

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="break-words text-sm font-black leading-5 text-foreground">{row.label}</p>
      </div>
      <p className="mt-1 text-[0.7rem] font-bold leading-4 text-muted">
        {numberFormatter.format(row.count)}
        {" psicólogos · "}
        {formatPercentageValue(row.percentage)} do total
      </p>
      <p className="mt-1 w-fit rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[0.68rem] font-black text-muted">
        {formatWhatsappClicksValue(row.totals?.whatsapp_clicks ?? 0)}
      </p>
    </div>
  );
};

const ProfileCrossMatrixDetails = ({ matrix }: { matrix: ProfileCrossMatrix }) => {
  if (matrix.totals.psychologists === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {matrix.unavailable_reason ??
          "Sem psicólogos ativos no período selecionado para cruzar os eixos selecionados."}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="grid gap-3 lg:hidden">
        {matrix.rows.map((row) => {
          const rowCells = buildProfileCrossMatrixRowCells(matrix, row);

          return (
            <section
              className="rounded-[1.35rem] border border-border bg-surface p-3"
              key={`psychologist-mobile-profile-cross-matrix-${row.id}`}
            >
              <h3 className="text-sm font-black text-foreground">{row.label}</h3>
              <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
                {numberFormatter.format(row.count)} psicólogos{" · "}
                {formatPercentageValue(row.percentage)}
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {rowCells.map((cell) => (
                  <ProfileConversionMatrixQuadrantCard
                    color={cell.color}
                    description={`${formatPercentageValue(cell.rowPercentage)} dentro de ${cell.row.label.toLowerCase()}.`}
                    headingLabel={cell.column.label}
                    intensityPercentage={cell.rowPercentage}
                    key={cell.quadrant.id}
                    quadrant={cell.quadrant}
                    showColumnLabel
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto pb-2 lg:block">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: `132px repeat(${matrix.columns.length}, minmax(7.5rem, 1fr))`,
            minWidth: `${132 + matrix.columns.length * 128}px`,
          }}
        >
          <div className="sticky left-0 z-10 hidden bg-surface lg:block" aria-hidden />
          {matrix.columns.map((column) => (
            <p
              className="rounded-xl bg-surface-muted px-2 py-1.5 text-center text-[0.68rem] font-black leading-4 text-muted"
              key={`psychologist-profile-cross-matrix-column-${column.id}`}
            >
              {column.label}
            </p>
          ))}

          {matrix.rows.map((row) => {
            const rowCells = buildProfileCrossMatrixRowCells(matrix, row);

            return (
              <Fragment key={`psychologist-profile-cross-matrix-row-${row.id}`}>
                <p className="sticky left-0 z-10 grid place-items-center rounded-xl bg-surface-muted px-2 py-2 text-center text-[0.68rem] font-black text-muted">
                  {row.label}
                </p>
                {rowCells.map((cell) => (
                  <ProfileConversionMatrixQuadrantCard
                    color={cell.color}
                    description={`${formatPercentageValue(cell.rowPercentage)} dentro de ${cell.row.label.toLowerCase()}.`}
                    intensityPercentage={cell.rowPercentage}
                    key={cell.quadrant.id}
                    quadrant={cell.quadrant}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const getProfileCrossMatrixByAxes = (
  crossMatrix: ProfileCrossMatrixResults,
  rowAxisId: ProfileCrossMatrixAxisId,
  columnAxisId: ProfileCrossMatrixAxisId,
) =>
  crossMatrix.matrices.find(
    (matrix) => matrix.row_axis_id === rowAxisId && matrix.column_axis_id === columnAxisId,
  ) ?? null;

function DashboardProfileConversionMatrixSection({
  basisLabel,
  crossMatrix,
}: {
  basisLabel: string;
  crossMatrix: ProfileCrossMatrixResults;
}) {
  const [isMatrixExpanded, setIsMatrixExpanded] = useState(false);
  const [rowAxisId, setRowAxisId] = useState<ProfileCrossMatrixAxisId>(
    crossMatrix.default_row_axis_id,
  );
  const [columnAxisId, setColumnAxisId] = useState<ProfileCrossMatrixAxisId>(
    crossMatrix.default_column_axis_id,
  );
  const axisOptions = crossMatrix.axes;
  const rowAxis = axisOptions.find((axis) => axis.id === rowAxisId) ?? axisOptions[0];
  const columnAxis = axisOptions.find((axis) => axis.id === columnAxisId) ?? axisOptions[1];
  const fallbackMatrix = crossMatrix.matrices[0] ?? null;
  const matrixDetails =
    rowAxis && columnAxis
      ? getProfileCrossMatrixByAxes(crossMatrix, rowAxis.id, columnAxis.id)
      : null;
  const selectedMatrix = matrixDetails ?? fallbackMatrix;
  const matrixDetailsTitle =
    selectedMatrix?.title ??
    (rowAxis && columnAxis
      ? `${rowAxis.label} x ${columnAxis.label}`
      : "Matriz de cruzamento de dados");
  const rowAxisOptions = axisOptions.filter((axis) => axis.id !== columnAxisId);
  const columnAxisOptions = axisOptions.filter((axis) => axis.id !== rowAxisId);
  const alternativeAxisId = (blockedAxisId: ProfileCrossMatrixAxisId) =>
    axisOptions.find((axis) => axis.id !== blockedAxisId)?.id ?? blockedAxisId;
  const handleRowAxisChange = (value: ProfileCrossMatrixAxisId) => {
    setRowAxisId(value);
    if (value === columnAxisId) setColumnAxisId(alternativeAxisId(value));
  };
  const handleColumnAxisChange = (value: ProfileCrossMatrixAxisId) => {
    setColumnAxisId(value);
    if (value === rowAxisId) setRowAxisId(alternativeAxisId(value));
  };

  return (
    <div className="mt-5 rounded-[1.35rem] border border-border/70 bg-surface p-3 sm:p-4">
      <button
        aria-expanded={isMatrixExpanded}
        className="flex w-full flex-col gap-3 text-left sm:flex-row sm:items-center sm:justify-between"
        onClick={() => setIsMatrixExpanded((current) => !current)}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[0.62rem] font-black uppercase tracking-[0.16em] text-subtle">
            Matriz de cruzamento de dados
          </span>
        </span>
        <span className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface-muted px-3 py-2 text-xs font-black text-foreground transition hover:border-primary/40 hover:text-primary">
          {isMatrixExpanded ? "Ocultar matriz" : "Ver matriz"}
          <ChevronDown
            aria-hidden
            className={cn("h-4 w-4 transition-transform", isMatrixExpanded && "rotate-180")}
          />
        </span>
      </button>

      {isMatrixExpanded ? (
        <div className="mt-4 border-border border-t pt-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-black text-foreground">{matrixDetailsTitle}</h3>
              <p className="mt-1 text-xs font-bold leading-5 text-muted">
                Escolha os dois eixos da matriz: o campo Linha controla as faixas verticais e o
                campo Coluna controla as faixas horizontais. A leitura acompanha a base agregada do
                funil: <strong className="font-black text-foreground">{basisLabel}</strong>.
              </p>
            </div>
            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:min-w-[34rem] 2xl:min-w-[38rem]">
              <ProfileCrossMatrixAxisSelect
                axes={rowAxisOptions}
                id="profile-cross-matrix-row-axis"
                label="Linha"
                onChange={handleRowAxisChange}
                value={rowAxisId}
              />
              <ProfileCrossMatrixAxisSelect
                axes={columnAxisOptions}
                id="profile-cross-matrix-column-axis"
                label="Coluna"
                onChange={handleColumnAxisChange}
                value={columnAxisId}
              />
            </div>
          </div>
          {selectedMatrix ? <ProfileCrossMatrixDetails matrix={selectedMatrix} /> : null}
        </div>
      ) : null}
    </div>
  );
}

const DashboardProfileConversionBehaviorFunnelCard = ({
  summary,
}: {
  summary: AdminPsychologistsDashboard;
}) => {
  const segmentSummary = getPlanSegmentSummary(summary, "all");
  const behaviorTable = segmentSummary.profile_conversion_behavior;
  const profileCrossMatrix = segmentSummary.profile_cross_matrix;
  const conversionRows = behaviorTable?.rows ?? [];
  const behaviorColumns = behaviorTable?.columns ?? [];
  const behaviorCellsByKey = new Map(
    (behaviorTable?.cells ?? []).map((cell) => [`${cell.row_id}:${cell.element_id}`, cell]),
  );

  if (!behaviorTable || conversionRows.length === 0 || behaviorColumns.length === 0) {
    return null;
  }

  return (
    <CardShell className="p-5">
      <PanelTitle
        description={`${formatSelectedPeriod(summary.period)} · comportamento predominante detalhado por conversão`}
        icon={Funnel}
        title={"Funil comportamental por conversão"}
      />

      <div className="mt-5 grid gap-3 lg:hidden">
        {conversionRows.map((row) => (
          <section
            className="rounded-[1.35rem] border border-border/70 bg-surface p-3"
            key={`profile-conversion-behavior-mobile-row-${row.id}`}
          >
            <ProfileConversionBehaviorRowHeader row={row} />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {behaviorColumns.map((column) => {
                const cell = behaviorCellsByKey.get(`${row.id}:${column.id}`) ?? null;

                return (
                  <div
                    className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/30 p-2"
                    key={`profile-conversion-behavior-mobile-cell-${row.id}-${column.id}`}
                  >
                    <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-subtle">
                      {column.label}
                    </p>
                    <ProfileConversionBehaviorTableCell cell={cell} />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-border/70 bg-surface lg:block">
        <table className="w-full table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">
            {
              "Tabela com as faixas de conversão no eixo vertical e tags comportamentais dos psicólogos por vídeo de apresentação, perfil, comunidade e tela de favoritos."
            }
          </caption>
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[32%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="bg-surface-muted/80">
              <th className="border-border border-b p-2.5 text-[0.66rem] font-black uppercase tracking-[0.12em] text-subtle">
                {"Conversão"}
              </th>
              {behaviorColumns.map((column) => (
                <th
                  className="border-border border-b p-2.5 align-top text-[0.72rem] font-black leading-4 text-foreground"
                  key={`profile-conversion-behavior-axis-${column.id}`}
                  scope="col"
                  title={column.description}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversionRows.map((row) => (
              <tr key={`profile-conversion-behavior-row-${row.id}`}>
                <th className="border-border border-t bg-surface p-2.5 align-top" scope="row">
                  <ProfileConversionBehaviorRowHeader row={row} />
                </th>
                {behaviorColumns.map((column) => {
                  const cell = behaviorCellsByKey.get(`${row.id}:${column.id}`) ?? null;

                  return (
                    <td
                      className="border-border border-t p-2.5 align-top"
                      key={`profile-conversion-behavior-cell-${row.id}-${column.id}`}
                    >
                      <ProfileConversionBehaviorTableCell cell={cell} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DashboardProfileConversionMatrixSection
        basisLabel={segmentSummary.label}
        crossMatrix={profileCrossMatrix}
      />
    </CardShell>
  );
};

const TrafficSourceMetricValue = ({
  className,
  percentage,
  value,
}: {
  className?: string;
  percentage: number;
  value: ReactNode;
}) => (
  <span className={cn("inline-flex items-baseline gap-1 font-black text-foreground", className)}>
    <span>{value}</span>
    <span className="text-[0.78em] font-semibold text-muted">
      ({formatPercentageValue(percentage)})
    </span>
  </span>
);


type TrafficSourceAverageUnit = "content" | "psychologist" | "video";
type TrafficSourceAverageSource = Pick<
  TrafficSourceItem,
  "considered_count" | "whatsapp_clicks"
> & {
  id: TrafficSourceDisplayItem["id"];
};
type TrafficSourceWhatsappAverage = {
  label: string;
  value: number;
};

const positiveTrafficSourceConsideredCount = (
  source: Pick<TrafficSourceItem, "considered_count">,
) =>
  typeof source.considered_count === "number" && source.considered_count > 0
    ? source.considered_count
    : null;

const sumTrafficSourceConsideredCounts = (sources: TrafficSourceItem[]) => {
  let hasCount = false;
  const total = sources.reduce((sum, source) => {
    if (typeof source.considered_count !== "number") return sum;

    hasCount = true;
    return sum + source.considered_count;
  }, 0);

  return hasCount ? total : null;
};

const maxTrafficSourceConsideredCount = (sources: TrafficSourceItem[]) => {
  let max: number | null = null;

  for (const source of sources) {
    if (typeof source.considered_count !== "number") continue;

    max = Math.max(max ?? 0, source.considered_count);
  }

  return max;
};

const getTrafficSourceAverageUnit = (
  source: TrafficSourceAverageSource,
  context?: TrafficSourceGroupKind,
): TrafficSourceAverageUnit => {
  if (context === "communities") {
    return source.id === "community_top_mentors" ? "psychologist" : "content";
  }

  if (
    context === "presentation_video" ||
    source.id === "explore" ||
    source.id === "search_filters"
  ) {
    return "video";
  }

  return "psychologist";
};

const getTrafficSourceAverageLabel = (unit: TrafficSourceAverageUnit) => {
  if (unit === "content") return "por conteúdo";
  if (unit === "video") return "por vídeo";

  return "por psicólogo";
};

const getTrafficSourceWhatsappAverage = ({
  context,
  fallbackPsychologistsCount,
  source,
}: {
  context?: TrafficSourceGroupKind;
  fallbackPsychologistsCount: number;
  source: TrafficSourceAverageSource;
}): TrafficSourceWhatsappAverage | null => {
  const unit = getTrafficSourceAverageUnit(source, context);
  const consideredCount = positiveTrafficSourceConsideredCount(source);
  const denominator =
    consideredCount ??
    (unit === "psychologist" && fallbackPsychologistsCount > 0 ? fallbackPsychologistsCount : null);

  if (!denominator) return null;

  return {
    label: getTrafficSourceAverageLabel(unit),
    value: toOneDecimal((source.whatsapp_clicks ?? 0) / denominator),
  };
};

const TrafficSourceWhatsappMetric = ({
  className,
  context,
  fallbackPsychologistsCount,
  percentage,
  source,
  valueClassName,
}: {
  className?: string;
  context?: TrafficSourceGroupKind;
  fallbackPsychologistsCount: number;
  percentage: number;
  source: TrafficSourceAverageSource;
  valueClassName?: string;
}) => {
  const average = getTrafficSourceWhatsappAverage({
    context,
    fallbackPsychologistsCount,
    source,
  });

  return (
    <span className={cn("inline-flex flex-col items-center gap-0.5", className)}>
      <TrafficSourceMetricValue
        className={valueClassName}
        percentage={percentage}
        value={formatNullableCount(source.whatsapp_clicks)}
      />
      {average ? (
        <span className="text-[0.68rem] font-bold leading-none text-muted">
          {numberFormatter.format(average.value)} {average.label}
        </span>
      ) : null}
    </span>
  );
};
const formatTrafficSourcePlatformMetricValue = (
  metric: NonNullable<TrafficSourceItem["platform_metrics"]>[number],
) => {
  if (typeof metric.value !== "number") return "Sem dados";
  if (metric.unit === "percentage") return formatPercentageValue(metric.value);
  if (metric.unit === "seconds") return formatSecondsMetric(metric.value);

  return numberFormatter.format(metric.value);
};

const TrafficSourcePlatformMetrics = ({
  className,
  source,
}: {
  className?: string;
  source: Pick<TrafficSourceItem, "description" | "platform_metrics">;
}) => {
  const metrics = source.platform_metrics ?? [];

  if (metrics.length === 0) {
    return (
      <p className={cn("mt-1 text-xs leading-5 text-muted", className)}>{source.description}</p>
    );
  }

  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {metrics.map((metric) => (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface px-2 py-1 text-[0.68rem] font-bold leading-none text-muted"
          key={metric.id}
          title={metric.unavailable_reason ?? metric.source}
        >
          <span>{metric.label}</span>
          <strong className="font-black text-foreground">
            {formatTrafficSourcePlatformMetricValue(metric)}
          </strong>
        </span>
      ))}
    </div>
  );
};

const TrafficSourcePlatformMetricsDescription = ({
  context,
  source,
}: {
  context?: TrafficSourceGroupKind;
  source: Pick<TrafficSourceItem, "platform_metrics">;
}) => {
  if (!source.platform_metrics?.length) return null;

  return (
    <p className="mt-1 text-[0.68rem] font-bold leading-4 text-muted">
      {context === "profile"
        ? "Valores médios de engajamento dentro do perfil."
        : context === "presentation_video"
          ? "Valores médios de engajamento do vídeo de apresentação."
          : "Valores médios de engajamento da categoria."}
    </p>
  );
};

const getTrafficSourceConsideredCountLabel = (count: number, context?: TrafficSourceGroupKind) => {
  const formattedCount = numberFormatter.format(count);

  if (context === "profile") {
    return `${formattedCount} ${count === 1 ? "perfil considerado" : "perfis considerados"}`;
  }

  if (context === "presentation_video") {
    return `${formattedCount} ${count === 1 ? "vídeo considerado" : "vídeos considerados"}`;
  }

  return `${formattedCount} ${count === 1 ? "conteúdo considerado" : "conteúdos considerados"}`;
};

const TrafficSourceConsideredBadge = ({
  context,
  source,
}: {
  context?: TrafficSourceGroupKind;
  source: Pick<TrafficSourceItem, "considered_count">;
}) => {
  if (typeof source.considered_count !== "number") return null;

  return (
    <span className="shrink-0 text-[0.68rem] font-bold leading-none text-muted">
      {getTrafficSourceConsideredCountLabel(source.considered_count, context)}
    </span>
  );
};

const TrafficSourceGroupToggle = ({ expanded }: { expanded: boolean }) => (
  <span
    aria-hidden
    className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-muted transition"
    data-traffic-source-chevron=""
  >
    <ChevronDown
      aria-hidden
      className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")}
    />
  </span>
);

const isCommunityTrafficSource = (
  source: TrafficSourceItem,
): source is TrafficSourceItem & { id: CommunityTrafficSourceId } =>
  COMMUNITY_TRAFFIC_SOURCE_ID_SET.has(source.id);

const isPresentationVideoTrafficSource = (
  source: TrafficSourceItem,
): source is TrafficSourceItem & { id: PresentationVideoTrafficSourceId } =>
  PRESENTATION_VIDEO_TRAFFIC_SOURCE_ID_SET.has(source.id);

const isExpandableTrafficSourceGroup = (
  source: TrafficSourceDisplayItem,
): source is TrafficSourceDisplayItem & {
  id: TrafficSourceGroupId;
  isExpandableGroup: true;
} =>
  Boolean(
    source.isExpandableGroup &&
      ((source.children?.length ?? 0) > 0 || (source.platform_metrics?.length ?? 0) > 0),
  );

const getTrafficSourceDetailLabel = (
  source: TrafficSourceItem,
  groupKind?: TrafficSourceGroupKind,
) =>
  groupKind === "communities" && isCommunityTrafficSource(source)
    ? COMMUNITY_TRAFFIC_SOURCE_DETAIL_LABELS[source.id]
    : source.label;

const sumTrafficSourceValue = (
  sources: TrafficSourceItem[],
  key: "percentage" | "profile_views" | "sessions" | "whatsapp_clicks",
) => sources.reduce((total, source) => total + (source[key] ?? 0), 0);

const buildTrafficSourceDisplayRows = (
  sources: TrafficSourceItem[],
): TrafficSourceDisplayItem[] => {
  const displayCandidates: Array<{ index: number; source: TrafficSourceDisplayItem }> = [];
  const communitySourcesById = new Map<CommunityTrafficSourceId, TrafficSourceItem>();
  const communitySources: TrafficSourceItem[] = [];
  let communitySortIndex = sources.length;
  const presentationVideoSourcesById = new Map<
    PresentationVideoTrafficSourceId,
    TrafficSourceItem
  >();
  const presentationVideoSources: TrafficSourceItem[] = [];
  let presentationVideoSortIndex = sources.length;

  sources.forEach((source, index) => {
    if (isCommunityTrafficSource(source)) {
      communitySourcesById.set(source.id, source);
      communitySources.push(source);
      communitySortIndex = Math.min(communitySortIndex, index);
      return;
    }

    if (isPresentationVideoTrafficSource(source)) {
      presentationVideoSourcesById.set(source.id, source);
      presentationVideoSources.push(source);
      presentationVideoSortIndex = Math.min(presentationVideoSortIndex, index);
      return;
    }

    if (source.id === "profile") {
      displayCandidates.push({
        index,
        source: {
          ...source,
          groupKind: "profile",
          id: "profile_group",
          isExpandableGroup: true,
        },
      });
      return;
    }

    displayCandidates.push({ index, source });
  });

  if (communitySources.length > 0) {
    const communityDetails = COMMUNITY_TRAFFIC_SOURCE_IDS.map((id) =>
      communitySourcesById.get(id),
    ).filter((source): source is TrafficSourceItem => Boolean(source));
    const communityGroup: TrafficSourceDisplayItem = {
      ...communitySources[0],
      badge: null,
      children: communityDetails,
      considered_count: sumTrafficSourceConsideredCounts(communityDetails),
      description: "Somatório dos cliques de WhatsApp originados nas comunidades.",
      groupKind: "communities",
      id: "communities_group",
      isExpandableGroup: true,
      label: "Comunidades",
      percentage: sumTrafficSourceValue(communitySources, "percentage"),
      platform_metrics: null,
      profile_views: sumTrafficSourceValue(communitySources, "profile_views"),
      sessions: sumTrafficSourceValue(communitySources, "sessions"),
      whatsapp_clicks: sumTrafficSourceValue(communitySources, "whatsapp_clicks"),
    };

    displayCandidates.push({ index: communitySortIndex, source: communityGroup });
  }

  if (presentationVideoSources.length > 0) {
    const presentationVideoDetails = PRESENTATION_VIDEO_TRAFFIC_SOURCE_IDS.map((id) =>
      presentationVideoSourcesById.get(id),
    ).filter((source): source is TrafficSourceItem => Boolean(source));
    const presentationVideoGroup: TrafficSourceDisplayItem = {
      ...presentationVideoSources[0],
      badge: null,
      children: presentationVideoDetails,
      considered_count: maxTrafficSourceConsideredCount(presentationVideoDetails),
      description:
        "Somatório dos cliques de WhatsApp associados ao vídeo de apresentação em Explorar e buscas/filtros.",
      groupKind: "presentation_video",
      id: "presentation_video_group",
      isExpandableGroup: true,
      label: "Vídeo de apresentação",
      percentage: sumTrafficSourceValue(presentationVideoSources, "percentage"),
      platform_metrics: null,
      profile_views: sumTrafficSourceValue(presentationVideoSources, "profile_views"),
      sessions: sumTrafficSourceValue(presentationVideoSources, "sessions"),
      whatsapp_clicks: sumTrafficSourceValue(presentationVideoSources, "whatsapp_clicks"),
    };

    displayCandidates.push({ index: presentationVideoSortIndex, source: presentationVideoGroup });
  }

  const sortedCandidates = displayCandidates.sort((left, right) => {
    const rightClicks = right.source.whatsapp_clicks ?? 0;
    const leftClicks = left.source.whatsapp_clicks ?? 0;

    if (rightClicks !== leftClicks) return rightClicks - leftClicks;

    return left.index - right.index;
  });
  const maxWhatsappClicks = sortedCandidates.reduce(
    (max, item) => Math.max(max, item.source.whatsapp_clicks ?? 0),
    0,
  );

  return sortedCandidates.map(({ source }, index) => ({
    ...source,
    badge: maxWhatsappClicks > 0 && index === 0 ? "primary_source" : null,
  }));
};

const TrafficSourceProfileMetricsDetail = ({
  className,
  source,
}: {
  className?: string;
  source: TrafficSourceDisplayItem;
}) => (
  <div className={cn("min-w-0 border-primary/25 border-l-2 pl-4", className)}>
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <p className="text-xs font-black text-foreground">Engajamento dentro do perfil</p>
      <TrafficSourceConsideredBadge context="profile" source={source} />
    </div>
    <TrafficSourcePlatformMetricsDescription context="profile" source={source} />
    <TrafficSourcePlatformMetrics source={source} />
  </div>
);

const DashboardTrafficSourcesCard = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [trafficPlanSegment, setTrafficPlanSegment] = useState<PlanSegmentFilter>("all");
  const [expandedTrafficSourceGroups, setExpandedTrafficSourceGroups] = useState<
    Set<TrafficSourceGroupId>
  >(() => new Set());
  const trafficSegmentSummary = getPlanSegmentSummary(summary, trafficPlanSegment);
  const traffic = trafficSegmentSummary.traffic_sources;
  const trafficRows = buildTrafficSourceDisplayRows(traffic.sources);
  const totalWhatsappClicks = traffic.sources.reduce(
    (total, source) => total + (source.whatsapp_clicks ?? 0),
    0,
  );
  const getWhatsappClicksPercentage = (value: number | null) =>
    totalWhatsappClicks > 0 ? toOneDecimal(((value ?? 0) / totalWhatsappClicks) * 100) : 0;
  const toggleTrafficSourceGroup = (groupId: TrafficSourceGroupId) => {
    setExpandedTrafficSourceGroups((current) => {
      const next = new Set(current);

      if (next.has(groupId)) {
        next.delete(groupId);
        return next;
      }

      next.add(groupId);
      return next;
    });
  };

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-foreground">Origem do tráfego para psicólogos</h3>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">
            {summary.period.label} · {formatDate(summary.period.from)} a{" "}
            {formatDate(summary.period.to)}
          </p>
        </div>
        <PlanSegmentSelect
          id="traffic-source-plan-segment"
          onChange={setTrafficPlanSegment}
          value={trafficPlanSegment}
        />
      </div>

      <div className="mt-5 hidden overflow-hidden rounded-[1.35rem] border border-border/70 md:block">
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] gap-3 border-border border-b bg-surface-muted px-4 py-3 text-[0.7rem] font-black uppercase tracking-[0.1em] text-subtle">
          <span>Fonte</span>
          <span className="text-center">WhatsApp</span>
        </div>
        <div className="divide-y divide-border">
          {trafficRows.map((source) => {
            if (isExpandableTrafficSourceGroup(source)) {
              const isExpanded = expandedTrafficSourceGroups.has(source.id);

              return (
                <div className="bg-surface" key={source.id}>
                  <button
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? "Ocultar" : "Expandir"} detalhes de ${source.label}`}
                    className="grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_minmax(150px,0.35fr)] items-center gap-3 px-4 py-4 text-left transition hover:bg-surface-muted/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    onClick={() => toggleTrafficSourceGroup(source.id)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-black text-foreground">
                          {source.label}
                        </p>
                        {source.badge === "primary_source" ? (
                          <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                            Principal origem
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                        {source.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 text-center">
                      <div className="flex justify-center">
                        <TrafficSourceWhatsappMetric
                          context={source.groupKind}
                          fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                          percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                          source={source}
                          valueClassName="text-lg"
                        />
                      </div>
                      <TrafficSourceGroupToggle expanded={isExpanded} />
                    </div>
                  </button>
                  {isExpanded ? (
                    <div className="divide-y divide-border/70 border-border/70 border-t bg-surface-muted/35">
                      {source.children?.length ? (
                        source.children.map((childSource) => (
                          <div
                            className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] items-center gap-3 px-4 py-3"
                            key={childSource.id}
                          >
                            <div className="min-w-0 border-primary/25 border-l-2 pl-4">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="truncate text-xs font-black text-foreground">
                                  {getTrafficSourceDetailLabel(childSource, source.groupKind)}
                                </p>
                                <TrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                              </div>
                              <TrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <TrafficSourcePlatformMetrics source={childSource} />
                            </div>
                            <div className="flex justify-center text-center">
                              <TrafficSourceWhatsappMetric
                                context={source.groupKind}
                                fallbackPsychologistsCount={
                                  trafficSegmentSummary.psychologists_count
                                }
                                percentage={getWhatsappClicksPercentage(
                                  childSource.whatsapp_clicks,
                                )}
                                source={childSource}
                                valueClassName="text-base"
                              />
                            </div>
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="px-4 py-3">
                          <TrafficSourceProfileMetricsDetail source={source} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <div
                className="grid grid-cols-[minmax(0,1fr)_minmax(120px,0.35fr)] items-center gap-3 px-4 py-4"
                key={source.id}
              >
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-foreground">{source.label}</p>
                    {source.badge === "primary_source" ? (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                        Principal origem
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                    {source.description}
                  </p>
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-4 text-center">
                  <div className="flex justify-center">
                    <TrafficSourceWhatsappMetric
                      context={source.groupKind}
                      fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                      percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                      source={source}
                      valueClassName="text-lg"
                    />
                  </div>
                  <span aria-hidden className="h-6 w-6" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:hidden">
        {trafficRows.map((source) => {
          const isExpandableGroup = isExpandableTrafficSourceGroup(source);
          const isExpanded = isExpandableGroup ? expandedTrafficSourceGroups.has(source.id) : false;
          const metricBlock = (
            <div className="mt-4 rounded-2xl bg-surface p-3">
              <p className="text-[0.68rem] font-black text-muted">WhatsApp</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <TrafficSourceWhatsappMetric
                  className="items-start"
                  context={source.groupKind}
                  fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                  percentage={getWhatsappClicksPercentage(source.whatsapp_clicks)}
                  source={source}
                  valueClassName="text-base"
                />
                {isExpandableGroup ? <TrafficSourceGroupToggle expanded={isExpanded} /> : null}
              </div>
            </div>
          );
          const summaryContent = (
            <>
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h4 className="text-sm font-black text-foreground">{source.label}</h4>
                    {source.badge === "primary_source" ? (
                      <span className="rounded-full bg-primary-soft px-2 py-1 text-[0.68rem] font-black text-primary">
                        Principal origem
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted">{source.description}</p>
                </div>
              </div>
              {metricBlock}
            </>
          );

          return (
            <article
              className={cn(
                "rounded-[1.35rem] border border-border/70 bg-surface-muted p-4",
                isExpandableGroup && "transition hover:border-primary/30",
              )}
              key={source.id}
            >
              {isExpandableGroup ? (
                <button
                  aria-expanded={isExpanded}
                  aria-label={`${isExpanded ? "Ocultar" : "Expandir"} detalhes de ${source.label}`}
                  className="w-full cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  onClick={() => toggleTrafficSourceGroup(source.id)}
                  type="button"
                >
                  {summaryContent}
                </button>
              ) : (
                summaryContent
              )}
              <div className="mt-2 grid gap-2">
                {isExpandableGroup && isExpanded ? (
                  <div className="rounded-2xl border border-border/70 bg-surface p-3">
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-muted">
                      Detalhamento de {source.label}
                    </p>
                    <div className="mt-2 divide-y divide-border/70">
                      {source.children?.length ? (
                        source.children.map((childSource) => (
                          <div
                            className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0"
                            key={childSource.id}
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <p className="text-xs font-black text-foreground">
                                  {getTrafficSourceDetailLabel(childSource, source.groupKind)}
                                </p>
                                <TrafficSourceConsideredBadge
                                  context={source.groupKind}
                                  source={childSource}
                                />
                              </div>
                              <TrafficSourcePlatformMetricsDescription
                                context={source.groupKind}
                                source={childSource}
                              />
                              <TrafficSourcePlatformMetrics source={childSource} />
                            </div>
                            <TrafficSourceWhatsappMetric
                              className="shrink-0 items-end text-right"
                              context={source.groupKind}
                              fallbackPsychologistsCount={trafficSegmentSummary.psychologists_count}
                              percentage={getWhatsappClicksPercentage(childSource.whatsapp_clicks)}
                              source={childSource}
                              valueClassName="text-sm"
                            />
                          </div>
                        ))
                      ) : source.platform_metrics?.length ? (
                        <div className="py-2 first:pt-0 last:pb-0">
                          <TrafficSourceProfileMetricsDetail className="pl-3" source={source} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </CardShell>
  );
};

const DashboardContent = ({
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

export const AdminPsychologistsClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<DashboardPeriodValue>("all");
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<DashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const [appliedRange, setAppliedRange] = useState<DashboardRange>(() =>
    getDashboardRangeForPeriod("all"),
  );
  const queryInput = useMemo(
    () => buildDashboardPeriodQuery(appliedPeriod, appliedRange),
    [appliedPeriod, appliedRange],
  );
  const validRange = isValidRange(appliedRange, appliedPeriod);
  const validDraftRange = isValidRange(draftRange, "custom");
  const query = useAdminPsychologistsDashboard(queryInput, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const displayRange =
    selectedPeriod !== "custom" && query.data
      ? { from: query.data.period.from, to: query.data.period.to }
      : draftRange;
  const handlePeriodChange = (nextPeriod: DashboardPeriodPreset) => {
    const nextRange = getDashboardRangeForPeriod(nextPeriod);
    setCustomRangeError(null);
    setSelectedPeriod(nextPeriod);
    setAppliedPeriod(nextPeriod);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
  };
  const handleDateChange = (field: keyof DashboardRange, value: string) => {
    setCustomRangeError(null);
    setSelectedPeriod("custom");
    setDraftRange({ ...displayRange, [field]: value });
  };
  const commitCustomRange = () => {
    if (selectedPeriod !== "custom") return;

    if (!validDraftRange) {
      setCustomRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setCustomRangeError(null);
    setSelectedPeriod("custom");
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
    const defaultRange = getDashboardRangeForPeriod("all");
    setCustomRangeError(null);
    setSelectedPeriod("all");
    setAppliedPeriod("all");
    setDraftRange(defaultRange);
    setAppliedRange(defaultRange);
  };
  const periodControls = (
    <DashboardPeriodControls
      displayRange={displayRange}
      onDateControlsBlur={handleDateControlsBlur}
      onDateChange={handleDateChange}
      onPeriodChange={handlePeriodChange}
      period={selectedPeriod}
      rangeError={customRangeError}
    />
  );

  return (
    <div className="space-y-7">
      <PsychologistsHeader />

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={resetPeriod}
        />
      ) : null}

      {validRange && query.isLoading ? (
        <DashboardOverviewPanel
          periodControls={periodControls}
          periodDescription={formatDraftSelectedPeriod(selectedPeriod, displayRange)}
        >
          <LoadingGrid />
          <div className="mt-4 h-[20rem] animate-pulse rounded-[1.5rem] border border-border/70 bg-surface-muted" />
        </DashboardOverviewPanel>
      ) : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? (
        <DashboardContent periodControls={periodControls} summary={query.data} />
      ) : null}
    </div>
  );
};
