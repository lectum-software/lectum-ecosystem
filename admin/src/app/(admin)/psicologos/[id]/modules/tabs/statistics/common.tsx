"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { AdminPsychologistEngagementMetric } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "../../components/shared";
import type { StatisticsChartMetric } from "../../support/config";
import { CARD } from "../../support/config";
import {
  formatChange,
  formatEngagementMetricValue,
  formatPreviousPeriod,
} from "../../support/formatters";

export const EngagementLoadingState = ({ rows = 3 }: { rows?: number }) => (
  <div className="space-y-5" data-psychologist-engagement-loading="true">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {["card-1", "card-2", "card-3", "card-4"].map((key) => (
        <div className={cn(CARD, "h-36 animate-pulse bg-surface-muted")} key={key} />
      ))}
    </div>
    {Array.from({ length: rows }, (_, index) => `row-${index + 1}`).map((key) => (
      <div className={cn(CARD, "h-64 animate-pulse bg-surface-muted")} key={key} />
    ))}
  </div>
);

export const MetricComparisonLine = ({
  comparison,
  className,
}: {
  className?: string;
  comparison?: AdminPsychologistEngagementMetric["comparison"] | null;
}) => {
  const trend = comparison?.trend ?? "unavailable";
  const hasArrow = trend === "up" || trend === "down";
  const TrendIcon = trend === "down" ? ArrowDown : ArrowUp;

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-1.5 text-[0.68rem]",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1 font-black",
          trend === "up" && "text-success",
          trend === "down" && "text-danger",
          (trend === "flat" || trend === "unavailable") && "text-muted",
        )}
      >
        {hasArrow ? <TrendIcon aria-hidden className="h-3 w-3" /> : null}
        {formatChange(comparison?.change_percent ?? null)}
      </span>
      <span className="min-w-0 break-words font-bold text-muted">
        vs. {formatPreviousPeriod(comparison)}
      </span>
    </div>
  );
};

export const StatisticsMetricToggleCard = ({
  active,
  config,
  metric,
  onToggle,
}: {
  active: boolean;
  config: StatisticsChartMetric;
  metric: AdminPsychologistEngagementMetric;
  onToggle: () => void;
}) => {
  const displayValue = metric.available ? formatEngagementMetricValue(metric) : "—";
  const Icon = config.icon;

  return (
    <button
      aria-pressed={active}
      className={cn(
        "h-full w-full min-w-0 overflow-hidden rounded-card border p-4 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
        !metric.available &&
          "cursor-not-allowed border-border bg-surface-muted opacity-60 shadow-none hover:border-border",
      )}
      disabled={!metric.available}
      onClick={onToggle}
      title={`${metric.label}: ${displayValue}. ${
        !metric.available ? "Indisponível" : active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
      type="button"
    >
      <span className="block min-w-0 max-w-full">
        <span className="block">
          <span
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full",
              config.iconToneClassName,
              config.iconClassName,
            )}
          >
            {config.id === "whatsapp_clicks" ? (
              <WhatsAppIcon aria-hidden className="h-5 w-5" />
            ) : (
              <Icon aria-hidden className="h-5 w-5" />
            )}
          </span>
        </span>
        <span className="mt-4 block min-w-0 max-w-full">
          <span className="block max-w-full break-words text-xs font-extrabold leading-snug text-foreground">
            {metric.label}
          </span>
          <span className="mt-2 block text-2xl font-extrabold leading-none text-foreground">
            {displayValue}
          </span>
        </span>
      </span>
      {metric.available && metric.comparison ? (
        <MetricComparisonLine className="mt-3" comparison={metric.comparison} />
      ) : metric.unavailable_reason ? (
        <span className="mt-3 block text-xs font-bold text-muted">{metric.unavailable_reason}</span>
      ) : null}
      <span className="sr-only">
        {!metric.available ? "Indisponível" : active ? "visível no gráfico" : "oculto no gráfico"}
      </span>
    </button>
  );
};
