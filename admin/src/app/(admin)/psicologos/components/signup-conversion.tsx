"use client";

import { Activity, Smartphone, TrendingDown, TrendingUp, UserPlus } from "lucide-react";
import { useState } from "react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";

import {
  type ConversionJourney,
  formatDaysMetric,
  formatDecimalMetric,
  formatNullablePercentage,
  formatPercentageValue,
  formatSecondsMetric,
  formatSelectedPeriod,
  numberFormatter,
  type PlanSegmentFilter,
  type PlatformPagesView,
  type SignupMethodItem,
} from "../modules/dashboard-support";
import { DeviceUsageDonutChart } from "./device-usage";
import { CardShell, SIGNUP_METHOD_CHART_COLORS } from "./metric-cards";
import { buildPieSlicePath, getPiePoint, MiniBar, renderPiePercentageLabel } from "./supply-demand";
import {
  ConversionJourneyTitleSelect,
  getPlanSegmentSummary,
  PanelTitle,
  PlanSegmentSelect,
  PlatformPagesTitleSelect,
} from "./timeline-filters";

export const SignupMethodDonutChart = ({
  signupMethod,
}: {
  signupMethod: AdminPsychologistsDashboard["signup_method"];
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const total = Math.max(0, signupMethod.total);
  const visibleItems = signupMethod.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: SignupMethodItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = total > 0 ? item.count / total : 0;
      if (share <= 0) return accumulator;

      const startAngle = accumulator.currentAngle;
      const endAngle = startAngle + share * 360;

      return {
        currentAngle: endAngle,
        items: accumulator.items.concat({
          endAngle,
          item,
          share,
          startAngle,
        }),
      };
    },
    { currentAngle: -90, items: [] },
  ).items;

  if (total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Sem cadastros de psicólogos nas categorias Google ou E-mail e senha no período selecionado.
      </p>
    );
  }

  const ariaLabel = `Gráfico de donut do modo de cadastro: ${signupMethod.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} cadastro(s), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <figure className="mt-5 grid gap-5 sm:grid-cols-[minmax(9rem,11rem)_1fr] sm:items-center">
      <svg
        aria-label={ariaLabel}
        className="mx-auto aspect-square w-40 sm:w-44"
        role="img"
        viewBox="0 0 120 120"
      >
        <circle
          cx={center}
          cy={center}
          fill="var(--admin-surface-muted)"
          r={radius}
          stroke="var(--admin-border)"
          strokeWidth="1"
        />
        {segments.map((segment) => {
          const color = SIGNUP_METHOD_CHART_COLORS[segment.item.id];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.id}>
                <circle
                  cx={center}
                  cy={center}
                  fill={color}
                  r={radius}
                  stroke="var(--admin-surface)"
                  strokeWidth="1.4"
                />
                {renderPiePercentageLabel({
                  color,
                  label: percentageLabel,
                  x: center,
                  y: center,
                })}
              </g>
            );
          }

          return (
            <g key={segment.item.id}>
              <path
                d={buildPieSlicePath(center, radius, segment.startAngle, segment.endAngle)}
                fill={color}
                stroke="var(--admin-surface)"
                strokeWidth="1.4"
              />
              {segment.share > 1
                ? renderPiePercentageLabel({
                    color,
                    label: percentageLabel,
                    x: labelPoint.x,
                    y: labelPoint.y,
                  })
                : null}
            </g>
          );
        })}
        <circle
          aria-hidden
          cx={center}
          cy={center}
          fill="var(--admin-surface)"
          r={innerRadius}
          stroke="var(--admin-surface)"
          strokeWidth="1"
        />
        <text
          fill="var(--admin-foreground)"
          fontSize="15"
          fontWeight="900"
          textAnchor="middle"
          x={center}
          y={center - 2}
        >
          {numberFormatter.format(total)}
        </text>
        <text
          fill="var(--admin-muted)"
          fontSize="8"
          fontWeight="700"
          textAnchor="middle"
          x={center}
          y={center + 12}
        >
          total
        </text>
      </svg>
      <figcaption className="space-y-3">
        {signupMethod.items.map((item) => {
          const signupLabel = item.count === 1 ? "cadastro" : "cadastros";

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: SIGNUP_METHOD_CHART_COLORS[item.id] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              <p className="mt-1 text-xs font-bold text-muted">
                {numberFormatter.format(item.count)} {signupLabel}
              </p>
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};

export const ConversionAndUsageBlocks = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const conversion = summary.conversion;
  const [conversionJourney, setConversionJourney] = useState<ConversionJourney>("subscription");
  const [preSignupConversionPlanSegment, setPreSignupConversionPlanSegment] =
    useState<PlanSegmentFilter>("all");
  const [signupMethodPlanSegment, setSignupMethodPlanSegment] = useState<PlanSegmentFilter>("all");
  const [deviceUsagePlanSegment, setDeviceUsagePlanSegment] = useState<PlanSegmentFilter>("all");
  const [platformUsagePlanSegment, setPlatformUsagePlanSegment] =
    useState<PlanSegmentFilter>("all");
  const [platformPagesView, setPlatformPagesView] = useState<PlatformPagesView>("accesses");
  const preSignupConversionSummary = getPlanSegmentSummary(summary, preSignupConversionPlanSegment);
  const signupMethodSummary = getPlanSegmentSummary(summary, signupMethodPlanSegment);
  const deviceUsageSummary = getPlanSegmentSummary(summary, deviceUsagePlanSegment);
  const platformUsageSummary = getPlanSegmentSummary(summary, platformUsagePlanSegment);
  const preSignupConversion = preSignupConversionSummary.pre_signup_conversion;
  const platformUsage = platformUsageSummary.platform_usage;
  const platformDurationPages = platformUsage.top_pages_by_average_duration;
  const platformMaxAverageDuration = Math.max(
    0,
    ...platformDurationPages.map((page) => page.average_duration_seconds),
  );
  const selectedPeriodLabel = formatSelectedPeriod(summary.period);

  return (
    <section className="grid gap-5">
      <CardShell className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <PanelTitle
            description={selectedPeriodLabel}
            icon={conversionJourney === "registration" ? TrendingUp : TrendingDown}
            title={
              <ConversionJourneyTitleSelect
                id="psychologist-conversion-journey"
                onChange={setConversionJourney}
                value={conversionJourney}
              />
            }
          />
          {conversionJourney === "registration" ? (
            <PlanSegmentSelect
              id="pre-signup-conversion-plan-segment"
              onChange={setPreSignupConversionPlanSegment}
              value={preSignupConversionPlanSegment}
            />
          ) : null}
        </div>

        {conversionJourney === "subscription" ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Cadastros",
                  value: numberFormatter.format(conversion.registered_count),
                },
                {
                  label: "Assinaram",
                  value: numberFormatter.format(conversion.converted_paid_count),
                },
                {
                  label: "Taxa paga",
                  value: formatNullablePercentage(conversion.conversion_rate),
                },
                { label: "Média", value: formatDaysMetric(conversion.average_days) },
                { label: "Mediana", value: formatDaysMetric(conversion.median_days) },
                {
                  description: "75% assinam até esse prazo",
                  label: "P75",
                  value: formatDaysMetric(conversion.p75_days),
                },
                {
                  description: "90% assinam até esse prazo",
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
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">Distribuição por prazo</h3>
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
                <h3 className="text-sm font-black text-foreground">
                  Conversão por modo de cadastro
                </h3>
                <div className="mt-4 space-y-4">
                  {summary.conversion_by_signup_method.map((item) => (
                    <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-foreground">{item.label}</p>
                          <p className="text-xs font-bold text-muted">
                            {numberFormatter.format(item.converted_paid_count)} de{" "}
                            {numberFormatter.format(item.registered_count)} assinaram
                          </p>
                        </div>
                        <span className="text-sm font-black text-primary">
                          {formatNullablePercentage(item.conversion_rate)}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-muted">
                        Mediana: {formatDaysMetric(item.median_days)} · Média:{" "}
                        {formatDaysMetric(item.average_days)}
                      </p>
                      {!item.sample_sufficient && item.unavailable_reason ? (
                        <p className="mt-2 text-xs font-bold text-subtle">
                          {item.unavailable_reason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Psicólogos cadastrados",
                  value: numberFormatter.format(preSignupConversion.registered_psychologists_count),
                },
                {
                  label: "Com trilha prévia",
                  value: numberFormatter.format(
                    preSignupConversion.psychologists_with_anonymous_history_count,
                  ),
                },
                {
                  label: "Sem trilha capturada",
                  value: numberFormatter.format(
                    preSignupConversion.psychologists_without_anonymous_history_count,
                  ),
                },
                {
                  label: "Cobertura da trilha",
                  value: formatNullablePercentage(preSignupConversion.history_coverage_rate),
                },
                { label: "Média", value: formatDaysMetric(preSignupConversion.average_days) },
                { label: "Mediana", value: formatDaysMetric(preSignupConversion.median_days) },
                {
                  description: "75% dos psicólogos com trilha cadastram até esse prazo",
                  label: "P75",
                  value: formatDaysMetric(preSignupConversion.p75_days),
                },
                {
                  description: "90% dos psicólogos com trilha cadastram até esse prazo",
                  label: "P90",
                  value: formatDaysMetric(preSignupConversion.p90_days),
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

            {preSignupConversion.unavailable_reason ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
                {preSignupConversion.unavailable_reason}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">
                  Distribuição do tempo até cadastro
                </h3>
                <div className="mt-4 space-y-3">
                  {preSignupConversion.buckets.map((bucket) => (
                    <MiniBar
                      key={bucket.id}
                      label={bucket.label}
                      percentage={bucket.percentage}
                      value={[
                        numberFormatter.format(bucket.count),
                        formatPercentageValue(bucket.percentage),
                      ].join(" · ")}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 p-4">
                <h3 className="text-sm font-black text-foreground">
                  Primeira página antes do cadastro
                </h3>
                {preSignupConversion.first_touch_pages.length === 0 ? (
                  <p className="mt-4 rounded-2xl bg-surface-muted p-3 text-sm font-bold text-muted">
                    Sem primeira página anônima vinculada aos psicólogos cadastrados no período.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {preSignupConversion.first_touch_pages.map((item) => (
                      <div className="rounded-2xl bg-surface-muted p-3" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-foreground">{item.label}</p>
                            <p className="text-xs font-bold text-muted">
                              {numberFormatter.format(item.psychologists_count)} psicólogos com
                              trilha
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
                          <p className="mt-2 text-xs font-bold text-subtle">
                            {item.unavailable_reason}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardShell>

      <div className="grid gap-5 xl:grid-cols-2">
        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={UserPlus}
              title="Modo de cadastro"
            />
            <PlanSegmentSelect
              id="signup-method-plan-segment"
              onChange={setSignupMethodPlanSegment}
              value={signupMethodPlanSegment}
            />
          </div>
          <SignupMethodDonutChart signupMethod={signupMethodSummary.signup_method} />
          {signupMethodSummary.signup_method.unknown_count > 0 ? (
            <p className="mt-4 text-xs font-bold text-subtle">
              {numberFormatter.format(signupMethodSummary.signup_method.unknown_count)} cadastro(s)
              legado(s) com via indisponível foram mantidos fora das duas categorias de produto.
            </p>
          ) : null}
        </CardShell>

        <CardShell className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Smartphone}
              title="Devices e sistemas"
            />
            <PlanSegmentSelect
              id="device-usage-plan-segment"
              onChange={setDeviceUsagePlanSegment}
              value={deviceUsagePlanSegment}
            />
          </div>
          <DeviceUsageDonutChart deviceUsage={deviceUsageSummary.device_usage} />
        </CardShell>

        <CardShell className="p-5 xl:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PanelTitle
              description={selectedPeriodLabel}
              icon={Activity}
              title="Uso da plataforma"
            />
            <PlanSegmentSelect
              id="platform-usage-plan-segment"
              onChange={setPlatformUsagePlanSegment}
              value={platformUsagePlanSegment}
            />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Ativos", numberFormatter.format(platformUsage.active_psychologists_count)],
              ["Taxa ativa", formatNullablePercentage(platformUsage.active_psychologists_rate)],
              [
                "PWA instalado",
                formatNullablePercentage(platformUsage.pwa_installed_psychologists_rate),
              ],
              ["Dias médios", formatDaysMetric(platformUsage.average_access_days)],
              ["Sessões médias", formatDecimalMetric(platformUsage.average_sessions)],
              ["Tempo médio", formatSecondsMetric(platformUsage.average_duration_seconds)],
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-surface-muted p-3" key={label}>
                <p className="text-xs font-black text-muted">{label}</p>
                <p className="mt-1 text-lg font-black text-foreground">{value}</p>
              </div>
            ))}
          </div>
          {platformUsage.duration_unavailable_reason ? (
            <p className="mt-3 text-xs font-bold text-subtle">
              {platformUsage.duration_unavailable_reason}
            </p>
          ) : null}
          {platformUsage.unavailable_reason ? (
            <p className="mt-4 rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
              {platformUsage.unavailable_reason}
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <PlatformPagesTitleSelect
                  id="psychologist-platform-pages-view"
                  onChange={setPlatformPagesView}
                  value={platformPagesView}
                />
                <p className="text-[0.68rem] font-bold leading-4 text-subtle sm:text-right">
                  {platformPagesView === "accesses"
                    ? "Ranking por quantidade de visualizações."
                    : "Ranking por tempo médio; acessos aparecem como contexto."}
                </p>
              </div>
              {platformPagesView === "accesses" ? (
                platformUsage.top_pages.map((page) => (
                  <MiniBar
                    key={page.label}
                    label={page.label}
                    percentage={page.percentage}
                    value={`${numberFormatter.format(page.count)} · ${formatPercentageValue(
                      page.percentage,
                    )}`}
                  />
                ))
              ) : platformDurationPages.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface-muted p-3 text-sm font-bold text-muted">
                  Sem páginas com duração confiável para calcular tempo médio no período.
                </p>
              ) : (
                platformDurationPages.map((page) => (
                  <MiniBar
                    key={page.label}
                    label={page.label}
                    percentage={
                      platformMaxAverageDuration > 0
                        ? (page.average_duration_seconds / platformMaxAverageDuration) * 100
                        : 0
                    }
                    value={`${formatSecondsMetric(page.average_duration_seconds)} méd. · ${numberFormatter.format(
                      page.count,
                    )} acessos`}
                  />
                ))
              )}
            </div>
          )}
        </CardShell>
      </div>
    </section>
  );
};
