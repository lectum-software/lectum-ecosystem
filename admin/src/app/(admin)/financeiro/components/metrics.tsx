"use client";

import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import type { AdminFinanceDashboard, FinanceMetric } from "@/api/req/finance";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

import {
  CARD_ORDER,
  decimalFormatter,
  formatChange,
  formatMoney,
  formatPercent,
  numberFormatter,
} from "../modules/finance-support";

export const CardShell = ({
  children,
  className,
}: {
  children?: React.ReactNode;
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

export const TrendBadge = ({ metric }: { metric: FinanceMetric }) => (
  <span
    className={cn(
      "inline-flex min-w-0 items-center gap-1 whitespace-nowrap text-[0.68rem] font-semibold",
      metric.trend === "up" && "text-success",
      metric.trend === "down" && "text-danger",
      (metric.trend === "flat" || metric.trend === "unavailable") && "text-muted",
    )}
  >
    {metric.trend === "up" ? <TrendingUp aria-hidden className="h-3.5 w-3.5" /> : null}
    {metric.trend === "down" ? <TrendingDown aria-hidden className="h-3.5 w-3.5" /> : null}
    {formatChange(metric.change_percent)}
  </span>
);

export const MetricValue = ({ metric }: { metric: FinanceMetric }) => {
  if (!metric.available) {
    return <span className="min-w-0 truncate text-muted">Indisponível</span>;
  }

  if (metric.unit === "currency_cents") {
    return <span className="min-w-0 truncate">{formatMoney(metric.value)}</span>;
  }

  return <span className="min-w-0 truncate">{numberFormatter.format(metric.value)}</span>;
};

export const LtvValue = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => {
  if (dashboard.average_ltv.available) {
    return <span>{formatMoney(dashboard.average_ltv.value_cents)}</span>;
  }

  return <span className="text-muted">Indisponível</span>;
};

export const LifetimeValue = ({ dashboard }: { dashboard: AdminFinanceDashboard }) => {
  const lifetime = dashboard.average_subscription_lifetime;

  if (!lifetime.available) {
    return <span className="text-muted">Indisponível</span>;
  }

  if (lifetime.value_months >= 1) {
    return (
      <span>
        {decimalFormatter.format(lifetime.value_months)}{" "}
        {lifetime.value_months === 1 ? "mês" : "meses"}
      </span>
    );
  }

  return (
    <span>
      {decimalFormatter.format(lifetime.value_days)} {lifetime.value_days === 1 ? "dia" : "dias"}
    </span>
  );
};

export const AnalysisPeriodNote = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-1 text-xs font-medium leading-5 text-muted">{children}</p>
);

export const ChurnRate = ({ metric }: { metric: FinanceMetric }) => {
  if (metric.id !== "cancellations" || !metric.available) return null;

  return (
    <span className="shrink-0 text-sm font-medium tracking-normal text-muted xl:text-xs">
      ({formatPercent(metric.rate_percent)})
    </span>
  );
};

export const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: FinanceMetric;
  onToggle: () => void;
}) => {
  const description = metric.available
    ? metric.description
    : metric.unavailable_reason || metric.description;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
        !metric.available && active && "border-border/80 bg-surface-muted ring-0",
      )}
      onClick={onToggle}
      title={`${metric.label}: ${description}. ${
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
          <MetricValue metric={metric} />
          <ChurnRate metric={metric} />
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        {metric.available ? null : (
          <p className="truncate text-[0.68rem] font-semibold text-muted">{description}</p>
        )}
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

export const LoadingGrid = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`finance-${key}`}
      />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Financeiro"
  />
);
