"use client";

import type { AdminPatientsDashboard, PatientsDashboardBreakdownItem } from "@/api/req/patients";
import { buildDonutCircleSegments } from "@/lib/chart-geometry";
import { cn } from "@/lib/utils";

import {
  DEVICE_USAGE_CHART_COLORS,
  formatPercentageValue,
  numberFormatter,
} from "../modules/dashboard-support";

export type PatientsDonutChartItem = {
  color: string;
  count: number;
  id: string;
  label: string;
  percentage: number;
  sublabel?: string | null;
};

export const DonutChart = ({
  ariaLabel,
  emptyMessage,
  items,
  total,
}: {
  ariaLabel: string;
  emptyMessage: string;
  items: PatientsDonutChartItem[];
  total: number;
}) => {
  const radius = 42;
  const { circumference, segments, visibleItems } = buildDonutCircleSegments(items, total, radius);

  if (items.length === 0 || visibleItems.length === 0 || total === 0) {
    return (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <figure className="mt-5">
      <div className="grid min-w-0 gap-5 2xl:grid-cols-[170px_minmax(0,1fr)] 2xl:items-center">
        <svg
          aria-label={ariaLabel}
          className="mx-auto aspect-square w-full max-w-[12rem] min-w-0"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="var(--admin-surface-muted)"
            strokeWidth="18"
          />
          {segments.map(({ dash, item, strokeDashoffset }) => (
            <circle
              cx="60"
              cy="60"
              fill="none"
              key={item.id}
              r={radius}
              stroke={item.color}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={strokeDashoffset}
              strokeWidth="18"
              transform="rotate(-90 60 60)"
            />
          ))}
          <text
            fill="var(--admin-foreground)"
            fontSize="15"
            fontWeight="900"
            textAnchor="middle"
            x="60"
            y="58"
          >
            {numberFormatter.format(total)}
          </text>
          <text
            fill="var(--admin-muted)"
            fontSize="8"
            fontWeight="700"
            textAnchor="middle"
            x="60"
            y="72"
          >
            total
          </text>
        </svg>

        <div className="min-w-0 space-y-3">
          {items.map((item) => (
            <div
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3"
              key={item.id}
            >
              <span className="flex min-w-0 items-start gap-2 text-sm font-semibold leading-5 text-foreground">
                <span
                  aria-hidden
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      "block whitespace-normal break-words",
                      item.id === "nao_informado" && "break-normal",
                    )}
                  >
                    {item.id === "nao_informado" && item.label === "Não informado" ? (
                      <>
                        <span className="sr-only">{item.label}</span>
                        <span aria-hidden>Não</span>
                        <br aria-hidden />
                        <span aria-hidden>informado</span>
                      </>
                    ) : (
                      item.label
                    )}
                  </span>
                  {item.sublabel ? (
                    <span className="mt-1 block whitespace-nowrap text-xs font-semibold leading-5 text-subtle">
                      {item.sublabel}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="shrink-0 text-right text-sm font-semibold text-foreground">
                {numberFormatter.format(item.count)}{" "}
                <span className="text-xs font-medium text-muted">
                  ({formatPercentageValue(item.percentage)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="sr-only">
        {items
          .map(
            (item) =>
              `${item.label}: ${numberFormatter.format(item.count)} (${formatPercentageValue(
                item.percentage,
              )})`,
          )
          .join("; ")}
      </figcaption>
    </figure>
  );
};

export const BreakdownDonutChart = ({
  colorForItem,
  countLabel = "cadastro(s)",
  emptyMessage = "Sem dados disponíveis.",
  items,
  total,
}: {
  colorForItem: (item: PatientsDashboardBreakdownItem, index: number) => string;
  countLabel?: string;
  emptyMessage?: string;
  items: PatientsDashboardBreakdownItem[];
  total: number;
}) => {
  const chartItems = items.map((item, index) => ({
    color: colorForItem(item, index),
    count: item.count,
    id: item.id,
    label: item.label,
    percentage: item.percentage,
  }));
  const ariaLabel =
    items.length > 0
      ? `Gráfico de donut: ${items
          .map(
            (item) =>
              `${item.label}: ${numberFormatter.format(item.count)} ${countLabel}, ${formatPercentageValue(
                item.percentage,
              )}`,
          )
          .join("; ")}.`
      : emptyMessage;

  return (
    <DonutChart
      ariaLabel={ariaLabel}
      emptyMessage={emptyMessage}
      items={chartItems}
      total={total}
    />
  );
};

export const DeviceUsageDonutChart = ({
  deviceUsage,
}: {
  deviceUsage: AdminPatientsDashboard["device_usage"];
}) => {
  const total = Math.max(0, deviceUsage.total_sessions);
  const emptyMessage =
    deviceUsage.unavailable_reason ??
    "Sem sessões autenticadas de pacientes no período selecionado.";
  const chartItems = deviceUsage.items.map((item) => {
    const operatingSystems = item.device_type === "unknown" ? [] : (item.operating_systems ?? []);
    const operatingSystemSummary = operatingSystems
      .map(
        (operatingSystem) =>
          `${operatingSystem.label} ${formatPercentageValue(operatingSystem.percentage)}`,
      )
      .join(" · ");

    return {
      color: DEVICE_USAGE_CHART_COLORS[item.device_type],
      count: item.count,
      id: item.device_type,
      label: item.label,
      percentage: item.percentage,
      sublabel: operatingSystemSummary || null,
    };
  });
  const ariaLabel = `Gráfico de donut dos devices usados por pacientes: ${deviceUsage.items
    .map(
      (item) =>
        `${item.label}: ${numberFormatter.format(item.count)} sessão(ões), ${formatPercentageValue(
          item.percentage,
        )}`,
    )
    .join("; ")}.`;

  return (
    <DonutChart
      ariaLabel={ariaLabel}
      emptyMessage={emptyMessage}
      items={chartItems}
      total={total}
    />
  );
};
