"use client";

import { Activity, Info } from "lucide-react";
import type { DashboardWhatsAppClickDistribution } from "@/api/req/dashboard";
import { cn } from "@/lib/utils";

import { formatGini, formatPercent, numberFormatter } from "../modules/dashboard-support";

import { ChartCard } from "./reports-overview";

export const concentrationToneClasses: Record<
  DashboardWhatsAppClickDistribution["concentration_level"],
  string
> = {
  balanced: "bg-success/10 text-success",
  concentrated: "bg-danger/10 text-danger",
  moderate: "bg-warning/10 text-warning",
  unavailable: "bg-surface-muted text-muted",
};

export const DistributionStatCard = ({
  detail,
  label,
  value,
}: {
  detail: string;
  label: string;
  value: string;
}) => (
  <div className="min-w-0 rounded-[1.25rem] border border-border/70 bg-surface p-3 shadow-control">
    <p className="text-xs font-semibold text-muted">{label}</p>
    <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground">{value}</p>
    <p className="mt-1 text-[0.72rem] font-medium leading-4 text-muted">{detail}</p>
  </div>
);

export const WhatsAppDistributionChartTitle = () => (
  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h3 className="text-sm font-bold text-foreground">Curva acumulada dos cliques</h3>
      <p className="mt-1 text-xs font-semibold text-muted">
        Proporção fixa 16:9 para leitura executiva.
      </p>
    </div>
    <span className="group relative inline-flex w-fit">
      <button
        aria-label="O que significa a curva acumulada dos cliques"
        className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-muted shadow-control transition hover:border-primary/40 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        title="O que significa a curva acumulada dos cliques"
        type="button"
      >
        <Info aria-hidden className="h-4 w-4" />
      </button>
      <span
        className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-[min(18rem,calc(100vw-3rem))] rounded-2xl border border-border bg-surface p-3 text-left text-xs font-semibold leading-5 text-muted opacity-0 shadow-admin-soft transition group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        O eixo X mostra o percentual acumulado de psicólogos, ordenados de menos para mais cliques.
        O eixo Y mostra o percentual acumulado de cliques. Quanto mais a curva azul fica abaixo da
        linha pontilhada, maior é a concentração dos cliques em poucos psicólogos.
      </span>
    </span>
  </div>
);

export const buildSvgLinePath = (points: Array<{ x: number; y: number }>) =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

