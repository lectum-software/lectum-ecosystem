"use client";

import {
  AlertTriangle,
  CalendarDays,
  Eye,
  Flag,
  Loader2,
  type LucideIcon,
  MessageCircle,
  MoreHorizontal,
  RefreshCw,
  ShieldAlert,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { type FocusEventHandler, useMemo } from "react";
import { useAdminCommunitiesDashboard } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunitiesDashboard,
  CommunitiesDashboardActivitySeries,
  CommunitiesDashboardMetric,
  CommunitiesDashboardModerationAlert,
  CommunitiesDashboardPriorityAlert,
  CommunitiesDashboardQuery,
  CommunitiesDashboardRecentPost,
  CommunitiesDashboardTopCommunity,
} from "@/api/req/communities";
import { useDateRangeCommitOnBlur } from "@/hooks/use-date-range-commit-on-blur";
import { aggregateCalendarChartPoints } from "@/lib/chart-time-series";
import { cn } from "@/lib/utils";

const QUICK_RANGES = [7, 30, 90] as const;
const numberFormatter = new Intl.NumberFormat("pt-BR");

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

const isValidRange = (range: CommunitiesDashboardQuery) => {
  if (!range.from || !range.to) return false;

  return dateFromInput(range.from) <= dateFromInput(range.to);
};

const hasPeriodRecords = (summary: AdminCommunitiesDashboard) => {
  const hasCards = Object.values(summary.cards).some((card) => card.value > 0);
  const hasActivity = summary.activity_series.some((series) =>
    series.points.some((point) => point.value > 0),
  );

  return (
    hasCards ||
    hasActivity ||
    summary.patient_posts_breakdown.total > 0 ||
    summary.moderation_alerts.total > 0 ||
    summary.priority_alerts.total > 0 ||
    summary.recent_posts.total > 0 ||
    summary.top_communities.items.length > 0
  );
};

const CardShell = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <section
    className={cn("rounded-card border border-border bg-surface shadow-admin-soft", className)}
  >
    {children}
  </section>
);

const toneClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-emerald-50 text-emerald-600",
  orange: "bg-orange-50 text-orange-600",
  pink: "bg-pink-50 text-pink-600",
  purple: "bg-primary-soft text-primary",
};

