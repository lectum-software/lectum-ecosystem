"use client";

import { ChevronDown } from "lucide-react";
import type { FocusEvent, ReactNode } from "react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";

import {
  CARD_ORDER,
  DASHBOARD_PERIOD_OPTIONS,
  type DashboardMetricKey,
  type DashboardPeriodPreset,
  type DashboardPeriodValue,
  type DashboardRange,
} from "../modules/dashboard-support";

import { CardShell, DASHBOARD_METRIC_CONFIG, MetricCard } from "./metric-cards";

export const PsychologistsHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Psicólogos</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Dashboard de Psicólogos
      </h1>
      <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
        Análise global dos psicólogos da plataforma.
      </p>
    </div>
  </section>
);

export const DashboardPeriodControls = ({
  displayRange,
  onDateControlsBlur,
  onDateChange,
  onPeriodChange,
  period,
  rangeError,
}: {
  displayRange: DashboardRange;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onDateChange: (field: keyof DashboardRange, value: string) => void;
  onPeriodChange: (period: DashboardPeriodPreset) => void;
  period: DashboardPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="psychologists-period">
        Período
        <span className="relative">
          <select
            className="h-11 w-full min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="psychologists-period"
            onChange={(event) => onPeriodChange(event.target.value as DashboardPeriodPreset)}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {DASHBOARD_PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden
            className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
          />
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-semibold text-muted">
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted">
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control focus:border-primary"
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="max-w-md text-xs font-bold text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const DashboardOverviewPanel = ({
  children,
  periodControls,
  periodDescription,
}: {
  children: ReactNode;
  periodControls: ReactNode;
  periodDescription: string;
}) => (
  <CardShell className="min-w-0 p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-bold text-foreground">Visão geral</h2>
        <p className="mt-1 text-sm font-bold leading-6 text-muted">{periodDescription}</p>
      </div>
      {periodControls}
    </div>
    <div className="mt-5">{children}</div>
  </CardShell>
);

export const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPsychologistsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            totalPsychologists={cards.total_psychologists.value}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};
