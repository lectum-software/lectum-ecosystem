"use client";

import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  type LucideIcon,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  Reply,
  UserRound,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { type FocusEventHandler, useCallback, useRef, useState } from "react";
import { useAdminCommunitiesDashboard } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunitiesDashboard,
  CommunitiesDashboardActivitySeries,
  CommunitiesDashboardGlobalStatistics,
  CommunitiesDashboardQuery,
  CommunitiesDashboardRecentPost,
  CommunitiesDashboardStatisticsDailyPoint,
  CommunitiesDashboardTopCommunity,
} from "@/api/req/communities";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { aggregateCalendarChartPoints, buildSmoothSvgPath } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const MAX_COMMUNITY_DASHBOARD_DAYS = 90;
const COMMUNITY_DASHBOARD_PERIOD_OPTIONS = [
  { id: "week", label: "Esta semana" },
  { id: "month", label: "Este mês" },
  { id: "last_90_days", label: "Últimos 90 dias" },
] as const;

type CommunityDashboardPeriodPreset = (typeof COMMUNITY_DASHBOARD_PERIOD_OPTIONS)[number]["id"];
type CommunityDashboardPeriodValue = CommunityDashboardPeriodPreset | "custom";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});
type DashboardStatisticDailyKey = Exclude<keyof CommunitiesDashboardStatisticsDailyPoint, "date">;
type DashboardStatisticMetricId =
  | "active_patients"
  | "active_psychologists"
  | "downvotes"
  | "followers_patients"
  | "followers_psychologists"
  | "new_active_patients"
  | "new_active_psychologists"
  | "patient_comments"
  | "patient_posts"
  | "profile_accesses"
  | "psychologist_posts"
  | "reports"
  | "saves"
  | "unverified_psychologist_replies"
  | "upvotes"
  | "verified_psychologist_replies"
  | "whatsapp_clicks";

type DashboardStatisticMetricConfig = {
  color: string;
  description: string;
  icon: LucideIcon;
  id: DashboardStatisticMetricId;
  key: DashboardStatisticDailyKey;
  label: string;
  tone: keyof typeof dashboardStatisticToneClasses;
};

type DashboardStatisticMetricItem = DashboardStatisticMetricConfig & {
  changePercent: number | null;
  details?: Array<{ label: string; percentage: number; value: number }>;
  previousValue: number;
  value: number;
};

const dashboardStatisticToneClasses = {
  blue: "bg-blue-50 text-blue-600",
  gray: "bg-slate-100 text-slate-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-red-50 text-red-500",
  purple: "bg-primary-soft text-primary",
  yellow: "bg-amber-50 text-amber-600",
};

const DASHBOARD_STATISTIC_METRIC_AGGREGATIONS: Partial<
  Record<DashboardStatisticDailyKey, "last" | "sum">
> = {
  followers_patients: "last",
  followers_psychologists: "last",
};

const DASHBOARD_PEOPLE_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "#2f8cff",
    description: "Psicólogos únicos seguindo ao menos uma comunidade.",
    icon: UserRound,
    id: "followers_psychologists",
    key: "followers_psychologists",
    label: "Psicólogos seguidores",
    tone: "blue",
  },
  {
    color: "#12b76a",
    description: "Pacientes únicos seguindo ao menos uma comunidade.",
    icon: UsersRound,
    id: "followers_patients",
    key: "followers_patients",
    label: "Pacientes seguidores",
    tone: "green",
  },
  {
    color: "#f59e0b",
    description: "Psicólogos únicos com atividade real no período.",
    icon: UserRound,
    id: "active_psychologists",
    key: "active_psychologists",
    label: "Psicólogos ativos",
    tone: "yellow",
  },
  {
    color: "#ef4444",
    description: "Pacientes únicos com atividade real no período.",
    icon: UsersRound,
    id: "active_patients",
    key: "active_patients",
    label: "Pacientes ativos",
    tone: "pink",
  },
  {
    color: "#657094",
    description: "Pacientes cuja primeira atividade ocorreu no período.",
    icon: Users,
    id: "new_active_patients",
    key: "new_active_patients",
    label: "Novos pacientes ativos",
    tone: "gray",
  },
  {
    color: "#8aa0c6",
    description: "Psicólogos cuja primeira atividade ocorreu no período.",
    icon: UserRound,
    id: "new_active_psychologists",
    key: "new_active_psychologists",
    label: "Novos psicólogos ativos",
    tone: "gray",
  },
];

