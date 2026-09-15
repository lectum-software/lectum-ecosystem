"use client";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";

import {
  type DeviceUsageItem,
  formatPercentageValue,
  numberFormatter,
} from "../modules/dashboard-support";

import { buildPieSlicePath, getPiePoint, renderPiePercentageLabel } from "./supply-demand";

export const DEVICE_USAGE_CHART_COLORS = {
  desktop: "var(--admin-success)",
  mobile: "var(--admin-primary)",
  tablet: "var(--admin-chart-accent)",
  unknown: "var(--admin-subtle)",
} satisfies Record<DeviceUsageItem["device_type"], string>;

export const DeviceUsageDonutChart = ({
  deviceUsage,
}: {
  deviceUsage: AdminPsychologistsDashboard["device_usage"];
}) => {
  const center = 60;
  const radius = 48;
  const innerRadius = 31;
  const total = Math.max(0, deviceUsage.total_sessions);
  const visibleItems = deviceUsage.items.filter((item) => item.count > 0);
  const segments = visibleItems.reduce<{
    currentAngle: number;
    items: Array<{
      endAngle: number;
      item: DeviceUsageItem;
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
        {deviceUsage.unavailable_reason ??
          "Sem sessões autenticadas de psicólogos no período selecionado."}
      </p>
    );
  }

  const ariaLabel = `Gráfico de donut dos devices usados por psicólogos: ${deviceUsage.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} sessão(ões), ${formatPercentageValue(
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
          const color = DEVICE_USAGE_CHART_COLORS[segment.item.device_type];
          const labelPoint = getPiePoint(
            center,
            radius * 0.58,
            (segment.startAngle + segment.endAngle) / 2,
          );
          const percentageLabel = formatPercentageValue(segment.item.percentage);

          if (segment.share >= 0.999) {
            return (
              <g key={segment.item.device_type}>
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
            <g key={segment.item.device_type}>
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
        {deviceUsage.items.map((item) => {
          const operatingSystems =
            item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
          const operatingSystemSummary = operatingSystems
            .map(
              (operatingSystem) =>
                `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
            )
            .join(" · ");

          return (
            <div className="rounded-2xl bg-surface-muted p-3" key={item.device_type}>
              <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                  <span
                    aria-hidden
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: DEVICE_USAGE_CHART_COLORS[item.device_type] }}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="text-sm font-black text-foreground">
                  {formatPercentageValue(item.percentage)}
                </span>
              </div>
              {operatingSystemSummary ? (
                <p className="mt-2 whitespace-nowrap text-xs font-medium leading-5 text-subtle">
                  {operatingSystemSummary}
                </p>
              ) : null}
            </div>
          );
        })}
      </figcaption>
    </figure>
  );
};
