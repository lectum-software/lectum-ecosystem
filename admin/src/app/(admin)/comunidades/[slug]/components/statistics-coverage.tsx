"use client";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Reply } from "lucide-react";
import type { AdminCommunityStatistics } from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { cardClass, formatCountLabel, numberFormatter } from "../modules/detail-support";
import {
  type CommunityStatisticsDateFilterProps,
  communityStatisticPercentage,
  formatCommunityCareCoverageDuration,
  formatCommunityStatisticPercent,
  formatCommunityVerifiedResponseDetail,
  safeCommunityStatisticCount,
} from "../modules/statistics-support";
import { QueryStatus } from "./content-controls";
import { CommunityStatisticsDateFilters } from "./statistics-metrics";

export const CommunityCareCoverageBlock = ({
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
  const realPatientPosts = safeCommunityStatisticCount(statistics?.counters.posts.patients);
  const realAnonymousPosts = Math.min(
    realPatientPosts,
    safeCommunityStatisticCount(statistics?.counters.anonymous_posts.total),
  );
  const realIdentifiedPosts = Math.max(0, realPatientPosts - realAnonymousPosts);
  const careCoverage = statistics?.counters.care_coverage;
  const verifiedResponseBreakdown = careCoverage?.patient_posts_verified_response_breakdown;
  const realRespondedByVerified = Math.min(
    realPatientPosts,
    safeCommunityStatisticCount(careCoverage?.patient_posts_responded_by_verified_psychologists),
  );
  const realAnonymousRespondedByVerified = Math.min(
    realAnonymousPosts,
    safeCommunityStatisticCount(
      verifiedResponseBreakdown?.anonymous?.responded_by_verified_psychologists,
    ),
  );
  const realIdentifiedRespondedByVerified = Math.min(
    realIdentifiedPosts,
    safeCommunityStatisticCount(
      verifiedResponseBreakdown?.identified?.responded_by_verified_psychologists,
    ),
  );
  const realAwaitingVerifiedResponse = Math.min(
    realPatientPosts,
    safeCommunityStatisticCount(
      careCoverage?.patient_posts_awaiting_verified_psychologist_response,
    ),
  );
  const realAverageFirstVerifiedResponseMinutes =
    careCoverage?.average_first_verified_response_minutes ?? null;
  const patientPosts = realPatientPosts;
  const anonymousPosts = realAnonymousPosts;
  const identifiedPosts = realIdentifiedPosts;
  const respondedByVerified = realRespondedByVerified;
  const anonymousRespondedByVerified = realAnonymousRespondedByVerified;
  const identifiedRespondedByVerified = realIdentifiedRespondedByVerified;
  const awaitingVerifiedResponse = realAwaitingVerifiedResponse;
  const averageFirstVerifiedResponseMinutes = realAverageFirstVerifiedResponseMinutes;
  const coverageRate = communityStatisticPercentage(respondedByVerified, patientPosts);
  const awaitingRate = communityStatisticPercentage(awaitingVerifiedResponse, patientPosts);
  const anonymousRate = communityStatisticPercentage(anonymousPosts, patientPosts);
  const identifiedRate = communityStatisticPercentage(identifiedPosts, patientPosts);
  const hasStatus = isLoading || Boolean(error);
  const patientVisibilitySegments = [
    {
      id: "anonymous_posts",
      label: "Anônimos",
      percentage: anonymousRate,
      responseDetail: formatCommunityVerifiedResponseDetail(
        anonymousRespondedByVerified,
        anonymousPosts,
      ),
      toneClassName: "bg-warning",
      value: anonymousPosts,
    },
    {
      id: "identified_posts",
      label: "Identificados",
      percentage: identifiedRate,
      responseDetail: formatCommunityVerifiedResponseDetail(
        identifiedRespondedByVerified,
        identifiedPosts,
      ),
      toneClassName: "bg-primary",
      value: identifiedPosts,
    },
  ] as const;
  const operationalIndicators = [
    {
      description:
        awaitingVerifiedResponse > 0
          ? `${formatCommunityStatisticPercent(awaitingRate)} ainda sem resposta verificada.`
          : "Sem pendências de acolhimento verificado.",
      icon: awaitingVerifiedResponse > 0 ? AlertTriangle : CheckCircle2,
      id: "awaiting_verified_response",
      label: "Aguardando acolhimento",
      responseDetail: null,
      toneClassName:
        awaitingVerifiedResponse > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success",
      value: numberFormatter.format(awaitingVerifiedResponse),
    },
    {
      description:
        respondedByVerified > 0
          ? `Média de ${formatCountLabel(respondedByVerified, "post acolhido", "posts acolhidos")}.`
          : "Sem resposta verificada no período.",
      icon: Reply,
      id: "average_first_verified_response",
      label: "Tempo médio até 1ª resposta",
      responseDetail: null,
      toneClassName: "bg-surface-muted text-muted",
      value: formatCommunityCareCoverageDuration(averageFirstVerifiedResponseMinutes),
    },
  ] as const;

  return (
    <section aria-busy={isLoading || isFetching} className={cn(cardClass, "min-w-0 p-5 sm:p-6")}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-black text-foreground">Cobertura de acolhimento</h3>
            {isFetching && !isLoading ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-muted">
            Taxa de resposta qualificada aos posts de pacientes.
          </p>
        </div>
        <CommunityStatisticsDateFilters {...dateFilters} />
      </div>

      {hasStatus ? (
        <div className="mt-5">
          <QueryStatus error={error} loading={isLoading} onRetry={onRetry} />
        </div>
      ) : null}

      {statistics ? (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(260px,0.9fr)_minmax(260px,0.9fr)]">
            <article className="min-w-0 rounded-3xl border border-primary/20 bg-surface-muted p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-success/10 text-success">
                    <FileText aria-hidden className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-black leading-snug text-foreground">
                      Posts de pacientes
                    </h4>
                  </div>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-4xl font-black leading-none text-foreground">
                    {numberFormatter.format(patientPosts)}
                  </p>
                  <p className="mt-3 rounded-2xl bg-surface px-4 py-2.5 text-xs font-black leading-5 text-primary shadow-sm">
                    {formatCommunityVerifiedResponseDetail(respondedByVerified, patientPosts)}
                  </p>
                </div>
              </div>

              <div
                aria-label={`Distribuição dos posts de pacientes: ${formatCommunityStatisticPercent(
                  anonymousRate,
                )} anônimos e ${formatCommunityStatisticPercent(identifiedRate)} identificados`}
                className="mt-5 flex h-4 overflow-hidden rounded-full bg-surface shadow-inner"
                role="img"
              >
                <span
                  className="block h-full bg-warning"
                  style={{ width: `${Math.min(100, Math.max(0, anonymousRate))}%` }}
                />
                <span
                  className="block h-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, identifiedRate))}%` }}
                />
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {patientVisibilitySegments.map((segment) => (
                  <div
                    className="rounded-3xl border border-border/70 bg-surface p-4 shadow-sm"
                    key={segment.id}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-black text-foreground">
                        <span className={cn("h-3 w-3 rounded-full", segment.toneClassName)} />
                        {segment.label}
                      </span>
                      <span className="text-sm font-black text-muted">
                        {formatCommunityStatisticPercent(segment.percentage)}
                      </span>
                    </div>
                    <p className="mt-4 text-3xl font-black leading-none text-foreground">
                      {numberFormatter.format(segment.value)}
                    </p>
                    <p className="mt-3 text-xs font-black leading-5 text-primary">
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
                  <h4 className="mt-5 min-h-12 text-sm font-black leading-6 text-foreground">
                    {indicator.label}
                  </h4>
                  <p className="mt-3 text-4xl font-black leading-none text-foreground">
                    {indicator.value}
                  </p>
                  {indicator.responseDetail ? (
                    <p className="mt-3 rounded-2xl bg-surface px-4 py-2.5 text-xs font-black leading-5 text-primary">
                      {indicator.responseDetail}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs font-bold leading-6 text-muted">
                    {indicator.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-5 rounded-3xl border border-border bg-surface p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-black text-foreground">
                Taxa de cobertura por psicólogos verificados
              </span>
              <span className="text-sm font-black text-primary">
                {formatCommunityStatisticPercent(coverageRate)}
              </span>
            </div>
            <div
              aria-label={`Cobertura verificada de ${formatCommunityStatisticPercent(
                coverageRate,
              )}`}
              className="mt-4 h-4 overflow-hidden rounded-full bg-surface-muted"
              role="img"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, coverageRate))}%` }}
              />
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
};
