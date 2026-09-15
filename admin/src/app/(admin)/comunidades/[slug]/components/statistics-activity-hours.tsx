"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AdminCommunityStatistics } from "@/api/req/communities";
import { cn } from "@/lib/utils";
import {
  activityHoursPeriodOptions,
  cardClass,
  formatCountLabel,
  numberFormatter,
} from "../modules/detail-support";
import {
  type CommunityStatisticsDateFilterProps,
  safeCommunityStatisticCount,
} from "../modules/statistics-support";
import { QueryStatus } from "./content-controls";
import { CommunityStatisticsDateFilters } from "./statistics-metrics";

export type CommunityHourlyActivityPoint =
  AdminCommunityStatistics["charts"]["hourly_activity"][number];

export type CommunityHourlyActivityMetricKey =
  | "accesses"
  | "engagement"
  | "posts"
  | "replies"
  | "reports";

export type CommunityHourlyActivitySelection = "all" | `${number}`;

export const communityHourlyActivityBreakdown: {
  className: string;
  key: CommunityHourlyActivityMetricKey;
  label: string;
}[] = [
  { className: "bg-primary", key: "accesses", label: "Acessos" },
  { className: "bg-success", key: "posts", label: "Posts" },
  { className: "bg-warning", key: "replies", label: "Respostas" },
  { className: "bg-muted", key: "engagement", label: "Interações" },
  { className: "bg-danger", key: "reports", label: "Denúncias" },
];

export const communityWeekdayDisplayOrder = [1, 2, 3, 4, 5, 6, 0] as const;

export const formatCommunityActivityHourRange = (hour: number) => {
  const normalizedHour = Math.min(23, Math.max(0, Math.floor(hour)));
  const label = String(normalizedHour).padStart(2, "0");

  return `${label}:00 - ${label}:59`;
};

export const normalizeCommunityHourlyActivityPoint = (
  point: Partial<CommunityHourlyActivityPoint> | undefined,
  hour: number,
): CommunityHourlyActivityPoint => {
  const accesses = safeCommunityStatisticCount(point?.accesses);
  const posts = safeCommunityStatisticCount(point?.posts);
  const replies = safeCommunityStatisticCount(point?.replies);
  const engagement = safeCommunityStatisticCount(point?.engagement);
  const reports = safeCommunityStatisticCount(point?.reports);
  const rawTotal = point?.total;
  const total =
    rawTotal === undefined || rawTotal === null
      ? accesses + posts + replies + engagement + reports
      : safeCommunityStatisticCount(rawTotal);

  return {
    accesses,
    engagement,
    hour,
    label: point?.label || `${String(hour).padStart(2, "0")}:00`,
    posts,
    replies,
    reports,
    total,
  };
};