const DASHBOARD_CONTENT_STATISTICS_METRICS: DashboardStatisticMetricConfig[] = [
  {
    color: "#12b76a",
    description: "Posts publicados por pacientes em todas as comunidades.",
    icon: FileText,
    id: "patient_posts",
    key: "patient_posts",
    label: "Postagens de pacientes",
    tone: "green",
  },
  {
    color: "#2f8cff",
    description: "Posts publicados por psicólogos em todas as comunidades.",
    icon: FileText,
    id: "psychologist_posts",
    key: "psychologist_posts",
    label: "Postagens de psicólogos",
    tone: "blue",
  },
  {
    color: "#f59e0b",
    description: "Respostas de psicólogos verificados em posts.",
    icon: Reply,
    id: "verified_psychologist_replies",
    key: "verified_psychologist_replies",
    label: "Respostas de psicólogos verificados",
    tone: "yellow",
  },
  {
    color: "#ef4444",
    description: "Respostas de psicólogos ainda não verificados.",
    icon: Reply,
    id: "unverified_psychologist_replies",
    key: "unverified_psychologist_replies",
    label: "Respostas de psicólogos não verificados",
    tone: "pink",
  },
  {
    color: "#657094",
    description: "Comentários criados por pacientes no período.",
    icon: MessageCircle,
    id: "patient_comments",
    key: "patient_comments",
    label: "Comentários de pacientes",
    tone: "gray",
  },
  {
    color: "#8aa0c6",
    description: "Denúncias registradas contra posts ou comentários.",
    icon: AlertTriangle,
    id: "reports",
    key: "reports",
    label: "Denúncias",
    tone: "gray",
  },
  {
    color: "#0ea5e9",
    description: "Votos positivos em posts e respostas.",
    icon: ArrowUp,
    id: "upvotes",
    key: "upvotes",
    label: "Votos positivos",
    tone: "blue",
  },
  {
    color: "#f97316",
    description: "Votos negativos em posts e respostas.",
    icon: ArrowDown,
    id: "downvotes",
    key: "downvotes",
    label: "Votos negativos",
    tone: "orange",
  },
  {
    color: "#6f42ff",
    description: "Salvamentos de posts e respostas.",
    icon: Bookmark,
    id: "saves",
    key: "saves",
    label: "Salvamentos",
    tone: "purple",
  },
  {
    color: "#22c55e",
    description: "Cliques de WhatsApp originados em conteúdos das comunidades.",
    icon: MessageCircle,
    id: "whatsapp_clicks",
    key: "whatsapp_clicks",
    label: "Cliques WhatsApp",
    tone: "green",
  },
  {
    color: "#94a3b8",
    description: "Acessos a perfis de psicólogos relacionados às comunidades.",
    icon: Eye,
    id: "profile_accesses",
    key: "profile_accesses",
    label: "Acessos a perfis",
    tone: "gray",
  },
];

const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const dateFromInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

const getQuickRange = (days: number): CommunitiesDashboardQuery => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return {
    from: toInputDate(from),
    to: toInputDate(today),
  };
};

const startOfCurrentWeek = () => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);

  return date;
};

const startOfCurrentMonth = () => {
  const date = new Date();
  date.setDate(1);

  return date;
};

