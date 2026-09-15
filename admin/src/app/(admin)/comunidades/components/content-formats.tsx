"use client";

import { buildPieSlicePath, getPiePoint } from "@/lib/chart-geometry";

export { buildPieSlicePath, getPiePoint };

import type {
  CommunitiesDashboardGlobalStatistics,
  CommunitiesPostContentFormatDistribution,
} from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

import { numberFormatter } from "../modules/statistics-config";

import { CardShell } from "./common";

export type CommunityPostContentFormatDistributionItem =
  CommunitiesPostContentFormatDistribution["items"][number];

export const communityPostContentFormatChartColors = {
  image: "var(--admin-primary)",
  image_carousel: "var(--admin-warning)",
  text: "var(--admin-muted)",
  video: "var(--admin-chart-accent)",
} satisfies Record<CommunityPostContentFormatDistributionItem["id"], string>;

export const hexToRgba = colorWithAlpha;

export const PiePercentageLabel = ({
  color,
  label,
  x,
  y,
}: {
  color: string;
  label: string;
  x: number;
  y: number;
}) => {
  const width = 39;
  const height = 16;

  return (
    <g>
      <rect
        fill={hexToRgba(color, 0.86)}
        height={height}
        rx={height / 2}
        width={width}
        x={x - width / 2}
        y={y - height / 2}
      />
      <text
        dominantBaseline="middle"
        fill="var(--admin-surface)"
        fontSize="8.5"
        fontWeight="900"
        textAnchor="middle"
        x={x}
        y={y + 0.25}
      >
        {label}
      </text>
    </g>
  );
};

export const formatContentFormatPercentage = (percentage: number) =>
  `${percentage.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: percentage > 0 && percentage < 1 ? 1 : 0,
  })}%`;

export const formatContentFormatTotal = (
  total: number,
  labels: { plural: string; singular: string },
) => `${numberFormatter.format(total)} ${total === 1 ? labels.singular : labels.plural}`;

export const DashboardContentFormatDistributionCard = ({
  description,
  distribution,
  title,
  totalLabels,
}: {
  description: string;
  distribution: CommunitiesPostContentFormatDistribution;
  title: string;
  totalLabels: { plural: string; singular: string };
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const visibleItems = distribution.items.filter((item) => item.count > 0);
  const hasContent = distribution.total > 0 && visibleItems.length > 0;
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: CommunityPostContentFormatDistributionItem;
      share: number;
      startAngle: number;
    }>;
  }>(
    (accumulator, item) => {
      const share = distribution.total > 0 ? item.count / distribution.total : 0;
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
  const ariaLabel = hasContent
    ? `Gráfico de donut de formatos de ${title.toLowerCase()}: ${distribution.items
        .map(
          (item) =>
            `${item.label}: ${numberFormatter.format(item.count)}, ${formatContentFormatPercentage(
              item.percentage,
            )}`,
        )
        .join("; ")}.`
    : `Gráfico de donut de formatos de ${title.toLowerCase()}: sem conteúdo no período selecionado.`;

  return (
    <CardShell className="min-w-0 max-w-full overflow-hidden p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs font-medium leading-5 text-muted">{description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted">
          {formatContentFormatTotal(distribution.total, totalLabels)}
        </span>
      </div>

      <figure className="mt-5 grid gap-4 sm:grid-cols-[minmax(8rem,10rem)_1fr] sm:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-36 sm:w-40"
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
            const color = communityPostContentFormatChartColors[segment.item.id];
            const labelPoint = getPiePoint(
              center,
              radius * 0.58,
              (segment.startAngle + segment.endAngle) / 2,
            );
            const percentageLabel = formatContentFormatPercentage(segment.item.percentage);

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
                  <PiePercentageLabel color={color} label={percentageLabel} x={center} y={center} />
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
                {segment.share > 1 ? (
                  <PiePercentageLabel
                    color={color}
                    label={percentageLabel}
                    x={labelPoint.x}
                    y={labelPoint.y}
                  />
                ) : null}
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
            {numberFormatter.format(distribution.total)}
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
        <figcaption className="grid gap-2">
          {distribution.items.map((item) => (
            <div
              className={cn("rounded-2xl bg-surface-muted p-3", item.count === 0 && "opacity-70")}
              key={item.id}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: communityPostContentFormatChartColors[item.id] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {formatContentFormatPercentage(item.percentage)}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-muted">
                {formatContentFormatTotal(item.count, totalLabels)}
              </p>
            </div>
          ))}
        </figcaption>
      </figure>
    </CardShell>
  );
};

export const DashboardContentFormatDistributionsBlock = ({
  statistics,
}: {
  statistics: CommunitiesDashboardGlobalStatistics;
}) => (
  <div className="grid gap-5 lg:grid-cols-2">
    <DashboardContentFormatDistributionCard
      description="Quantidade e taxa por formato dos posts de psicólogos no mesmo período da Cobertura de acolhimento."
      distribution={statistics.charts.posts_by_content_format}
      title="Posts"
      totalLabels={{ plural: "posts", singular: "post" }}
    />
    <DashboardContentFormatDistributionCard
      description="Quantidade e taxa por formato das respostas de psicólogos no mesmo período da Cobertura de acolhimento."
      distribution={statistics.charts.replies_by_content_format}
      title="Respostas"
      totalLabels={{ plural: "respostas", singular: "resposta" }}
    />
  </div>
);
