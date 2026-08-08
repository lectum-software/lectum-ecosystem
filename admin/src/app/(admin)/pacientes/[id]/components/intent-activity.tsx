"use client";
import { BarChart3, Loader2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import type { AdminPatientDetail, PatientsDetailIntentMetric } from "@/api/req/patients";
import { cn } from "@/lib/utils";

import {
  numberFormatter,
  patientIntentLevelClassNames,
  patientIntentMetricIcons,
  patientIntentMetricToneClassNames,
  patientIntentProgressClassNames,
} from "../modules/detail-config";
import { formatDateTime } from "../modules/detail-support";
import {
  normalizePatientPlatformHourlyActivityPoint,
  type PatientPlatformHourlyActivitySelection,
  patientPlatformHourlyActivityBreakdown,
  patientPlatformWeekdayDisplayOrder,
  patientPlatformWeekdayLabel,
  safePatientPlatformActivityCount,
} from "../modules/platform-support";
import { CardShell, IconCircle, PatientMetricComparisonLine } from "./common";

export const formatPatientIntentScore = (score: number, maxScore: number) =>
  `${numberFormatter.format(score)}/${numberFormatter.format(maxScore)}`;

export const PatientIntentMetricCard = ({
  metric,
  period,
}: {
  metric: PatientsDetailIntentMetric;
  period: AdminPatientDetail["period"];
}) => {
  const Icon = patientIntentMetricIcons[metric.id];

  return (
    <div className="rounded-2xl border border-border/75 bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-full",
            patientIntentMetricToneClassNames[metric.id],
          )}
        >
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-black text-muted">
          +{numberFormatter.format(metric.score_weight)} pts/sinal
        </span>
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-muted">
        {metric.label}
      </p>
      <p className="mt-1 text-2xl font-black text-foreground">
        {numberFormatter.format(metric.value)}
      </p>
      <p className="mt-2 text-xs font-bold leading-5 text-muted">{metric.description}</p>
      <PatientMetricComparisonLine metric={metric} period={period} />
    </div>
  );
};

export const PatientIntentAnalysisCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const intent = detail.intent_analysis;
  const scorePercentage =
    intent.max_score > 0 ? Math.min(100, Math.max(0, (intent.score / intent.max_score) * 100)) : 0;

  return (
    <CardShell className="min-w-0 max-w-full overflow-hidden p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Análise de intenção do paciente</h2>
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black",
                patientIntentLevelClassNames[intent.level.id],
              )}
            >
              {intent.level.label}
            </span>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm font-bold leading-6 text-muted">{intent.coverage_note}</p>
        </div>
        {periodControls}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="rounded-[28px] border border-primary/15 bg-primary-soft/45 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
                Score de intenção
              </p>
              <p className="mt-1 text-3xl font-black text-foreground">
                {formatPatientIntentScore(intent.score, intent.max_score)}
              </p>
            </div>
            <IconCircle icon={BarChart3} />
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface">
            <div
              aria-hidden
              className={cn(
                "h-full rounded-full transition-all",
                patientIntentProgressClassNames[intent.level.id],
              )}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
          <p className="mt-4 text-sm font-bold leading-6 text-muted">{intent.summary}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Psicólogos vistos</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_viewed)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Favoritados</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_favorited)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Contatados</dt>
              <dd className="mt-1 font-black text-foreground">
                {numberFormatter.format(intent.unique_psychologists_contacted)}
              </dd>
            </div>
            <div className="rounded-2xl bg-surface/80 p-3">
              <dt className="text-xs font-black text-muted">Último sinal</dt>
              <dd className="mt-1 font-black text-foreground">
                {intent.last_signal_at ? formatDateTime(intent.last_signal_at) : "Não capturado"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="grid min-w-0 gap-3 sm:grid-cols-2">
          {intent.metrics.map((metric) => (
            <PatientIntentMetricCard key={metric.id} metric={metric} period={detail.period} />
          ))}
        </section>
      </div>
    </CardShell>
  );
};

