"use client";

import { AlertTriangle, CheckCircle2, FileText, Reply } from "lucide-react";
import type {
  CommunitiesDashboardGlobalStatistics,
  CommunitiesDashboardHourlyActivityPoint,
} from "@/api/req/communities";
import { cn } from "@/lib/utils";
import {
  buildDashboardCareCoverageSnapshot,
  formatDashboardCareCoverageDuration,
  formatDashboardCareCoveragePercent,
  formatDashboardVerifiedResponseDetail,
} from "../modules/statistics-builders";
import { numberFormatter } from "../modules/statistics-config";
import { CardShell } from "./common";
import {
  BlockPeriodLabel,
  dashboardHourlyActivityBreakdown,
  formatCountLabel,
  formatDashboardActivityHourRange,
  normalizeDashboardHourlyActivityPoint,
} from "./post-actions";

export const CommunitiesPeakActivityHoursCard = ({
  periodLabel,
  points,
}: {
  periodLabel: string;
  points: CommunitiesDashboardHourlyActivityPoint[];
}) => {
  const byHour = new Map(points.map((point) => [point.hour, point]));
  const normalizedPoints = Array.from({ length: 24 }, (_, hour) =>
    normalizeDashboardHourlyActivityPoint(byHour.get(hour), hour),
  );
  const totalActivity = normalizedPoints.reduce((total, point) => total + point.total, 0);
  const maxActivity = Math.max(1, ...normalizedPoints.map((point) => point.total));
  const topHours = [...normalizedPoints]
    .filter((point) => point.total > 0)
    .sort((left, right) => right.total - left.total || left.hour - right.hour)
    .slice(0, 3);

  return (
    <CardShell className="h-full p-5">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">Horários de maior atividade</h2>
        <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
      </div>

      {totalActivity === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm font-medium text-muted">
          Nenhuma atividade foi registrada por hora no período selecionado.
        </p>
      ) : (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {topHours.map((point, index) => (
              <article
                className="min-w-0 rounded-2xl border border-border/80 bg-surface-muted p-4"
                key={point.hour}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      #{index + 1} pico
                    </span>
                    <h3 className="mt-1 text-base font-semibold text-foreground">
                      {formatDashboardActivityHourRange(point.hour)}
                    </h3>
                  </div>
                  <strong className="text-2xl font-semibold text-foreground">
                    {numberFormatter.format(point.total)}
                  </strong>
                </div>
                <p className="mt-2 text-[11px] font-medium leading-5 text-muted">
                  {formatCountLabel(point.accesses, "acesso", "acessos")} |{" "}
                  {formatCountLabel(point.posts + point.replies, "conteúdo", "conteúdos")} |{" "}
                  {formatCountLabel(point.engagement, "interação", "interações")} |{" "}
                  {formatCountLabel(point.reports, "denúncia", "denúncias")}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-5 overflow-x-auto rounded-2xl border border-border/70 bg-surface p-3">
            <div
              aria-label="Distribuição geral de atividades das comunidades por hora"
              className="flex h-36 min-w-[520px] items-end gap-1"
              role="img"
            >
              {normalizedPoints.map((point) => {
                const barHeight =
                  point.total > 0 ? Math.max(8, (point.total / maxActivity) * 100) : 2;

                return (
                  <div className="flex min-w-0 flex-1 flex-col items-center gap-2" key={point.hour}>
                    <div className="flex h-28 w-full items-end justify-center rounded-xl bg-surface-muted px-1">
                      <span
                        className="w-3 max-w-full rounded-t-full bg-primary"
                        style={{ height: `${barHeight}%` }}
                        title={`${point.label}: ${numberFormatter.format(point.total)} atividades`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-subtle">
                      {String(point.hour).padStart(2, "0")}h
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {dashboardHourlyActivityBreakdown.map((metric) => {
              const value = normalizedPoints.reduce((total, point) => total + point[metric.key], 0);

              return (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-muted"
                  key={metric.key}
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", metric.className)} />
                  {metric.label}: {numberFormatter.format(value)}
                </span>
              );
            })}
          </div>
        </>
      )}
    </CardShell>
  );
};

export const DashboardCareCoverageCard = ({
  filters,
  periodLabel,
  statistics,
}: {
  filters?: React.ReactNode;
  periodLabel: string;
  statistics: CommunitiesDashboardGlobalStatistics;
}) => {
  const coverage = buildDashboardCareCoverageSnapshot(statistics);
  const patientVisibilitySegments = [
    {
      id: "anonymous_posts",
      label: "Anônimos",
      percentage: coverage.anonymousRate,
      responseDetail: formatDashboardVerifiedResponseDetail(
        coverage.anonymousRespondedByVerified,
        coverage.anonymousPosts,
      ),
      toneClassName: "bg-warning",
      value: coverage.anonymousPosts,
    },
    {
      id: "identified_posts",
      label: "Identificados",
      percentage: coverage.identifiedRate,
      responseDetail: formatDashboardVerifiedResponseDetail(
        coverage.identifiedRespondedByVerified,
        coverage.identifiedPosts,
      ),
      toneClassName: "bg-primary",
      value: coverage.identifiedPosts,
    },
  ] as const;
  const operationalIndicators = [
    {
      description:
        coverage.awaitingCoverage > 0
          ? `${formatDashboardCareCoveragePercent(
              coverage.awaitingRate,
            )} ainda sem resposta verificada.`
          : "Sem pendências de acolhimento verificado.",
      icon: coverage.awaitingCoverage > 0 ? AlertTriangle : CheckCircle2,
      id: "awaiting_verified_response",
      label: "Aguardando acolhimento",
      toneClassName:
        coverage.awaitingCoverage > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
      value: numberFormatter.format(coverage.awaitingCoverage),
    },
    {
      description:
        coverage.respondedByVerified > 0
          ? `Média de ${formatCountLabel(
              coverage.respondedByVerified,
              "post acolhido",
              "posts acolhidos",
            )}.`
          : "Sem resposta verificada no período.",
      icon: Reply,
      id: "average_first_verified_response",
      label: "Tempo médio até 1ª resposta",
      toneClassName: "bg-surface-muted text-muted",
      value: formatDashboardCareCoverageDuration(coverage.responseAverageMinutes),
    },
  ] as const;

  return (
    <CardShell className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-foreground">Cobertura de acolhimento</h2>
          <BlockPeriodLabel>{periodLabel}</BlockPeriodLabel>
        </div>
        {filters ? <div className="w-full min-w-0 xl:max-w-xl">{filters}</div> : null}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.9fr)_minmax(260px,0.9fr)]">
        <article className="min-w-0 rounded-3xl border border-primary/20 bg-surface-muted p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                <FileText aria-hidden className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold leading-snug text-foreground">
                  Posts de pacientes
                </h3>
              </div>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-4xl font-semibold leading-none text-foreground">
                {numberFormatter.format(coverage.totalPatientPosts)}
              </p>
              <p className="mt-3 rounded-2xl bg-surface px-4 py-2.5 text-xs font-semibold leading-5 text-primary shadow-sm">
                {formatDashboardVerifiedResponseDetail(
                  coverage.respondedByVerified,
                  coverage.totalPatientPosts,
                )}
              </p>
            </div>
          </div>

          <div
            aria-label={`Distribuição dos posts de pacientes: ${formatDashboardCareCoveragePercent(
              coverage.anonymousRate,
            )} anônimos e ${formatDashboardCareCoveragePercent(
              coverage.identifiedRate,
            )} identificados`}
            className="mt-5 flex h-4 overflow-hidden rounded-full bg-surface shadow-inner"
            role="img"
          >
            <span
              className="block h-full bg-warning"
              style={{ width: `${Math.min(100, Math.max(0, coverage.anonymousRate))}%` }}
            />
            <span
              className="block h-full bg-primary"
              style={{ width: `${Math.min(100, Math.max(0, coverage.identifiedRate))}%` }}
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {patientVisibilitySegments.map((segment) => (
              <div
                className="rounded-3xl border border-border/70 bg-surface p-4 shadow-sm"
                key={segment.id}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className={cn("h-3 w-3 rounded-full", segment.toneClassName)} />
                    {segment.label}
                  </span>
                  <span className="text-sm font-semibold text-muted">
                    {formatDashboardCareCoveragePercent(segment.percentage)}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold leading-none text-foreground">
                  {numberFormatter.format(segment.value)}
                </p>
                <p className="mt-3 text-xs font-semibold leading-5 text-primary">
                  {segment.responseDetail}
                </p>
              </div>
            ))}
          </div>
        </article>

        {operationalIndicators.map((indicator) => {
          const Icon = indicator.icon;

          return (
            <article
              className="min-w-0 rounded-3xl border border-border/80 bg-surface-muted p-5 shadow-sm"
              key={indicator.id}
            >
              <span
                className={cn(
                  "grid h-12 w-12 place-items-center rounded-full",
                  indicator.toneClassName,
                )}
              >
                <Icon aria-hidden className="h-6 w-6" />
              </span>
              <h3 className="mt-5 min-h-12 text-sm font-semibold leading-6 text-foreground">
                {indicator.label}
              </h3>
              <p className="mt-3 text-4xl font-semibold leading-none text-foreground">
                {indicator.value}
              </p>
              <p className="mt-4 text-xs font-medium leading-6 text-muted">
                {indicator.description}
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground">
            Taxa de cobertura por psicólogos verificados
          </span>
          <span className="text-sm font-semibold text-primary">
            {formatDashboardCareCoveragePercent(coverage.coverageRate)}
          </span>
        </div>
        <div
          aria-label={`Cobertura verificada de ${formatDashboardCareCoveragePercent(
            coverage.coverageRate,
          )}`}
          className="mt-4 h-4 overflow-hidden rounded-full bg-surface-muted"
          role="img"
        >
          <span
            className="block h-full rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.max(0, coverage.coverageRate))}%` }}
          />
        </div>
      </div>
    </CardShell>
  );
};