const TrendBadge = ({ metric }: { metric: CommunitiesDashboardMetric }) => {
  if (metric.unavailable)
    return <span className="text-xs font-bold text-warning">Indisponível</span>;

  return (
    <span
      className={cn(
        "text-xs font-black",
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
  icon: Icon,
  metric,
  tone,
}: {
  icon: LucideIcon;
  metric: CommunitiesDashboardMetric;
  tone: keyof typeof toneClasses;
}) => (
  <CardShell className="min-h-40 p-4 sm:p-5">
    <div className="flex items-start justify-between gap-3">
      <div className={cn("grid h-11 w-11 place-items-center rounded-full", toneClasses[tone])}>
        <Icon aria-hidden className="h-5 w-5" />
      </div>
      <span className="rounded-full bg-surface-muted px-2 py-1 text-[0.65rem] font-bold text-muted">
        real
      </span>
    </div>
    <div className="mt-5 space-y-2">
      <p className="text-sm font-black text-foreground">{metric.label}</p>
      <p className="text-3xl font-black tracking-tight text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <TrendBadge metric={metric} />
        <span className="text-xs font-medium text-muted">vs. período anterior</span>
      </div>
      <p className="text-xs leading-relaxed text-muted">{metric.description}</p>
    </div>
  </CardShell>
);

const LoadingGrid = () => (
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
    {["a", "b", "c", "d", "e"].map((key) => (
      <CardShell className="h-40 animate-pulse bg-surface-muted" key={key} />
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
  isLoading,
  onDateChange,
  onDateControlsBlur,
  range,
  rangeError,
  setRange,
}: {
  isLoading: boolean;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  range: CommunitiesDashboardQuery;
  rangeError: string | null;
  setRange: (range: CommunitiesDashboardQuery) => void;
}) => (
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
    <div>
      <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
        Comunidades
      </h1>
      <p className="mt-2 text-sm font-medium text-muted">
        Acompanhe a atividade e o engajamento das comunidades.
      </p>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-black text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={range.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={range.from}
          />
        </label>
        <label className="text-xs font-black text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={range.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={range.to}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2 sm:w-44">
        {QUICK_RANGES.map((days) => (
          <button
            className="h-9 rounded-full border border-border bg-surface px-3 text-xs font-black text-muted transition hover:border-primary hover:text-primary"
            disabled={isLoading}
            key={days}
            onClick={() => setRange(getQuickRange(days))}
            type="button"
          >
            {days} dias
          </button>
        ))}
      </div>
      {rangeError ? <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p> : null}
    </div>
  </div>
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
    <figure className="mt-5 overflow-hidden">
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
      <div className="mt-3 overflow-x-auto">
        <svg
          aria-label="Gráfico de atividade real nas comunidades por dia"
          className="min-w-[680px]"
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

const PriorityAlerts = ({
  alerts,
  total,
}: {
  alerts: CommunitiesDashboardPriorityAlert[];
  total: number;
}) => {
  const severityClasses: Record<CommunitiesDashboardPriorityAlert["severity"], string> = {
    alta: "bg-red-50 text-danger",
    baixa: "bg-surface-muted text-muted",
    media: "bg-orange-50 text-orange-600",
  };

  return (
    <CardShell className="p-5 xl:row-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-foreground">Alertas de prioridade</h2>
          <p className="mt-1 text-xs font-bold text-muted">
            {numberFormatter.format(total)} denúncias pendentes reais
          </p>
        </div>
        <Flag aria-hidden className="h-5 w-5 text-danger" />
      </div>

      <div className="mt-5 space-y-3">
        {alerts.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
            Nenhuma denúncia pendente real foi encontrada neste período.
          </p>
        ) : (
          alerts.map((alert) => (
            <article className="rounded-2xl border border-red-100 bg-red-50/35 p-4" key={alert.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3">
                  <Flag aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <div>
                    <h3 className="text-sm font-black text-foreground">{alert.reason}</h3>
                    <p className="mt-1 text-xs font-bold text-muted">{alert.target_title}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[0.65rem] font-black capitalize",
                    severityClasses[alert.severity],
                  )}
                >
                  {alert.severity}
                </span>
              </div>
              {alert.community_name ? (
                <p className="mt-3 text-xs text-muted">Comunidade: {alert.community_name}</p>
              ) : null}
              <p className="mt-2 text-xs font-black text-foreground">
                {formatDateTime(alert.created_at)}
              </p>
            </article>
          ))
        )}
      </div>
    </CardShell>
  );
};

const MODERATION_DECISION_LABELS: Record<string, string> = {
  allow_sensitive: "Sensível publicado",
  block: "Bloqueado",
  safety_hold: "Segurado por segurança",
};

const MODERATION_SEVERITY_CLASSES: Record<string, string> = {
  high: "bg-red-50 text-danger",
  low: "bg-surface-muted text-muted",
  medium: "bg-orange-50 text-orange-600",
  urgent: "bg-red-600 text-white",
};

const ModerationAlerts = ({
  alerts,
  total,
  urgentTotal,
}: {
  alerts: CommunitiesDashboardModerationAlert[];
  total: number;
  urgentTotal: number;
}) => (
  <CardShell className="p-5">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-black text-foreground">Moderação automática</h2>
        <p className="mt-1 text-xs font-bold text-muted">
          {numberFormatter.format(total)} evento(s) pendentes ·{" "}
          {numberFormatter.format(urgentTotal)} urgente(s)
        </p>
      </div>
      <ShieldAlert aria-hidden className="h-5 w-5 text-danger" />
    </div>

    <div className="mt-5 space-y-3">
      {alerts.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhum evento automático pendente foi encontrado neste período.
        </p>
      ) : (
        alerts.map((alert) => (
          <article
            className="rounded-2xl border border-orange-100 bg-orange-50/35 p-4"
            key={alert.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-black text-foreground">
                  {MODERATION_DECISION_LABELS[alert.decision] ?? alert.decision}
                </h3>
                <p className="mt-1 line-clamp-2 text-xs font-bold text-muted">
                  {alert.content_excerpt}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full px-2 py-1 text-[0.65rem] font-black uppercase",
                  MODERATION_SEVERITY_CLASSES[alert.severity] ?? "bg-surface-muted text-muted",
                )}
              >
                {alert.severity}
              </span>
            </div>
            {alert.community_name ? (
              <p className="mt-3 text-xs text-muted">Comunidade: {alert.community_name}</p>
            ) : null}
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black text-foreground">
                {formatDateTime(alert.created_at)}
              </p>
              <Link
                className="text-xs font-black text-primary transition hover:text-primary-hover"
                href={`/moderacao?event=${encodeURIComponent(alert.id)}`}
              >
                Abrir evento
              </Link>
            </div>
          </article>
        ))
      )}
    </div>

    <Link
      className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
      href="/moderacao"
    >
      Ver central de moderação
    </Link>
  </CardShell>
);

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
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead className="text-xs text-muted">
            <tr>
              <th className="border-b border-border py-3 pr-4 font-black">Título</th>
              <th className="border-b border-border px-4 py-3 font-black">Autor</th>
              <th className="border-b border-border px-4 py-3 font-black">Discussão</th>
              <th className="border-b border-border px-4 py-3 font-black">Comentários</th>
              <th className="border-b border-border py-3 pl-4 text-right font-black">Ações</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="border-b border-border py-4 pr-4 align-top">
                  <p className="font-black text-foreground">{post.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {post.community_name} · {formatDateTime(post.created_at)}
                  </p>
                </td>
                <td className="border-b border-border px-4 py-4 align-top">
                  <p className="font-bold text-foreground">{post.author_name}</p>
                  <p className="text-xs capitalize text-muted">{post.author_role}</p>
                </td>
                <td className="border-b border-border px-4 py-4 align-top">
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 text-xs font-black",
                      post.discussion_status === "iniciada"
                        ? "bg-emerald-50 text-success"
                        : "bg-red-50 text-danger",
                    )}
                  >
                    {post.discussion_status === "iniciada" ? "Iniciada" : "Não iniciada"}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-4 align-top">
                  <span className="inline-flex items-center gap-2 font-black text-foreground">
                    <MessageCircle aria-hidden className="h-4 w-4 text-primary" />
                    {numberFormatter.format(post.comments_count)}
                  </span>
                </td>
                <td className="border-b border-border py-4 pl-4 text-right align-top">
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
        <span className="text-xs font-black text-primary">Ver todas</span>
      </div>

      {communities.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">
          Nenhuma comunidade real cadastrada foi encontrada.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[620px] border-separate border-spacing-0 text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="border-b border-border py-3 pr-4 font-black">Comunidade</th>
                <th className="border-b border-border px-4 py-3 font-black">Seguidores</th>
                <th className="border-b border-border px-4 py-3 font-black">Posts</th>
                <th className="border-b border-border py-3 pl-4 text-right font-black">Ações</th>
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
                      <div>
                        <p className="font-black text-foreground">{community.name}</p>
                        <p className="text-xs text-muted">
                          {community.activity_count} ações no período
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-border px-4 py-4 font-black">
                    {numberFormatter.format(community.members_count)}
                  </td>
                  <td className="border-b border-border px-4 py-4 font-black">
                    {numberFormatter.format(community.posts_count)}
                  </td>
                  <td className="border-b border-border py-4 pl-4 text-right">
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
      )}
    </CardShell>
  </div>
);

