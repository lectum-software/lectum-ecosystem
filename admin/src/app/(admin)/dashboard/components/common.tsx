"use client";

import { Activity, type LucideIcon } from "lucide-react";
import type { AdminDashboardSummary, DashboardMetric } from "@/api/req/dashboard";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";

import {
  formatChange,
  formatDate,
  formatMetricValue,
  SKELETON_KEYS,
} from "../modules/dashboard-support";

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

export const toneClasses = {
  blue: "bg-primary-soft text-primary",
  green: "bg-success/10 text-success",
  orange: "bg-warning/10 text-warning",
  pink: "bg-primary-soft text-primary",
  purple: "bg-primary-soft text-primary",
};

export const TrendBadge = ({ metric }: { metric: DashboardMetric }) => {
  if (metric.unavailable)
    return <span className="text-[0.68rem] font-semibold text-warning">Indisponível</span>;

  return (
    <span
      className={cn(
        "text-[0.68rem] font-semibold",
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
  icon: Icon,
  metric,
  tone,
}: {
  icon: LucideIcon;
  metric: DashboardMetric;
  tone: keyof typeof toneClasses;
}) => (
  <CardShell className="min-h-[7.25rem] rounded-card border-primary/20 p-3 transition duration-200 ease-out hover:border-primary/30 md:p-4">
    <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", toneClasses[tone])}>
      <Icon aria-hidden className="h-4 w-4" />
    </div>
    <div className="mt-4 min-w-0 space-y-1.5">
      <p className="min-h-8 text-xs font-semibold leading-4 text-foreground" title={metric.label}>
        {metric.label}
      </p>
      <p className="truncate whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.7rem]">
        {formatMetricValue(metric)}
      </p>
      <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
        <TrendBadge metric={metric} />
        <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
          vs. período anterior
        </span>
      </div>
    </div>
  </CardShell>
);

export const LoadingGrid = () => (
  <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {SKELETON_KEYS.map((key) => (
      <CardShell
        className="h-[9.25rem] animate-pulse bg-surface-muted"
        key={`dashboard-skeleton-${key}`}
      />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar o Dashboard"
  />
);

export const EmptyState = ({ period }: { period: AdminDashboardSummary["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <Activity aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-bold">Período sem registros agregáveis</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-muted">
          Nenhuma métrica foi encontrada entre {formatDate(period.from)} e {formatDate(period.to)}.
          Ajuste o período para visualizar dados já capturados.
        </p>
      </div>
    </div>
  </CardShell>
);