export const PatientPlatformActivityHoursCard = ({
  detail,
  isRefreshing = false,
  periodControls,
}: {
  detail: AdminPatientDetail;
  isRefreshing?: boolean;
  periodControls: ReactNode;
}) => {
  const usage = detail.platform_usage;
  const [selectedWeekday, setSelectedWeekday] =
    useState<PatientPlatformHourlyActivitySelection>("all");
  const platformActivityHours = useMemo(() => {
    const peakActivityHours = usage.peak_activity_hours ?? [];
    const activitySource =
      usage.hourly_activity && usage.hourly_activity.length > 0
        ? usage.hourly_activity
        : peakActivityHours;
    const activityByHour = new Map(activitySource.map((hour) => [hour.hour, hour]));

    return Array.from({ length: 24 }, (_, hour) =>
      normalizePatientPlatformHourlyActivityPoint(activityByHour.get(hour), hour),
    );
  }, [usage.hourly_activity, usage.peak_activity_hours]);
  const platformActivityHoursByWeekday = useMemo(() => {
    const activityByDay = new Map(
      (usage.hourly_activity_by_weekday ?? []).map((item) => [item.day, item]),
    );

    return new Map(
      patientPlatformWeekdayDisplayOrder.map((day) => {
        const item = activityByDay.get(day);
        const activityByHour = new Map((item?.hours ?? []).map((hour) => [hour.hour, hour]));

        return [
          String(day) as PatientPlatformHourlyActivitySelection,
          {
            day,
            label: item?.label ?? patientPlatformWeekdayLabel(day),
            points: Array.from({ length: 24 }, (_, hour) =>
              normalizePatientPlatformHourlyActivityPoint(activityByHour.get(hour), hour),
            ),
          },
        ];
      }),
    );
  }, [usage.hourly_activity_by_weekday]);
  const selectedWeekdayItem =
    selectedWeekday === "all" ? null : platformActivityHoursByWeekday.get(selectedWeekday);
  const chartActivityHours = selectedWeekdayItem?.points ?? platformActivityHours;
  const selectedWeekdayLabel = selectedWeekdayItem?.label ?? "Todos os dias";
  const totalPlatformActivityHours = platformActivityHours.reduce(
    (total, hour) => total + hour.total,
    0,
  );
  const chartTotalPlatformActivityHours = chartActivityHours.reduce(
    (total, hour) => total + hour.total,
    0,
  );
  const maxPlatformActivityHourCount = Math.max(1, ...chartActivityHours.map((hour) => hour.total));

  return (
    <CardShell className="min-w-0 max-w-full overflow-x-clip p-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Horários de maior atividade</h2>
            {isRefreshing ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs font-bold leading-5 text-muted">
            Distribuição por hora das atividades do paciente no período.
          </p>
        </div>
        {periodControls}
      </div>

      {totalPlatformActivityHours > 0 ? (
        <>
          <div className="mt-5">
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">
                Selecionar dia da semana do gráfico de horários do paciente
              </legend>
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
              {[...platformActivityHoursByWeekday.entries()].map(([id, item]) => (
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
              {chartTotalPlatformActivityHours === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-6 text-sm font-bold text-muted">
                  Nenhuma atividade foi registrada para {selectedWeekdayLabel.toLowerCase()}.
                </div>
              ) : (
                <div
                  aria-label={`Distribuição horária de atividade do paciente em ${selectedWeekdayLabel}`}
                  className="flex h-44 items-end gap-1"
                  role="img"
                >
                  {chartActivityHours.map((hour) => {
                    const percentage = (hour.total / maxPlatformActivityHourCount) * 100;
                    const barHeight = hour.total > 0 ? Math.max(8, percentage) : 2;

                    return (
                      <div
                        className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                        key={hour.hour}
                      >
                        <div className="flex h-32 w-full items-end justify-center rounded-t-xl bg-surface-muted px-1">
                          <span
                            className="w-full max-w-[1rem] rounded-t-full bg-primary transition"
                            style={{ height: `${barHeight}%` }}
                            title={`${hour.label}: ${numberFormatter.format(hour.total)} atividades`}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-subtle">
                          {String(hour.hour).padStart(2, "0")}h
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {patientPlatformHourlyActivityBreakdown.map((metric) => {
              const value = chartActivityHours.reduce((total, hour) => total + hour[metric.key], 0);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-bold text-muted"
                  key={metric.key}
                >
                  <span className={cn("h-2 w-2 rounded-full", metric.className)} />
                  {metric.label}: {safePatientPlatformActivityCount(value)}
                </span>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          Sem horários de atividade registrados no período.
        </p>
      )}
    </CardShell>
  );
};