const DashboardContent = ({ summary }: { summary: AdminCommunitiesDashboard }) => {
  const noRecords = !hasPeriodRecords(summary);

  return (
    <div className="space-y-5">
      {noRecords ? <EmptyState period={summary.period} /> : null}

      <section
        aria-labelledby="activity-title"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <h2 className="sr-only" id="activity-title">
          Atividade nas comunidades
        </h2>
        <MetricCard icon={ShieldAlert} metric={summary.cards.psychologist_posts} tone="purple" />
        <MetricCard icon={Users} metric={summary.cards.patient_posts} tone="blue" />
        <MetricCard icon={MessageCircle} metric={summary.cards.psychologist_replies} tone="green" />
        <MetricCard icon={MessageCircle} metric={summary.cards.patient_comments} tone="orange" />
        <MetricCard icon={UsersRound} metric={summary.cards.active_members} tone="pink" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="grid gap-5 2xl:grid-cols-[1fr_320px]">
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

        <div className="space-y-5">
          <PriorityAlerts
            alerts={summary.priority_alerts.items}
            total={summary.priority_alerts.total}
          />
          <ModerationAlerts
            alerts={summary.moderation_alerts.items}
            total={summary.moderation_alerts.total}
            urgentTotal={summary.moderation_alerts.urgent_total}
          />
        </div>
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
  const {
    appliedRange,
    applyRange,
    draftRange,
    handleDateChange,
    handleDateControlsBlur,
    rangeError,
  } = useDateRangeCommitOnBlur<CommunitiesDashboardQuery>({
    initialRange: () => getQuickRange(7),
    isValidRange,
  });
  const validRange = isValidRange(appliedRange);
  const query = useAdminCommunitiesDashboard(appliedRange, { enabled: validRange });
  const queryError = query.error ? resolveApiError(query.error) : null;
  const periodCopy = useMemo(() => {
    if (!appliedRange.from || !appliedRange.to) return "Selecione um período válido";

    return `${formatDate(appliedRange.from)} — ${formatDate(appliedRange.to)}`;
  }, [appliedRange]);

  return (
    <div className="space-y-6">
      <CommunitiesHeader
        isLoading={query.isFetching}
        onDateChange={handleDateChange}
        onDateControlsBlur={handleDateControlsBlur}
        range={draftRange}
        rangeError={rangeError}
        setRange={applyRange}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <CalendarDays aria-hidden className="h-4 w-4" />
        <span className="font-bold">Período consultado:</span>
        <span>{periodCopy}</span>
        {query.data ? <span>({query.data.period.days} dias)</span> : null}
        {query.isFetching ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      </div>

      {!validRange ? (
        <ErrorState
          message="A data inicial precisa ser menor ou igual à data final."
          onRetry={() => applyRange(getQuickRange(7))}
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