export const WhatsAppDistributionChart = ({
  distribution,
}: {
  distribution: DashboardWhatsAppClickDistribution;
}) => {
  const hasClickableDistribution =
    distribution.total_psychologists > 0 && distribution.total_clicks > 0;

  if (!hasClickableDistribution) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-border bg-surface-muted p-4 text-sm font-medium leading-6 text-muted">
        {distribution.summary}
      </div>
    );
  }

  const width = 640;
  const height = 360;
  const padding = { bottom: 74, left: 86, right: 26, top: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const getX = (percentage: number) => padding.left + (percentage / 100) * chartWidth;
  const getY = (percentage: number) => padding.top + chartHeight - (percentage / 100) * chartHeight;
  const curvePoints = distribution.curve.map((point) => ({
    x: getX(point.psychologist_percentage),
    y: getY(point.click_percentage),
  }));
  const curvePath = buildSvgLinePath(curvePoints);
  const equalityPath = buildSvgLinePath([
    { x: getX(0), y: getY(0) },
    { x: getX(100), y: getY(100) },
  ]);
  const gridValues = [0, 25, 50, 75, 100];

  return (
    <figure className="min-w-0 overflow-visible rounded-[1.5rem] border border-border/70 bg-surface p-4">
      <WhatsAppDistributionChartTitle />
      <div className="overflow-x-auto">
        <svg
          aria-label={`Curva acumulada da distribuição de cliques de WhatsApp: ${distribution.summary}`}
          className="aspect-[16/9] h-auto w-full min-w-[20rem]"
          role="img"
          viewBox={`0 0 ${width} ${height}`}
        >
          {gridValues.map((value) => {
            const x = getX(value);
            const y = getY(value);

            return (
              <g key={`whatsapp-distribution-grid-${value}`}>
                <line
                  opacity="0.54"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                />
                <line
                  opacity="0.28"
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  x1={x}
                  x2={x}
                  y1={padding.top}
                  y2={height - padding.bottom}
                />
                <text
                  fill="var(--admin-muted)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                  x={padding.left - 14}
                  y={y + 4}
                >
                  {value}%
                </text>
                <text
                  fill="var(--admin-muted)"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  x={x}
                  y={height - padding.bottom + 30}
                >
                  {value}%
                </text>
              </g>
            );
          })}

          <path
            d={equalityPath}
            fill="none"
            stroke="var(--admin-muted)"
            strokeDasharray="7 7"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
          <path
            d={curvePath}
            fill="none"
            stroke="var(--admin-primary)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          <circle
            cx={getX(100)}
            cy={getY(100)}
            fill="var(--admin-surface)"
            r="4"
            stroke="var(--admin-primary)"
            strokeWidth="2"
          />
          <text
            fill="var(--admin-foreground)"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            x={padding.left + chartWidth / 2}
            y={height - 10}
          >
            % acumulado de psicólogos
          </text>
          <text
            fill="var(--admin-foreground)"
            fontSize="11"
            fontWeight="700"
            textAnchor="middle"
            transform={`translate(18 ${padding.top + chartHeight / 2}) rotate(-90)`}
          >
            % acumulado de cliques
          </text>
        </svg>
      </div>
      <div className="mt-4 flex flex-col gap-3 text-xs font-semibold text-muted sm:flex-row sm:flex-wrap">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0.5 w-7 rounded-full bg-primary" />
          Distribuição atual
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-0 w-7 border-t border-dashed border-border" />
          Distribuição equilibrada
        </span>
      </div>
    </figure>
  );
};

export const WhatsAppDistributionCard = ({
  distribution,
  periodDescription,
}: {
  distribution: DashboardWhatsAppClickDistribution;
  periodDescription: string;
}) => {
  const withoutClicksPercentage = formatPercent(
    distribution.total_psychologists > 0
      ? (distribution.psychologists_without_clicks / distribution.total_psychologists) * 100
      : 0,
  );

  return (
    <ChartCard
      description={periodDescription}
      icon={Activity}
      title="Distribuição dos cliques de WhatsApp"
    >
      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold",
            concentrationToneClasses[distribution.concentration_level],
          )}
        >
          {distribution.concentration_label}
          {distribution.gini !== null ? ` · Gini ${formatGini(distribution.gini)}` : ""}
        </span>
      </div>

      <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,48rem)_minmax(15rem,18rem)] lg:justify-center xl:grid-cols-[minmax(0,48rem)_minmax(17rem,20rem)]">
        <WhatsAppDistributionChart distribution={distribution} />

        <aside
          aria-label="Contadores da distribuição de cliques de WhatsApp"
          className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-1"
        >
          <DistributionStatCard
            detail="Registros de contato"
            label="Cliques de WhatsApp"
            value={numberFormatter.format(distribution.total_clicks)}
          />
          <DistributionStatCard
            detail="Ativos e publicados"
            label="Psicólogos considerados"
            value={numberFormatter.format(distribution.total_psychologists)}
          />
          <DistributionStatCard
            detail={`${withoutClicksPercentage} da base`}
            label="Sem clique"
            value={numberFormatter.format(distribution.psychologists_without_clicks)}
          />
          <DistributionStatCard
            detail={
              numberFormatter.format(distribution.top_10_percent.psychologist_count) +
              " psicólogo(s)"
            }
            label="Top 10%"
            value={formatPercent(distribution.top_10_percent.click_percentage)}
          />
          <DistributionStatCard
            detail={
              numberFormatter.format(distribution.top_20_percent.psychologist_count) +
              " psicólogo(s)"
            }
            label="Top 20%"
            value={formatPercent(distribution.top_20_percent.click_percentage)}
          />
        </aside>
      </div>
    </ChartCard>
  );
};
