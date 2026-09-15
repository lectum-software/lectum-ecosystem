"use client";

import { Target, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { AdminPatientsDashboard } from "@/api/req/patients";
import {
  formatDaysMetric,
  formatNullablePercentage,
  formatPercentageValue,
  formatRateDifference,
  formatSelectedPeriod,
  numberFormatter,
  PATIENT_ENGAGEMENT_CHART_COLORS,
  PATIENT_INTENT_ENGAGEMENT_COLUMN_ORDER,
  PATIENT_INTENT_ENGAGEMENT_ROW_ORDER,
  type PatientEngagementSegmentId,
  type PatientIntentEngagementCell,
  type PatientIntentSegmentId,
} from "../modules/dashboard-support";
import { CardShell, hexToRgba, PanelTitle } from "./metric-cards";

import { MiniBar, PatientEngagementDonutChart, PatientIntentDonutChart } from "./timeline-donuts";

export const PatientIntentAnalysisCard = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const intent = summary.intent_analysis;
  const engagement = summary.engagement_analysis;

  return (
    <CardShell className="p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Target aria-hidden className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              Intenção e engajamento dos pacientes
            </h2>
          </div>
          <p className="mt-2 text-sm font-bold leading-6 text-muted">
            {formatSelectedPeriod(summary.period)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="min-w-0 rounded-[1.6rem] border border-border/75 bg-surface-muted/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">Intenção</h3>
              <p className="mt-1 text-3xl font-black text-foreground">
                {numberFormatter.format(intent.total_patients)}
              </p>
              <p className="mt-1 text-sm font-bold text-muted">pacientes considerados</p>
            </div>
          </div>
          <PatientIntentDonutChart items={intent.items} total={intent.total_patients} />
        </section>

        <section className="min-w-0 rounded-[1.6rem] border border-border/75 bg-surface-muted/70 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">Engajamento</h3>
              <p className="mt-1 text-3xl font-black text-foreground">
                {numberFormatter.format(engagement.total_patients)}
              </p>
              <p className="mt-1 text-sm font-bold text-muted">pacientes considerados</p>
            </div>
          </div>
          <PatientEngagementDonutChart items={engagement.items} total={engagement.total_patients} />
        </section>
      </div>
    </CardShell>
  );
};

export const findPatientIntentEngagementCell = (
  summary: AdminPatientsDashboard["intent_engagement"],
  intentId: PatientIntentSegmentId,
  engagementId: PatientEngagementSegmentId,
) => {
  const found = summary.cells.find(
    (cell) => cell.intent_id === intentId && cell.engagement_id === engagementId,
  );
  if (found) return found;

  return {
    column_percentage: 0,
    count: 0,
    engagement_id: engagementId,
    engagement_label: (summary.cells.find((cell) => cell.engagement_id === engagementId)
      ?.engagement_label ?? engagementId) as PatientIntentEngagementCell["engagement_label"],
    id: `${intentId}_${engagementId}` as PatientIntentEngagementCell["id"],
    intent_id: intentId,
    intent_label: (summary.cells.find((cell) => cell.intent_id === intentId)?.intent_label ??
      intentId) as PatientIntentEngagementCell["intent_label"],
    percentage: 0,
    row_percentage: 0,
  };
};

export const buildPatientIntentEngagementListHref = (cellId: PatientIntentEngagementCell["id"]) => {
  const params = new URLSearchParams({ intent_engagement: cellId });

  return `/pacientes/lista?${params.toString()}`;
};

export const PatientIntentEngagementMetric = ({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) => (
  <div className="rounded-2xl bg-surface-muted p-3">
    <p className="text-[0.68rem] font-black uppercase tracking-[0.08em] text-subtle">{label}</p>
    <p className="mt-1 text-base font-black text-foreground">{value}</p>
  </div>
);

export const PatientIntentEngagementCellCard = ({
  cell,
  showEngagementLabel = false,
}: {
  cell: PatientIntentEngagementCell;
  showEngagementLabel?: boolean;
}) => {
  const color = PATIENT_ENGAGEMENT_CHART_COLORS[cell.engagement_id];
  const hasData = cell.count > 0;
  const intensity = hasData ? 0.08 + Math.min(0.2, (cell.row_percentage / 100) * 0.2) : 0;

  return (
    <Link
      aria-label={`Ver lista de pacientes em ${cell.intent_label} com ${
        cell.engagement_label
      }: ${numberFormatter.format(
        cell.count,
      )} paciente(s), ${formatPercentageValue(cell.percentage)} da base.`}
      className="block min-h-[7.75rem] min-w-0 rounded-[1.2rem] border p-3 text-left transition duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      href={buildPatientIntentEngagementListHref(cell.id)}
      style={{
        backgroundColor: hasData ? hexToRgba(color, intensity) : "var(--admin-surface-muted)",
        borderColor: hasData ? hexToRgba(color, 0.32) : "var(--admin-border)",
      }}
    >
      {showEngagementLabel ? (
        <div className="mb-2 flex items-center gap-2">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h4 className="min-w-0 text-xs font-black text-foreground">{cell.engagement_label}</h4>
        </div>
      ) : null}
      <p className="text-lg font-black text-foreground">
        {numberFormatter.format(cell.count)}
        <span className="ml-1 text-xs font-bold text-muted">
          ({formatPercentageValue(cell.percentage)})
        </span>
      </p>
      <p className="mt-2 text-[0.72rem] font-bold leading-5 text-muted">
        {formatPercentageValue(cell.row_percentage)} dentro de {cell.intent_label.toLowerCase()}.
      </p>
      <p className="sr-only">
        Clique para ver a lista de pacientes deste quadrante filtrada por intencao e engajamento.
      </p>
    </Link>
  );
};

export const PatientIntentEngagementCard = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const intentEngagement = summary.intent_engagement;
  const highEngagement = intentEngagement.comparison.high_engagement;
  const lowEngagement = intentEngagement.comparison.low_engagement;
  const rateDifference = intentEngagement.comparison.rate_difference_points;

  return (
    <CardShell className="p-5">
      <PanelTitle
        description={formatSelectedPeriod(summary.period)}
        icon={TrendingUp}
        title="Intenção x Engajamento"
      />

      {intentEngagement.totals.patients === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
          {intentEngagement.unavailable_reason ??
            "Sem pacientes no período selecionado para comparar intenção e engajamento."}
        </p>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(280px,0.82fr)]">
          <div className="min-w-0">
            <div className="grid gap-3 lg:hidden">
              {PATIENT_INTENT_ENGAGEMENT_ROW_ORDER.map((intentId) => {
                const rowCells = PATIENT_INTENT_ENGAGEMENT_COLUMN_ORDER.map((engagementId) =>
                  findPatientIntentEngagementCell(intentEngagement, intentId, engagementId),
                );
                const intentLabel = rowCells[0]?.intent_label ?? intentId;

                return (
                  <section
                    className="rounded-[1.35rem] border border-border bg-surface p-3"
                    key={`patient-mobile-intent-engagement-${intentId}`}
                  >
                    <h3 className="text-sm font-black text-foreground">{intentLabel}</h3>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {rowCells.map((cell) => (
                        <PatientIntentEngagementCellCard
                          cell={cell}
                          key={cell.id}
                          showEngagementLabel
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            <div className="hidden gap-2 lg:grid lg:grid-cols-[104px_repeat(4,minmax(0,1fr))]">
              <div className="hidden lg:block" aria-hidden />
              {PATIENT_INTENT_ENGAGEMENT_COLUMN_ORDER.map((engagementId) => {
                const label =
                  intentEngagement.cells.find((cell) => cell.engagement_id === engagementId)
                    ?.engagement_label ?? engagementId;

                return (
                  <p
                    className="rounded-2xl bg-surface-muted px-3 py-2 text-center text-xs font-black text-muted"
                    key={`patient-intent-engagement-column-${engagementId}`}
                  >
                    {label}
                  </p>
                );
              })}

              {PATIENT_INTENT_ENGAGEMENT_ROW_ORDER.map((intentId) => {
                const rowCells = PATIENT_INTENT_ENGAGEMENT_COLUMN_ORDER.map((engagementId) =>
                  findPatientIntentEngagementCell(intentEngagement, intentId, engagementId),
                );
                const intentLabel = rowCells[0]?.intent_label ?? intentId;

                return (
                  <Fragment key={`patient-intent-engagement-row-${intentId}`}>
                    <p className="grid place-items-center rounded-2xl bg-surface-muted px-2 text-center text-[0.72rem] font-black text-muted">
                      {intentLabel}
                    </p>
                    {rowCells.map((cell) => (
                      <PatientIntentEngagementCellCard cell={cell} key={cell.id} />
                    ))}
                  </Fragment>
                );
              })}
            </div>
          </div>

          <aside className="grid content-start gap-3">
            <PatientIntentEngagementMetric
              label="Alta intenção entre engajados"
              value={
                <>
                  {formatNullablePercentage(highEngagement.high_intent_rate)}
                  <span className="ml-1 text-xs font-bold text-muted">
                    · {numberFormatter.format(highEngagement.high_intent_count)}/
                    {numberFormatter.format(highEngagement.patients)}
                  </span>
                </>
              }
            />
            <PatientIntentEngagementMetric
              label="Alta intenção entre pouco/sem engajamento"
              value={
                <>
                  {formatNullablePercentage(lowEngagement.high_intent_rate)}
                  <span className="ml-1 text-xs font-bold text-muted">
                    · {numberFormatter.format(lowEngagement.high_intent_count)}/
                    {numberFormatter.format(lowEngagement.patients)}
                  </span>
                </>
              }
            />
            <PatientIntentEngagementMetric
              label="Diferença observada"
              value={formatRateDifference(rateDifference)}
            />
            <div className="rounded-[1.35rem] border border-border bg-surface-muted p-4 text-xs font-bold leading-5 text-muted">
              {typeof rateDifference === "number" ? (
                <>
                  Leitura observacional: pacientes engajados apresentam{" "}
                  <span className="font-black text-foreground">
                    {formatRateDifference(rateDifference)}
                  </span>{" "}
                  na taxa de alta intenção versus pacientes pouco ou sem engajamento.
                </>
              ) : (
                "Leitura observacional: ainda não há base suficiente para comparar alta intenção entre engajados e pouco ou sem engajamento."
              )}{" "}
              Alta intenção considera{" "}
              <span className="font-black text-foreground">Interessados</span> e{" "}
              <span className="font-black text-foreground">Qualificados</span>; alto engajamento
              considera <span className="font-black text-foreground">Engajados</span> e{" "}
              <span className="font-black text-foreground">Muito engajados</span>.
            </div>
          </aside>
        </div>
      )}
    </CardShell>
  );
};

export const AnonymousConversionCard = ({ summary }: { summary: AdminPatientsDashboard }) => {
  const conversion = summary.anonymous_conversion;

  return (
    <CardShell className="p-5">
      <PanelTitle
        description={formatSelectedPeriod(summary.period)}
        icon={TrendingUp}
        title="Conversão até o cadastro"
        titleClassName="font-semibold"
      />

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Pacientes cadastrados",
            value: numberFormatter.format(conversion.registered_patients_count),
          },
          {
            label: "Com trilha prévia",
            value: numberFormatter.format(conversion.patients_with_anonymous_history_count),
          },
          {
            label: "Sem trilha capturada",
            value: numberFormatter.format(conversion.patients_without_anonymous_history_count),
          },
          {
            label: "Cobertura da trilha",
            value: formatNullablePercentage(conversion.history_coverage_rate),
          },
          { label: "Média", value: formatDaysMetric(conversion.average_days) },
          { label: "Mediana", value: formatDaysMetric(conversion.median_days) },
          {
            description: "75% dos pacientes com trilha cadastram até esse prazo",
            label: "P75",
            value: formatDaysMetric(conversion.p75_days),
          },
          {
            description: "90% dos pacientes com trilha cadastram até esse prazo",
            label: "P90",
            value: formatDaysMetric(conversion.p90_days),
          },
        ].map(({ description, label, value }) => (
          <div className="rounded-2xl bg-surface-muted p-3" key={label}>
            <p className="text-xs font-black text-muted">{label}</p>
            <p className="mt-1 text-xl font-black text-foreground">{value}</p>
            {description ? (
              <p className="mt-1 text-[0.68rem] font-bold leading-snug text-subtle">
                {description}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {conversion.unavailable_reason ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
          {conversion.unavailable_reason}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-black text-foreground">Distribuição do tempo até cadastro</h3>
          <div className="mt-4 space-y-3">
            {conversion.buckets.map((bucket) => (
              <MiniBar
                key={bucket.id}
                label={bucket.label}
                percentage={bucket.percentage}
                value={`${numberFormatter.format(bucket.count)} · ${formatPercentageValue(
                  bucket.percentage,
                )}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 p-4">
          <h3 className="text-sm font-black text-foreground">Primeira página antes do cadastro</h3>
          {conversion.first_touch_pages.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
              Sem primeira página anônima vinculada aos pacientes cadastrados no período.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {conversion.first_touch_pages.map((item) => (
                <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{item.label}</p>
                      <p className="text-xs font-bold text-muted">
                        {numberFormatter.format(item.patients_count)} pacientes com trilha
                      </p>
                    </div>
                    <span className="text-sm font-black text-primary">
                      {formatPercentageValue(item.percentage)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold text-muted">
                    Tempo médio até cadastro: {formatDaysMetric(item.average_days)}
                  </p>
                  {item.unavailable_reason ? (
                    <p className="mt-2 text-xs font-bold text-subtle">{item.unavailable_reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
};
