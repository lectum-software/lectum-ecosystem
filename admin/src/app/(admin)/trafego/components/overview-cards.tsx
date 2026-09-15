"use client";

import { Activity, Globe2, type LucideIcon, RefreshCw, Users } from "lucide-react";
import type { AdminTrafficSummary, TrafficMetric, TrafficOnlineNow } from "@/api/req/traffic";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

import {
  formatChange,
  formatDate,
  formatMetricValue,
  formatTime,
  numberFormatter,
  SKELETON_KEYS,
  TRAFFIC_OVERVIEW_CHART_ORDER,
  type TrafficOverviewCardKey,
  type TrafficOverviewMetricKey,
} from "../modules/traffic-support";

export const CardShell = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

export const hexToRgba = colorWithAlpha;

export const TRAFFIC_OVERVIEW_METRIC_CONFIG = {
  new_visitors: { color: "var(--admin-chart-accent)", icon: Users },
  recurring_visitors: { color: "var(--admin-warning)", icon: RefreshCw },
  sessions: { color: "var(--admin-primary)", icon: Globe2 },
  unique_visitors: { color: "var(--admin-success)", icon: Users },
} satisfies Record<TrafficOverviewCardKey, { color: string; icon: LucideIcon }>;

export const isTrafficOverviewMetricKey = (
  key: TrafficOverviewCardKey,
): key is TrafficOverviewMetricKey =>
  (TRAFFIC_OVERVIEW_CHART_ORDER as readonly string[]).includes(key);

export const TrendBadge = ({ metric }: { metric: TrafficMetric }) => {
  if (metric.unavailable)
    return <span className="text-[0.68rem] font-semibold text-warning">Indisponível</span>;

  const lowerIsBetter = metric.id === "bounce_rate";
  const trendClass = cn(
    "text-[0.68rem] font-semibold",
    metric.trend === "flat" && "text-muted",
    metric.trend === "unavailable" && "text-muted",
    metric.trend === "up" && (lowerIsBetter ? "text-danger" : "text-success"),
    metric.trend === "down" && (lowerIsBetter ? "text-success" : "text-danger"),
  );

  return <span className={trendClass}>{formatChange(metric.change_percent)}</span>;
};

export const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
  rate,
}: {
  active?: boolean;
  color: string;
  icon: LucideIcon;
  metric: TrafficMetric;
  onToggle?: () => void;
  rate?: string | null;
}) => {
  const formattedValue = formatMetricValue(metric);
  const titleValue = rate ? `${formattedValue} (${rate})` : formattedValue;
  const isInteractive = Boolean(onToggle);
  const isActive = active ?? true;
  const statusLabel = isInteractive
    ? isActive
      ? "Visível no gráfico"
      : "Oculto no gráfico"
    : "Contador agregado do período";
  const className = cn(
    "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
    isActive
      ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
      : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
  );
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p className="min-h-8 text-xs font-semibold leading-4 text-foreground" title={metric.label}>
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-2 truncate whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.7rem]">
          <span className="truncate">{formattedValue}</span>
          {rate ? (
            <span className="shrink-0 text-base font-medium tracking-normal text-muted xl:text-sm">
              ({rate})
            </span>
          ) : null}
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        <span className="sr-only">{statusLabel.toLowerCase()}</span>
      </div>
    </>
  );

  if (!isInteractive) {
    return (
      <div className={className} title={`${metric.label}: ${titleValue}. ${statusLabel}`}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-pressed={isActive}
      className={className}
      onClick={onToggle}
      title={`${metric.label}: ${titleValue}. ${statusLabel}`}
      type="button"
    >
      {content}
    </button>
  );
};

export const LoadingGrid = () => (
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-[9.25rem] animate-pulse bg-surface-muted"
        key={`traffic-skeleton-${key}`}
      />
    ))}
  </div>
);

export const OnlineNowSkeleton = () => (
  <CardShell className="h-[13rem] animate-pulse border-primary/15 bg-primary-soft/25" />
);

export const OnlineNowStat = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl border border-border/70 bg-surface/85 p-3">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className="mt-1 text-xl font-black text-foreground">{numberFormatter.format(value)}</p>
  </div>
);

export const OnlineNowPanel = ({ onlineNow }: { onlineNow: TrafficOnlineNow }) => {
  const updatedAt = formatTime(onlineNow.window.to);
  const counters = [
    { label: "Sess\u00f5es ativas", value: onlineNow.active_sessions },
    { label: "Novos visitantes", value: onlineNow.new_visitors },
    { label: "Pacientes", value: onlineNow.patients },
    { label: "Psic\u00f3logos", value: onlineNow.psychologists },
    { label: "N\u00e3o autenticados", value: onlineNow.anonymous_visitors },
  ];

  return (
    <CardShell className="border-primary/20 bg-primary-soft/25 p-5 md:p-6">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-success/20 bg-success/10 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-success">
            <span className="relative flex h-2.5 w-2.5" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            Tempo real
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-foreground">
            Usu&aacute;rios online agora
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-muted">
            Visitantes com sess&atilde;o atualizada nos &uacute;ltimos {onlineNow.window.minutes}{" "}
            minutos. Atualizado &agrave;s {updatedAt}.
          </p>
        </div>

        <div className="rounded-[1.75rem] border border-primary/25 bg-surface p-5 shadow-admin-soft xl:min-w-[14rem] xl:text-right">
          <p className="text-4xl font-black tracking-tight text-foreground">
            {numberFormatter.format(onlineNow.unique_visitors)}
          </p>
          <p className="mt-1 text-sm font-black text-muted">visitantes ativos</p>
        </div>
      </div>

      <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {counters.map((counter) => (
          <OnlineNowStat
            key={`online-now-counter-${counter.label}`}
            label={counter.label}
            value={counter.value}
          />
        ))}
      </div>
    </CardShell>
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Tráfego"
  />
);

export const EmptyState = ({ period }: { period: AdminTrafficSummary["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-black">Período sem tráfego capturado</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhuma sessão, acesso ou interação foi encontrada entre {formatDate(period.from)} e{" "}
          {formatDate(period.to)}. Ajuste o período ou aguarde a captura do tracking público.
        </p>
      </div>
    </div>
  </CardShell>
);
