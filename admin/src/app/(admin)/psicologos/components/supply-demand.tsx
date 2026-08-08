"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { PsychologistsDashboardBreakdownItem } from "@/api/req/psychologists";
import { cn } from "@/lib/utils";
import {
  formatPercentageValue,
  numberFormatter,
  type SupplyDemandSortKey,
  toOneDecimal,
} from "../modules/dashboard-support";
import { hexToRgba } from "./metric-cards";
import { findSupplyItem, formatComparisonNumber } from "./timeline-filters";

export type SupplyDemandDimensionConfig = {
  demand: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
  icon: LucideIcon;
  id: string;
  label: string;
  supply: {
    items: PsychologistsDashboardBreakdownItem[];
    total: number;
  };
};

export type SupplyDemandComparisonRow = {
  id: string;
  label: string;
  psychologistsCount: number;
  psychologistsPercentage: number;
  searchesPerPsychologist: number | null;
  searchesCount: number;
  searchesPercentage: number;
};

export const getSupplyDemandStatus = (row: SupplyDemandComparisonRow) => {
  if (row.searchesCount > 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-danger-soft text-danger",
      label: "Sem oferta",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount > 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem demanda",
    };
  }

  if (row.searchesCount === 0 && row.psychologistsCount === 0) {
    return {
      className: "bg-surface-muted text-muted",
      label: "Sem sinal",
    };
  }

  const pressure = row.searchesPerPsychologist ?? 0;

  if (pressure >= 100) {
    return {
      className: "bg-danger-soft text-danger",
      label: "Alta demanda",
    };
  }

  if (pressure >= 25) {
    return {
      className: "bg-warning-soft text-warning",
      label: "Atenção",
    };
  }

  if (pressure >= 5) {
    return {
      className: "bg-primary-soft text-primary",
      label: "Equilibrado",
    };
  }

  return {
    className: "bg-success-soft text-success",
    label: "Oferta confortável",
  };
};

export const buildSupplyDemandRows = (config: SupplyDemandDimensionConfig) =>
  config.demand.items.map<SupplyDemandComparisonRow>((demandItem) => {
    const supplyItem = findSupplyItem(demandItem, config.supply.items);

    return {
      id: demandItem.id,
      label: demandItem.label,
      psychologistsCount: supplyItem.count,
      psychologistsPercentage: supplyItem.percentage,
      searchesPerPsychologist:
        supplyItem.count > 0 ? toOneDecimal(demandItem.count / supplyItem.count) : null,
      searchesCount: demandItem.count,
      searchesPercentage: demandItem.percentage,
    };
  });

export const getSupplyDemandSortValue = (
  row: SupplyDemandComparisonRow,
  sortKey: SupplyDemandSortKey,
) => {
  if (sortKey === "psychologists") return row.psychologistsCount;
  if (sortKey === "searches_per_psychologist") {
    if (row.searchesPerPsychologist !== null) return row.searchesPerPsychologist;

    return row.searchesCount > 0 ? Number.POSITIVE_INFINITY : 0;
  }

  return row.searchesCount;
};

export const SupplyDemandHeaderCell = ({
  align = "left",
  label,
  total,
}: {
  align?: "center" | "left" | "right";
  label: string;
  total: number;
}) => (
  <span
    className={cn(
      "inline-flex items-baseline gap-1",
      align === "center" && "justify-center text-center",
      align === "right" && "justify-end text-right",
    )}
  >
    <span>{label}</span>
    <span className="text-[0.68rem] font-medium tracking-normal text-subtle">
      ({numberFormatter.format(total)})
    </span>
  </span>
);

export const SupplyDemandCountCell = ({
  count,
  label,
  percentage,
}: {
  count: number;
  label: string;
  percentage: number;
}) => (
  <div>
    <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
      <span className="font-bold text-muted lg:hidden">{label}</span>
      <span className="inline-flex items-baseline gap-1 text-base font-semibold text-foreground lg:justify-center lg:text-center">
        <span>{numberFormatter.format(count)}</span>
        <span className="text-sm font-medium text-muted">
          ({formatPercentageValue(percentage)})
        </span>
      </span>
    </div>
  </div>
);

export const SearchesPerPsychologistCell = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const value =
    row.searchesPerPsychologist === null
      ? "—"
      : formatComparisonNumber(row.searchesPerPsychologist);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs lg:justify-center">
        <span className="font-bold text-muted lg:hidden">Buscas/psicólogo</span>
        <span className="text-base font-semibold text-foreground lg:text-center">{value}</span>
      </div>
    </div>
  );
};

export const SupplyDemandListRow = ({ row }: { row: SupplyDemandComparisonRow }) => {
  const status = getSupplyDemandStatus(row);

  return (
    <li className="grid gap-4 border-t border-border p-4 lg:grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] lg:items-center">
      <div>
        <p className="text-sm font-semibold text-foreground">{row.label}</p>
      </div>
      <SupplyDemandCountCell
        count={row.searchesCount}
        label="Buscas"
        percentage={row.searchesPercentage}
      />
      <SupplyDemandCountCell
        count={row.psychologistsCount}
        label="Psicólogos"
        percentage={row.psychologistsPercentage}
      />
      <SearchesPerPsychologistCell row={row} />
      <div className="flex flex-col items-start gap-1 lg:items-end">
        <span
          className={cn("rounded-full px-2 py-1 text-[0.65rem] font-semibold", status.className)}
        >
          {status.label}
        </span>
      </div>
    </li>
  );
};

export const MiniBar = ({
  label,
  percentage,
  value,
}: {
  label: string;
  percentage: number;
  value: ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-xs font-black">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
      <div
        aria-hidden
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  </div>
);

export const getPiePoint = (center: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = (Math.PI / 180) * angleInDegrees;

  return {
    x: center + radius * Math.cos(angleInRadians),
    y: center + radius * Math.sin(angleInRadians),
  };
};

export const buildPieSlicePath = (
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) => {
  const start = getPiePoint(center, radius, startAngle);
  const end = getPiePoint(center, radius, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${center} ${center}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
};

export const renderPiePercentageLabel = ({
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
        fill="white"
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
