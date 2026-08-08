"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import {
  hexToRgba,
  numberFormatter,
  type OverviewPeriodPreset,
  type OverviewPeriodValue,
  type OverviewRange,
  overviewPeriodOptions,
} from "../modules/overview-support";

export const OverviewSelect = ({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
  value: string;
}) => (
  <label className="grid min-w-0 gap-1 text-xs font-semibold text-muted sm:w-48 xl:w-48">
    {label}
    <span className="relative">
      <select
        className="h-10 w-full min-w-0 appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map(([id, optionLabel]) => (
          <option key={id} value={id}>
            {optionLabel}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

export const OverviewPeriodControls = ({
  onDateChange,
  onPeriodChange,
  period,
  range,
  rangeError,
  title,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onPeriodChange: (period: OverviewPeriodPreset) => void;
  period: OverviewPeriodValue;
  range: OverviewRange;
  rangeError: string | null;
  title: string;
}) => {
  const id = `moderation-period-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 xl:w-auto xl:items-end">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap">
        <label
          className="grid min-w-0 gap-1 text-xs font-semibold text-muted sm:w-44 xl:w-40"
          htmlFor={id}
        >
          Período
          <span className="relative">
            <select
              className="h-10 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              id={id}
              onChange={(event) => onPeriodChange(event.target.value as OverviewPeriodPreset)}
              value={period}
            >
              {period === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {overviewPeriodOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
            />
          </span>
        </label>
        <div className="grid shrink-0 gap-2 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted sm:w-36 xl:w-32">
            De
            <input
              className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              max={range.to}
              onChange={(event) => onDateChange("from", event.target.value)}
              type="date"
              value={range.from}
            />
          </label>
          <label className="text-xs font-semibold text-muted sm:w-36 xl:w-32">
            Até
            <input
              className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
              min={range.from}
              onChange={(event) => onDateChange("to", event.target.value)}
              type="date"
              value={range.to}
            />
          </label>
        </div>
      </div>
      {rangeError ? <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p> : null}
    </div>
  );
};

export const OverviewMetricCard = ({
  active,
  color,
  icon: Icon,
  label,
  onToggle,
  value,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  label: string;
  onToggle: () => void;
  value: number;
}) => {
  const formattedValue = numberFormatter.format(value);

  return (
    <button
      aria-pressed={active}
      className={cn(
        "min-h-[8.75rem] min-w-0 rounded-card border p-3 text-left transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:p-4 xl:min-h-[8.25rem] xl:p-3",
        active
          ? "border-primary/35 bg-surface shadow-admin-soft ring-1 ring-primary/10"
          : "border-border/80 bg-border/50 shadow-none hover:-translate-y-0.5 hover:border-primary/25 hover:bg-border/60",
      )}
      onClick={onToggle}
      title={`${label}: ${formattedValue}. ${active ? "Visível no gráfico" : "Oculto no gráfico"}`}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-9 w-9 place-items-center rounded-full xl:h-8 xl:w-8"
          style={{ backgroundColor: hexToRgba(color, 0.1), color }}
        >
          <Icon aria-hidden className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 min-w-0 space-y-1.5 xl:mt-3">
        <p
          className="truncate whitespace-nowrap text-xs font-semibold text-foreground"
          title={label}
        >
          {label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <span className="min-w-0 truncate">{formattedValue}</span>
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <span className="whitespace-nowrap text-[0.68rem] font-semibold text-muted">
            dados registrados
          </span>
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            por data de origem
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};