export const CommunityPeakActivityHoursBlock = ({
  dateFilters,
  error,
  isFetching,
  isLoading,
  onRetry,
  statistics,
}: {
  dateFilters: CommunityStatisticsDateFilterProps;
  error: unknown;
  isFetching: boolean;
  isLoading: boolean;
  onRetry: () => void;
  statistics?: AdminCommunityStatistics;
}) => {
  const [selectedWeekday, setSelectedWeekday] = useState<CommunityHourlyActivitySelection>("all");
  const points = useMemo(() => {
    const byHour = new Map(
      (statistics?.charts.hourly_activity ?? []).map((point) => [point.hour, point]),
    );

    return Array.from({ length: 24 }, (_, hour) =>
      normalizeCommunityHourlyActivityPoint(byHour.get(hour), hour),
    );
  }, [statistics]);
  const pointsByWeekday = useMemo(() => {
    const byDay = new Map(
      (statistics?.charts.hourly_activity_by_weekday ?? []).map((item) => [item.day, item]),
    );

    return new Map(
      communityWeekdayDisplayOrder.map((day) => {
        const item = byDay.get(day);
        const byHour = new Map((item?.hours ?? []).map((point) => [point.hour, point]));

        return [
          String(day) as CommunityHourlyActivitySelection,
          {
            day,
            label:
              item?.label ??
              (day === 0
                ? "Dom"
                : day === 1
                  ? "Seg"
                  : day === 2
                    ? "Ter"
                    : day === 3
                      ? "Qua"
                      : day === 4
                        ? "Qui"
                        : day === 5
                          ? "Sex"
                          : "Sáb"),
            points: Array.from({ length: 24 }, (_, hour) =>
              normalizeCommunityHourlyActivityPoint(byHour.get(hour), hour),
            ),
          },
        ];
      }),
    );
  }, [statistics]);
  const selectedWeekdayItem =
    selectedWeekday === "all" ? null : pointsByWeekday.get(selectedWeekday);
  const chartPoints = selectedWeekdayItem?.points ?? points;
  const selectedWeekdayLabel = selectedWeekdayItem?.label ?? "Todos os dias";
  const totalActivity = points.reduce((total, point) => total + point.total, 0);
  const chartTotalActivity = chartPoints.reduce((total, point) => total + point.total, 0);
  const maxActivity = Math.max(1, ...chartPoints.map((point) => point.total));
  const topHours = [...points]
    .filter((point) => point.total > 0)
    .sort((a, b) => b.total - a.total || a.hour - b.hour)
    .slice(0, 3);
  const hasStatus = isLoading || Boolean(error);

  return (
    <section
      aria-busy={isLoading || isFetching}
      className={cn(cardClass, "min-w-0 overflow-x-clip p-5")}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-foreground">Horários de maior atividade</h3>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Distribuição por hora das atividades na comunidade.
          </p>
        </div>
        <CommunityStatisticsDateFilters
          {...dateFilters}
          periodOptions={activityHoursPeriodOptions}
        />
      </div>

      {hasStatus ? (
        <div className="mt-5">
          <QueryStatus error={error} loading={isLoading} onRetry={onRetry} />
        </div>
      ) : null}

      {statistics && totalActivity === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
          Nenhuma atividade foi registrada por hora para o período selecionado.
        </div>
      ) : null}

      {statistics && totalActivity > 0 ? (
        <>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {topHours.map((point, index) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={point.hour}
              >
                <span className="text-[11px] font-black uppercase tracking-wide text-primary">
                  #{index + 1} pico
                </span>
                <h4 className="mt-2 text-xl font-black text-foreground">
                  {formatCommunityActivityHourRange(point.hour)}
                </h4>
                <p className="mt-1 text-2xl font-black text-foreground">
                  {numberFormatter.format(point.total)}
                </p>
                <p className="text-xs font-bold text-muted">atividades no período selecionado</p>
                <p className="mt-3 min-w-0 text-[11px] font-bold leading-5 text-muted">
                  {formatCountLabel(point.accesses, "acesso", "acessos")} |{" "}
                  {formatCountLabel(point.posts + point.replies, "conteúdo", "conteúdos")} |{" "}
                  {formatCountLabel(point.engagement, "interação", "interações")} |{" "}
                  {formatCountLabel(point.reports, "denúncia", "denúncias")}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Selecionar dia da semana do gráfico de horários</legend>
              <button
                aria-pressed={selectedWeekday === "all"}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-black transition",
                  selectedWeekday === "all"
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted hover:border-primary/35 hover:text-primary",
                )}
                onClick={() => setSelectedWeekday("all")}
                type="button"
              >
                Todos
              </button>
              {[...pointsByWeekday.entries()].map(([id, item]) => (
                <button
                  aria-pressed={selectedWeekday === id}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-black transition",
                    selectedWeekday === id
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted hover:border-primary/35 hover:text-primary",
                  )}
                  key={id}
                  onClick={() => setSelectedWeekday(id)}
                  type="button"
                >
                  {item.label}
                </button>
              ))}
            </fieldset>
          </div>

          <div className="mt-5 overflow-x-auto rounded-[1.5rem] border border-border/70 bg-surface p-4">
            <div className="min-w-[760px]">
              {chartTotalActivity === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
                  Nenhuma atividade foi registrada para {selectedWeekdayLabel.toLowerCase()}.
                </div>
              ) : (
                <div
                  aria-label={`Distribuição horária de atividade da comunidade em ${selectedWeekdayLabel}`}
                  className="flex h-44 items-end gap-1"
                  role="img"
                >
                  {chartPoints.map((point) => {
                    const percentage = (point.total / maxActivity) * 100;
                    const barHeight = point.total > 0 ? Math.max(8, percentage) : 2;

                    return (
                      <div
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        key={point.hour}
                      >
                        <div className="flex h-32 w-full items-end justify-center rounded-t-xl bg-surface-muted px-1">
                          <span
                            className="w-full max-w-[1rem] rounded-t-full bg-primary transition"
                            style={{ height: `${barHeight}%` }}
                            title={`${formatCommunityActivityHourRange(
                              point.hour,
                            )}: ${numberFormatter.format(point.total)} atividades`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-subtle">
                          {String(point.hour).padStart(2, "0")}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {communityHourlyActivityBreakdown.map((metric) => {
              const value = chartPoints.reduce((total, point) => total + point[metric.key], 0);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-muted"
                  key={metric.key}
                >
                  <span className={cn("h-2 w-2 rounded-full", metric.className)} />
                  {metric.label}: {numberFormatter.format(value)}
                </span>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
};