const getCommunityDashboardRangeForPeriod = (
  period: CommunityDashboardPeriodPreset,
): CommunitiesDashboardQuery => {
  const today = toInputDate(new Date());

  if (period === "last_90_days") return getQuickRange(MAX_COMMUNITY_DASHBOARD_DAYS);
  if (period === "month") return { from: toInputDate(startOfCurrentMonth()), to: today };

  return { from: toInputDate(startOfCurrentWeek()), to: today };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(dateFromInput(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatChange = (value: number | null) => {
  if (value === null) return "sem base anterior";
  if (value === 0) return "0%";

  return `${value > 0 ? "+" : ""}${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
};

const formatShortRange = (from: string, to: string) => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });

  return `${formatter.format(dateFromInput(from))} - ${formatter.format(dateFromInput(to))}`;
};

const roundDashboardStatisticPercent = (value: number) => Math.round(value * 10) / 10;

const dashboardStatisticPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundDashboardStatisticPercent(((current - previous) / previous) * 100);
};

const dashboardStatisticPercentage = (value: number, total: number) =>
  total <= 0 ? 0 : roundDashboardStatisticPercent((value / total) * 100);

const dashboardStatisticValue = (
  statistics: CommunitiesDashboardGlobalStatistics,
  id: DashboardStatisticMetricId,
) => {
  switch (id) {
    case "active_patients":
      return statistics.counters.active_users.patients;
    case "active_psychologists":
      return statistics.counters.active_users.psychologists;
    case "downvotes":
      return statistics.counters.content_engagement.downvotes;
    case "followers_patients":
      return statistics.counters.followers.patients;
    case "followers_psychologists":
      return statistics.counters.followers.psychologists;
    case "new_active_patients":
      return statistics.counters.new_active_users.patients;
    case "new_active_psychologists":
      return statistics.counters.new_active_users.psychologists;
    case "patient_comments":
      return statistics.counters.replies.patient_comments;
    case "patient_posts":
      return statistics.counters.posts.patients;
    case "profile_accesses":
      return statistics.counters.content_engagement.profile_accesses;
    case "psychologist_posts":
      return statistics.counters.posts.psychologists;
    case "reports":
      return statistics.counters.reports.total;
    case "saves":
      return statistics.counters.content_engagement.saves;
    case "unverified_psychologist_replies":
      return statistics.counters.replies.unverified_psychologists;
    case "upvotes":
      return statistics.counters.content_engagement.upvotes;
    case "verified_psychologist_replies":
      return statistics.counters.replies.verified_psychologists;
    case "whatsapp_clicks":
      return statistics.counters.content_engagement.whatsapp_clicks;
  }
};

const patientPostDetails = (statistics: CommunitiesDashboardGlobalStatistics) => {
  const anonymous = statistics.counters.anonymous_posts.total;
  const identified = Math.max(0, statistics.counters.posts.patients - anonymous);
  const total = statistics.counters.posts.patients;

  return [
    {
      label: "Anônimos",
      percentage: dashboardStatisticPercentage(anonymous, total),
      value: anonymous,
    },
    {
      label: "Identificados",
      percentage: dashboardStatisticPercentage(identified, total),
      value: identified,
    },
  ];
};

const buildDashboardStatisticMetricItems = (
  current: CommunitiesDashboardGlobalStatistics,
  previous: CommunitiesDashboardGlobalStatistics,
  configs: DashboardStatisticMetricConfig[],
): DashboardStatisticMetricItem[] =>
  configs.map((config) => {
    const value = dashboardStatisticValue(current, config.id);
    const previousValue = dashboardStatisticValue(previous, config.id);

    return {
      ...config,
      changePercent: dashboardStatisticPercentageChange(value, previousValue),
      details: config.id === "patient_posts" ? patientPostDetails(current) : undefined,
      previousValue,
      value,
    };
  });

const totalDashboardStatisticValue = (statistics: CommunitiesDashboardGlobalStatistics) =>
  statistics.charts.daily.reduce(
    (total, point) =>
      total +
      point.active_patients +
      point.active_psychologists +
      point.anonymous_posts +
      point.downvotes +
      point.followers_patients +
      point.followers_psychologists +
      point.new_active_patients +
      point.new_active_psychologists +
      point.patient_comments +
      point.patient_posts +
      point.profile_accesses +
      point.psychologist_posts +
      point.reports +
      point.saves +
      point.unverified_psychologist_replies +
      point.upvotes +
      point.verified_psychologist_replies +
      point.whatsapp_clicks,
    0,
  );

const isValidRange = (range: CommunitiesDashboardQuery) => {
  if (!range.from || !range.to) return false;

  const from = dateFromInput(range.from);
  const to = dateFromInput(range.to);
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

  return from <= to && days <= MAX_COMMUNITY_DASHBOARD_DAYS;
};

const hasPeriodRecords = (summary: AdminCommunitiesDashboard) => {
  const hasCards = Object.values(summary.cards).some((card) => card.value > 0);
  const hasActivity = summary.activity_series.some((series) =>
    series.points.some((point) => point.value > 0),
  );

  return (
    hasCards ||
    hasActivity ||
    totalDashboardStatisticValue(summary.global_statistics.current) > 0 ||
    summary.patient_posts_breakdown.total > 0 ||
    summary.recent_posts.total > 0 ||
    summary.top_communities.items.length > 0
  );
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border bg-surface shadow-admin-soft",
      className,
    )}
  >
    {children}
  </section>
);

const LoadingGrid = () => (
  <div className="grid gap-5">
    {["people", "content"].map((key) => (
      <CardShell className="h-80 animate-pulse bg-surface-muted" key={key} />
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
          <h2 className="text-lg font-black">Não foi possível carregar Comunidades</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = ({ period }: { period: AdminCommunitiesDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <UsersRound aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem atividade capturada</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhum post, comentário, denúncia ou atividade real foi encontrado entre{" "}
          {formatDate(period.from)} e {formatDate(period.to)}. Ajuste o período ou aguarde novas
          interações.
        </p>
      </div>
    </div>
  </CardShell>
);

const CommunitiesHeader = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: CommunitiesDashboardQuery;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onPeriodChange: (period: CommunityDashboardPeriodPreset) => void;
  period: CommunityDashboardPeriodValue;
  rangeError: string | null;
}) => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Comunidades
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Dashboard de Comunidades
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
          Acompanhe a atividade e o engajamento das comunidades.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="communities-period">
          Período
          <span className="relative">
            <select
              className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id="communities-period"
              onChange={(event) =>
                onPeriodChange(event.target.value as CommunityDashboardPeriodPreset)
              }
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {COMMUNITY_DASHBOARD_PERIOD_OPTIONS.map((option) => (
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
        {period === "custom" && rangeError ? (
          <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
        ) : null}
      </div>
    </div>
  </section>
);

const LineChart = ({ series }: { series: CommunitiesDashboardActivitySeries[] }) => {
  const width = 760;
  const height = 300;
  const padding = { bottom: 44, left: 48, right: 20, top: 24 };
  const chartSeries = series.map((item) => ({
    ...item,
    points: aggregateCalendarChartPoints(item.points, ["value"] as const),
  }));
  const labels = chartSeries[0]?.points ?? [];
  const maxValue = Math.max(
    1,
    ...chartSeries.flatMap((item) => item.points.map((point) => point.value)),
  );
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (index: number) =>
    labels.length <= 1 ? width / 2 : padding.left + (index * chartWidth) / (labels.length - 1);
  const getY = (value: number) => padding.top + chartHeight - (value / maxValue) * chartHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));
  const labelStep = Math.max(1, Math.ceil(labels.length / 8));

  return (
    <figure className="mt-5 min-w-0 overflow-hidden">
      <div className="flex flex-wrap gap-3">
        {chartSeries.map((item) => (
          <span className="flex items-center gap-2 text-xs font-bold text-muted" key={item.id}>
            <span
              aria-hidden
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
      <div className="mt-3 min-w-0 overflow-hidden">
        <svg
          aria-label="Gráfico de atividade real nas comunidades por dia"
          className="h-auto w-full"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const y = getY(value);
            return (
              <g key={`grid-${value}-${y}`}>
                <line
                  stroke="#e8edf7"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <text fill="#657094" fontSize="11" x="8" y={y + 4}>
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}

          {chartSeries.map((item) => {
            const path = item.points
              .map(
                (point, index) => `${index === 0 ? "M" : "L"}${getX(index)},${getY(point.value)}`,
              )
              .join(" ");

            return (
              <g key={item.id}>
                <path
                  d={path}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeWidth="4"
                />
                {item.points.map((point, index) => (
                  <circle
                    cx={getX(index)}
                    cy={getY(point.value)}
                    fill="#fff"
                    key={`${item.id}-${point.date}`}
                    r="4"
                    stroke={item.color}
                    strokeWidth="3"
                  />
                ))}
              </g>
            );
          })}

          {labels.map((point, index) =>
            index % labelStep === 0 || index === labels.length - 1 ? (
              <text
                fill="#06104a"
                fontSize="11"
                key={point.date}
                textAnchor="middle"
                x={getX(index)}
                y={height - 12}
              >
                {point.chartLabel}
              </text>
            ) : null,
          )}
        </svg>
      </div>
      <details className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs text-muted">
        <summary className="cursor-pointer font-black text-foreground">
          Resumo textual do gráfico
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {chartSeries.map((item) => (
            <div key={item.id}>
              <p className="font-black text-foreground">{item.label}</p>
              <p>
                {item.points.map((point) => `${point.tooltipLabel}: ${point.value}`).join("; ")}
              </p>
            </div>
          ))}
        </div>
      </details>
    </figure>
  );
};

const DashboardStatisticCard = ({
  item,
  onToggle,
  previousLabel,
  selected,
}: {
  item: DashboardStatisticMetricItem;
  onToggle: (id: DashboardStatisticMetricId) => void;
  previousLabel: string;
  selected: boolean;
}) => {
  const Icon = item.icon;
  const formattedValue = numberFormatter.format(item.value);
  const detailTitle = item.details
    ?.map(
      (detail) =>
        `${detail.label}: ${numberFormatter.format(detail.value)} (${percentageFormatter.format(
          detail.percentage,
        )}%)`,
    )
    .join(". ");

  return (
    <button
      aria-pressed={selected}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        selected
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={() => onToggle(item.id)}
      title={`${item.label}: ${formattedValue}. ${formatChange(
        item.changePercent,
      )} vs. ${previousLabel}. ${detailTitle ? `${detailTitle}. ` : ""}${
        selected ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-full",
          dashboardStatisticToneClasses[item.tone],
        )}
      >
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="mt-4 block min-w-0 max-w-full">
        <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
          {item.label}
        </span>
        <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
          {formattedValue}
        </span>
        <span className="mt-3 block text-xs leading-5">
          <span
            className={cn(
              "font-extrabold",
              item.changePercent === null
                ? "text-muted"
                : item.changePercent > 0
                  ? "text-success"
                  : item.changePercent < 0
                    ? "text-danger"
                    : "text-muted",
            )}
          >
            {formatChange(item.changePercent)}
          </span>
          <span className="ml-1 font-bold text-muted">vs. {previousLabel}</span>
        </span>

        {item.details?.length ? (
          <span className="mt-3 grid gap-1">
            {item.details.map((detail) => (
              <span
                className="flex items-center justify-between gap-2 rounded-full bg-surface-muted px-2 py-1 text-[11px] font-extrabold leading-none text-muted"
                key={detail.label}
              >
                <span className="truncate">{detail.label}</span>
                <span className="shrink-0 text-foreground">
                  {`${numberFormatter.format(detail.value)} (${percentageFormatter.format(
                    detail.percentage,
                  )}%)`}
                </span>
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <span className="sr-only">{selected ? "visível no gráfico" : "oculto no gráfico"}</span>
    </button>
  );
};

const DashboardStatisticsMetricGrid = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => (
  <fieldset className="mt-5 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
    <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
    {metrics.map((metric) => (
      <DashboardStatisticCard
        item={metric}
        key={metric.id}
        onToggle={onToggleMetric}
        previousLabel={previousLabel}
        selected={visibleMetricIds.includes(metric.id)}
      />
    ))}
  </fieldset>
);

const DashboardStatisticsMetricCarousel = ({
  metrics,
  onToggleMetric,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (metricId: DashboardStatisticMetricId) => void;
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollMetrics = useCallback((direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      behavior: "smooth",
      left: direction * Math.max(260, scroller.clientWidth * 0.82),
    });
  }, []);

  return (
    <fieldset className="mt-5 min-w-0">
      <legend className="sr-only">Contadores exibidos no gráfico de {title}</legend>
      <div className="relative min-w-0 px-11 sm:px-12">
        <button
          aria-label={`Rolar contadores de ${title} para a esquerda`}
          className="absolute left-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-muted shadow-sm transition hover:border-primary/35 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(-1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
        </button>
        <div
          className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          ref={scrollerRef}
        >
          {metrics.map((metric) => (
            <div
              className="flex w-full shrink-0 snap-start sm:w-[calc((100%_-_0.5rem)/2)] lg:w-[calc((100%_-_1rem)/3)] 2xl:w-[calc((100%_-_2.5rem)/6)]"
              key={metric.id}
            >
              <DashboardStatisticCard
                item={metric}
                onToggle={onToggleMetric}
                previousLabel={previousLabel}
                selected={visibleMetricIds.includes(metric.id)}
              />
            </div>
          ))}
        </div>
        <button
          aria-label={`Rolar contadores de ${title} para a direita`}
          className="absolute right-0 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-primary/25 bg-primary-soft text-primary shadow-sm transition hover:border-primary/45 hover:bg-primary-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          onClick={() => scrollMetrics(1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </fieldset>
  );
};

const DashboardStatisticsLineChart = ({
  items,
  points,
}: {
  items: DashboardStatisticMetricItem[];
  points: CommunitiesDashboardStatisticsDailyPoint[];
}) => {
  if (items.length === 0) {
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

  const chartWidth = 1120;
  const chartHeight = 280;
  const padding = { bottom: 28, left: 42, right: 28, top: 28 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const metricKeys = items.map((item) => item.key);
  const chartPoints = aggregateCalendarChartPoints(points, metricKeys, {
    dayThreshold: 45,
    metricAggregations: DASHBOARD_STATISTIC_METRIC_AGGREGATIONS,
  });
  const max = Math.max(
    1,
    ...items.flatMap((item) => chartPoints.map((point) => Number(point[item.key] ?? 0))),
  );
  const xFor = (index: number) =>
    padding.left +
    (chartPoints.length <= 1 ? innerWidth / 2 : (index / (chartPoints.length - 1)) * innerWidth);
  const yFor = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    id: String(ratio),
    value: Math.round(max * ratio),
  }));
  const labelStep = Math.max(1, Math.ceil(chartPoints.length / 8));
  const dateLabels = chartPoints.flatMap((point, index) =>
    index % labelStep === 0 || index === chartPoints.length - 1
      ? [{ date: point.date, label: point.chartLabel }]
      : [],
  );

  return (
    <div className="mt-4 w-full overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <div className="mx-auto w-full min-w-[760px] max-w-[1120px]">
        <svg
          aria-label="Evolução do período por contador selecionado"
          className="block h-auto w-full"
          height={chartHeight}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          width={chartWidth}
        >
          <title>Evolução do período</title>
          {gridValues.map(({ id, value }) => {
            const y = yFor(value);

            return (
              <g key={`dashboard-statistics-grid-${id}`}>
                <line
                  className="stroke-border"
                  opacity="0.44"
                  strokeDasharray={value === 0 ? "0" : "4 6"}
                  strokeWidth="1"
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                />
                <text
                  className="fill-muted text-[10px] font-medium"
                  dominantBaseline="middle"
                  textAnchor="end"
                  x={padding.left - 8}
                  y={y}
                >
                  {numberFormatter.format(value)}
                </text>
              </g>
            );
          })}
          {items.map((item) => {
            const linePoints = chartPoints.map((point, index) => ({
              x: xFor(index),
              y: yFor(Number(point[item.key] ?? 0)),
            }));
            const linePath = buildSmoothSvgPath(linePoints);

            return (
              <path
                d={linePath}
                fill="none"
                key={item.id}
                stroke={item.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.05"
              />
            );
          })}
          {items.map((item) =>
            chartPoints.map((point, index) => {
              const value = Number(point[item.key] ?? 0);

              return (
                <circle
                  cx={xFor(index)}
                  cy={yFor(value)}
                  fill="#ffffff"
                  key={`${item.id}-${point.date}`}
                  opacity={index === chartPoints.length - 1 ? "1" : "0.72"}
                  r={index === chartPoints.length - 1 ? "3.1" : "2.1"}
                  stroke={item.color}
                  strokeWidth="1.45"
                >
                  <title>
                    {point.tooltipLabel} · {item.label}: {numberFormatter.format(value)}
                  </title>
                </circle>
              );
            }),
          )}
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
    </div>
  );
};

const DashboardStatisticsSection = ({
  counterLayout = "grid",
  description,
  metrics,
  onToggleMetric,
  points,
  previousLabel,
  title,
  visibleMetricIds,
}: {
  counterLayout?: "carousel" | "grid";
  description: string;
  metrics: DashboardStatisticMetricItem[];
  onToggleMetric: (id: DashboardStatisticMetricId) => void;
  points: CommunitiesDashboardStatisticsDailyPoint[];
  previousLabel: string;
  title: string;
  visibleMetricIds: DashboardStatisticMetricId[];
}) => {
  const visibleMetrics = metrics.filter((item) => visibleMetricIds.includes(item.id));

  return (
    <CardShell className="p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
        <p className="mt-1 text-sm font-medium text-muted">{description}</p>
      </div>
      {counterLayout === "grid" ? (
        <DashboardStatisticsMetricGrid
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      ) : (
        <DashboardStatisticsMetricCarousel
          metrics={metrics}
          onToggleMetric={onToggleMetric}
          previousLabel={previousLabel}
          title={title}
          visibleMetricIds={visibleMetricIds}
        />
      )}
      <DashboardStatisticsLineChart items={visibleMetrics} points={points} />
    </CardShell>
  );
};

const PatientPostsDonut = ({
  breakdown,
}: {
  breakdown: AdminCommunitiesDashboard["patient_posts_breakdown"];
}) => {
  const circumference = 2 * Math.PI * 42;
  const anonymousDash = (breakdown.anonymous.percentage / 100) * circumference;
  const identifiedDash = (breakdown.identified.percentage / 100) * circumference;

  return (
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Posts de pacientes</h2>
          <p className="mt-1 text-xs font-bold text-muted">{breakdown.source}</p>
        </div>
        <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-black text-muted">
          Total {numberFormatter.format(breakdown.total)}
        </span>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
        <svg aria-label="Posts anônimos e identificados" role="img" viewBox="0 0 120 120">
          <circle cx="60" cy="60" fill="none" r="42" stroke="#eef2fb" strokeWidth="18" />
          <circle
            cx="60"
            cy="60"
            fill="none"
            r="42"
            stroke="#2f8cff"
            strokeDasharray={`${anonymousDash} ${circumference - anonymousDash}`}
            strokeWidth="18"
            transform="rotate(-90 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            fill="none"
            r="42"
            stroke="#6f42ff"
            strokeDasharray={`${identifiedDash} ${circumference - identifiedDash}`}
            strokeDashoffset={-anonymousDash}
            strokeWidth="18"
            transform="rotate(-90 60 60)"
          />
          <text fill="#06104a" fontSize="12" fontWeight="900" textAnchor="middle" x="60" y="56">
            Total
          </text>
          <text fill="#06104a" fontSize="16" fontWeight="900" textAnchor="middle" x="60" y="74">
            {numberFormatter.format(breakdown.total)}
          </text>
        </svg>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="h-3 w-3 rounded-full bg-[#2f8cff]" /> Anônimos
            </span>
            <span className="text-sm font-black">
              {breakdown.anonymous.percentage}% ({numberFormatter.format(breakdown.anonymous.count)}
              )
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-bold">
              <span className="h-3 w-3 rounded-full bg-[#6f42ff]" /> Identificados
            </span>
            <span className="text-sm font-black">
              {breakdown.identified.percentage}% (
              {numberFormatter.format(breakdown.identified.count)})
            </span>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

const RecentPostsTable = ({ posts }: { posts: CommunitiesDashboardRecentPost[] }) => (
  <CardShell className="p-5">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-foreground">Postagens mais recentes</h2>
        <p className="mt-1 text-xs font-bold text-muted">community_post + post_reply</p>
      </div>
      <span className="text-xs font-black text-primary">Ver todas</span>
    </div>

    {posts.length === 0 ? (
      <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma postagem real encontrada no período.
      </p>
    ) : (
      <>
        <div className="mt-5 grid gap-3 md:hidden">
          {posts.map((post) => (
            <article
              className="rounded-2xl border border-border bg-surface-muted p-4"
              key={post.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-foreground">{post.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {post.community_name} · {formatDateTime(post.created_at)}
                  </p>
                </div>
                <Link
                  aria-label={`Abrir comunidade ${post.community_name}`}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-primary transition hover:border-primary"
                  href={`/comunidades/${post.community_slug}`}
                >
                  <Eye aria-hidden className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted">
                <p>
                  <strong className="text-foreground">Autor:</strong> {post.author_name} ·{" "}
                  <span className="capitalize">{post.author_role}</span>
                </p>
                <p>
                  <strong className="text-foreground">Discussão:</strong>{" "}
                  {post.discussion_status === "iniciada" ? "Iniciada" : "Não iniciada"}
                </p>
                <p>
                  <strong className="text-foreground">Comentários:</strong>{" "}
                  {numberFormatter.format(post.comments_count)}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="w-[38%] border-b border-border py-3 pr-3 font-black">Título</th>
                <th className="w-[22%] border-b border-border px-3 py-3 font-black">Autor</th>
                <th className="w-[16%] border-b border-border px-3 py-3 font-black">Discussão</th>
                <th className="w-[14%] border-b border-border px-3 py-3 font-black">Comentários</th>
                <th className="w-[10%] border-b border-border py-3 pl-3 text-right font-black">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="min-w-0 border-b border-border py-4 pr-3 align-top">
                    <p className="truncate font-black text-foreground">{post.title}</p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {post.community_name} · {formatDateTime(post.created_at)}
                    </p>
                  </td>
                  <td className="min-w-0 border-b border-border px-3 py-4 align-top">
                    <p className="truncate font-bold text-foreground">{post.author_name}</p>
                    <p className="truncate text-xs capitalize text-muted">{post.author_role}</p>
                  </td>
                  <td className="border-b border-border px-3 py-4 align-top">
                    <span
                      className={cn(
                        "inline-flex max-w-full rounded-full px-2 py-1 text-xs font-black",
                        post.discussion_status === "iniciada"
                          ? "bg-emerald-50 text-success"
                          : "bg-red-50 text-danger",
                      )}
                    >
                      {post.discussion_status === "iniciada" ? "Iniciada" : "Não iniciada"}
                    </span>
                  </td>
                  <td className="border-b border-border px-3 py-4 align-top">
                    <span className="inline-flex items-center gap-2 font-black text-foreground">
                      <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                      {numberFormatter.format(post.comments_count)}
                    </span>
                  </td>
                  <td className="border-b border-border py-4 pl-3 text-right align-top">
                    <div className="inline-flex gap-2">
                      <Link
                        aria-label={`Abrir comunidade ${post.community_name}`}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-border text-primary transition hover:border-primary"
                        href={`/comunidades/${post.community_slug}`}
                      >
                        <Eye aria-hidden className="h-4 w-4" />
                      </Link>
                      <button
                        aria-label="Mais ações indisponíveis nesta versão"
                        className="grid h-9 w-9 place-items-center rounded-xl border border-border text-muted"
                        type="button"
                      >
                        <MoreHorizontal aria-hidden className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </CardShell>
);

const TopCommunitiesTable = ({
  communities,
}: {
  communities: CommunitiesDashboardTopCommunity[];
}) => (
  <div className="scroll-mt-6" id="lista-de-comunidades">
    <CardShell className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Principais comunidades</h2>
          <p className="mt-1 text-xs font-bold text-muted">ranking por atividade real no período</p>
        </div>
        <Link
          className="text-xs font-black text-primary transition hover:text-primary-hover"
          href="/comunidades/lista"
        >
          Ver todas
        </Link>
      </div>

      {communities.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade real cadastrada foi encontrada.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:hidden">
            {communities.map((community) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={community.id}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: community.visual_primary_color || "#3b16f3" }}
                    >
                      <UsersRound className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-foreground">{community.name}</p>
                      <p className="text-xs text-muted">
                        {community.activity_count} ações no período
                      </p>
                    </div>
                  </div>
                  <Link
                    aria-label={`Abrir detalhes de ${community.name}`}
                    className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-surface text-primary transition hover:border-primary"
                    href={`/comunidades/${community.slug}`}
                  >
                    <Eye aria-hidden className="h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Seguidores</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.members_count)}
                    </strong>
                  </p>
                  <p className="rounded-xl bg-surface p-3">
                    <span className="block text-muted">Posts</span>
                    <strong className="text-sm text-foreground">
                      {numberFormatter.format(community.posts_count)}
                    </strong>
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-5 hidden min-w-0 overflow-hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
              <thead className="text-xs text-muted">
                <tr>
                  <th className="w-[58%] border-b border-border py-3 pr-3 font-black">
                    Comunidade
                  </th>
                  <th className="w-[16%] border-b border-border px-3 py-3 font-black">
                    Seguidores
                  </th>
                  <th className="w-[14%] border-b border-border px-3 py-3 font-black">Posts</th>
                  <th className="w-[12%] border-b border-border py-3 pl-3 text-right font-black">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {communities.map((community) => (
                  <tr key={community.id}>
                    <td className="border-b border-border py-4 pr-4">
                      <div className="flex items-center gap-3">
                        <span
                          aria-hidden
                          className="grid h-9 w-9 place-items-center rounded-xl text-white"
                          style={{ backgroundColor: community.visual_primary_color || "#3b16f3" }}
                        >
                          <UsersRound className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-black text-foreground">{community.name}</p>
                          <p className="truncate text-xs text-muted">
                            {community.activity_count} ações no período
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="border-b border-border px-3 py-4 font-black">
                      {numberFormatter.format(community.members_count)}
                    </td>
                    <td className="border-b border-border px-3 py-4 font-black">
                      {numberFormatter.format(community.posts_count)}
                    </td>
                    <td className="border-b border-border py-4 pl-3 text-right">
                      <Link
                        aria-label={`Abrir detalhes de ${community.name}`}
                        className="inline-grid h-9 w-9 place-items-center rounded-xl border border-border text-primary transition hover:border-primary"
                        href={`/comunidades/${community.slug}`}
                      >
                        <Eye aria-hidden className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </CardShell>
  </div>
);

const DashboardContent = ({ summary }: { summary: AdminCommunitiesDashboard }) => {
  const noRecords = !hasPeriodRecords(summary);
  const [visiblePeopleMetricIds, setVisiblePeopleMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_PEOPLE_STATISTICS_METRICS.map((item) => item.id));
  const [visibleContentMetricIds, setVisibleContentMetricIds] = useState<
    DashboardStatisticMetricId[]
  >(() => DASHBOARD_CONTENT_STATISTICS_METRICS.map((item) => item.id));
  const previousLabel = formatShortRange(summary.period.previous_from, summary.period.previous_to);
  const peopleMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_PEOPLE_STATISTICS_METRICS,
  );
  const contentMetrics = buildDashboardStatisticMetricItems(
    summary.global_statistics.current,
    summary.global_statistics.previous,
    DASHBOARD_CONTENT_STATISTICS_METRICS,
  );
  const togglePeopleMetric = (id: DashboardStatisticMetricId) => {
    setVisiblePeopleMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };
  const toggleContentMetric = (id: DashboardStatisticMetricId) => {
    setVisibleContentMetricIds((current) =>
      current.includes(id)
        ? current.length > 1
          ? current.filter((item) => item !== id)
          : current
        : [...current, id],
    );
  };

  return (
    <div className="min-w-0 space-y-5 overflow-x-hidden">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <DashboardStatisticsSection
        counterLayout="grid"
        description="Visão geral de psicólogos e pacientes em todas as comunidades."
        metrics={peopleMetrics}
        onToggleMetric={togglePeopleMetric}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de pessoas"
        visibleMetricIds={visiblePeopleMetricIds}
      />

      <DashboardStatisticsSection
        counterLayout="carousel"
        description="Conteúdo e engajamento agregados de todas as comunidades."
        metrics={contentMetrics}
        onToggleMetric={toggleContentMetric}
        points={summary.global_statistics.current.charts.daily}
        previousLabel={previousLabel}
        title="Estatísticas de conteúdo"
        visibleMetricIds={visibleContentMetricIds}
      />

      <div className="min-w-0 space-y-5">
        <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
          <CardShell className="p-5">
            <div>
              <h2 className="text-lg font-black text-foreground">Atividade nas comunidades</h2>
              <p className="mt-1 text-xs font-bold text-muted">
                community_post + post_reply, segmentado por papel do autor
              </p>
            </div>
            <LineChart series={summary.activity_series} />
          </CardShell>
          <PatientPostsDonut breakdown={summary.patient_posts_breakdown} />
        </div>

        <RecentPostsTable posts={summary.recent_posts.items} />
        <TopCommunitiesTable communities={summary.top_communities.items} />
      </div>

      {summary.unavailable.length > 0 ? (
        <CardShell className="p-4">
          <div className="flex gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <h2 className="font-black text-foreground">Métricas indisponíveis ou vazias</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
                {summary.unavailable.map((item) => (
                  <li key={item.id}>
                    <strong className="text-foreground">{item.label}:</strong> {item.description}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardShell>
      ) : null}
    </div>
  );
};

export const AdminCommunitiesClient = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<CommunityDashboardPeriodValue>("week");
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange: handleDraftDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<CommunitiesDashboardQuery>({
    errorMessage:
      "Informe um período personalizado completo, de até 90 dias, com data inicial menor ou igual à final.",
    initialRange: () => getCommunityDashboardRangeForPeriod("week"),
    isValidRange,
  });
  const validRange = isValidRange(appliedRange);
  const query = useAdminCommunitiesDashboard(appliedRange, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const handlePeriodChange = (nextPeriod: CommunityDashboardPeriodPreset) => {
    setSelectedPeriod(nextPeriod);
    applyRange(getCommunityDashboardRangeForPeriod(nextPeriod));
  };
  const handleDateChange = (field: "from" | "to", value: string) => {
    setSelectedPeriod("custom");
    handleDraftDateChange(field, value);
  };

  return (
    <div className="min-w-0 overflow-x-hidden space-y-7">
      <CommunitiesHeader
        displayRange={draftRange}
        onDateChange={handleDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        onPeriodChange={handlePeriodChange}
        period={selectedPeriod}
        rangeError={rangeError}
      />

      {!validRange ? (
        <ErrorState
          message="Selecione um período válido de até 90 dias."
          onRetry={() => handlePeriodChange("week")}
        />
      ) : null}

      {validRange && query.isLoading ? <LoadingGrid /> : null}

      {validRange && query.isError && queryError ? (
        <ErrorState message={queryError} onRetry={() => void query.refetch()} />
      ) : null}

      {validRange && query.data ? <DashboardContent summary={query.data} /> : null}
    </div>
  );
};
