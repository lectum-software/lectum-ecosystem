"use client";

import { ChevronDown, type LucideIcon } from "lucide-react";
import type { FocusEvent, ReactNode } from "react";
import type {
  AdminPatientsDashboard,
  PatientsDashboardBreakdownItem,
  PatientsDashboardIntentFilterId,
  PatientsDashboardIntentFilterOption,
  PatientsDashboardMetric,
} from "@/api/req/patients";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import { colorWithAlpha } from "@/lib/visual-tokens";

import {
  BRAZIL_STATE_CODES,
  BRAZIL_STATE_NAME_TO_CODE,
  CARD_ORDER,
  DASHBOARD_METRIC_CONFIG,
  type DashboardMetricKey,
  formatChange,
  numberFormatter,
  PATIENTS_DASHBOARD_PERIOD_OPTIONS,
  type PatientsDashboardPeriodPreset,
  type PatientsDashboardPeriodValue,
  type PatientsDashboardRange,
  PLATFORM_PAGES_VIEW_OPTIONS,
  type PlatformPagesView,
} from "../modules/dashboard-support";

export const CardShell = ({
  children,
  className,
  id,
}: {
  children?: ReactNode;
  className?: string;
  id?: string;
}) => (
  <section
    className={cn(
      "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
    id={id}
  >
    {children}
  </section>
);

export const PanelTitle = ({
  action,
  description,
  icon: Icon,
  title,
  titleClassName,
}: {
  action?: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
  title: string;
  titleClassName?: string;
}) => (
  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <Icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0">
        <h3
          className={cn(
            "min-w-0 whitespace-nowrap text-lg font-bold text-foreground",
            titleClassName,
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-1 max-w-full text-sm font-bold leading-5 text-muted">{description}</p>
        ) : null}
      </div>
    </div>
    {action ? (
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">{action}</div>
    ) : null}
  </div>
);

export const IntentFilterSelect = ({
  id,
  onChange,
  options,
  value,
}: {
  id: string;
  onChange: (value: PatientsDashboardIntentFilterId) => void;
  options: PatientsDashboardIntentFilterOption[];
  value: PatientsDashboardIntentFilterId;
}) => (
  <label className="grid w-full gap-1 text-xs font-semibold text-muted sm:w-auto" htmlFor={id}>
    <span className="sr-only">Filtrar por intenção do paciente</span>
    <span className="relative">
      <select
        className="h-10 w-full min-w-[7.75rem] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-8 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-[7.75rem]"
        id={id}
        onChange={(event) => onChange(event.target.value as PatientsDashboardIntentFilterId)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  </label>
);

export const PlatformPagesTitleSelect = ({
  id,
  onChange,
  value,
}: {
  id: string;
  onChange: (value: PlatformPagesView) => void;
  value: PlatformPagesView;
}) => (
  <label className="inline-flex max-w-full" htmlFor={id}>
    <span className="sr-only">Selecionar ranking de páginas por acessos ou tempo médio</span>
    <span className="relative inline-flex max-w-full items-center">
      <select
        className="max-w-full appearance-none truncate rounded-control bg-transparent py-0 pl-0 pr-7 text-left text-sm font-black text-foreground outline-none transition hover:text-primary focus:text-primary focus:ring-2 focus:ring-primary/20"
        id={id}
        onChange={(event) => onChange(event.target.value as PlatformPagesView)}
        value={value}
      >
        {PLATFORM_PAGES_VIEW_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
      />
    </span>
  </label>
);

export const hexToRgba = colorWithAlpha;

export const normalizeLocationLookupKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const resolveBrazilStateCode = (item: PatientsDashboardBreakdownItem) => {
  const candidates = [item.id.split(":")[0], item.label.split(",")[0], item.label].map((value) =>
    value.trim(),
  );

  for (const candidate of candidates) {
    const upper = candidate.toUpperCase();
    if (BRAZIL_STATE_CODES.has(upper)) return upper;

    const normalized = normalizeLocationLookupKey(candidate);
    const code = BRAZIL_STATE_NAME_TO_CODE[normalized];
    if (code) return code;
  }

  return null;
};

export const formatLocationCaptureCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "paciente" : "pacientes"}`;

export const TrendBadge = ({ metric }: { metric: PatientsDashboardMetric }) => {
  if (metric.unavailable) {
    return (
      <span className="whitespace-nowrap text-[0.68rem] font-bold text-warning">Indisponível</span>
    );
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap text-[0.68rem] font-semibold",
        metric.trend === "up" && "text-success",
        metric.trend === "down" && "text-danger",
        metric.trend === "flat" && "text-muted",
        metric.trend === "unavailable" && "text-muted",
      )}
    >
      {formatChange(metric.change_percent)}
    </span>
  );
};

export const MetricCard = ({
  active,
  color,
  icon: Icon,
  metric,
  onToggle,
}: {
  active: boolean;
  color: string;
  icon: LucideIcon;
  metric: PatientsDashboardMetric;
  onToggle: () => void;
}) => {
  const formattedValue = numberFormatter.format(metric.value);

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
      title={`${metric.label}: ${formattedValue}. ${
        active ? "Visível no gráfico" : "Oculto no gráfico"
      }`}
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
          title={metric.label}
        >
          {metric.label}
        </p>
        <p className="flex min-w-0 items-baseline gap-1.5 overflow-hidden whitespace-nowrap text-2xl font-bold tracking-tight text-foreground xl:text-[1.65rem]">
          <span className="min-w-0 truncate">{formattedValue}</span>
        </p>
        <div className="flex min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap">
          <TrendBadge metric={metric} />
          <span className="min-w-0 truncate text-[0.68rem] font-medium text-muted">
            vs. período anterior
          </span>
        </div>
        <span className="sr-only">{active ? "visível no gráfico" : "oculto no gráfico"}</span>
      </div>
    </button>
  );
};

export const LoadingGrid = () => (
  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
    {CARD_ORDER.map((key) => (
      <CardShell
        className="h-[8.75rem] animate-pulse bg-surface-muted xl:h-[8.25rem]"
        key={`patients-${key}`}
      />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Pacientes"
  />
);

export const PatientsPeriodControls = ({
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: {
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: (event: FocusEvent<HTMLDivElement>) => void;
  onPeriodChange: (period: PatientsDashboardPeriodPreset) => void;
  displayRange: PatientsDashboardRange;
  period: PatientsDashboardPeriodValue;
  rangeError: string | null;
}) => (
  <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="grid gap-1 text-xs font-semibold text-muted" htmlFor="patients-period">
        Período
        <span className="relative">
          <select
            className="h-11 min-w-[170px] appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id="patients-period"
            onChange={(event) =>
              onPeriodChange(event.target.value as PatientsDashboardPeriodPreset)
            }
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {PATIENTS_DASHBOARD_PERIOD_OPTIONS.map((option) => (
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

export const PatientsHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Pacientes</p>
    <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
      Dashboard de Pacientes
    </h1>
    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
      Gerencie crescimento, status de conta e acompanhamento básico dos pacientes da plataforma.
    </p>
  </section>
);

export const CardsGrid = ({
  activeMetricKeys,
  onToggleMetric,
  summary,
}: {
  activeMetricKeys: DashboardMetricKey[];
  onToggleMetric: (key: DashboardMetricKey) => void;
  summary: AdminPatientsDashboard;
}) => {
  const cards = summary.cards;

  return (
    <fieldset className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <legend className="sr-only">Contadores exibidos no gráfico da visão geral</legend>
      {CARD_ORDER.map((key) => {
        const config = DASHBOARD_METRIC_CONFIG[key];

        return (
          <MetricCard
            active={activeMetricKeys.includes(key)}
            key={key}
            metric={cards[key]}
            onToggle={() => onToggleMetric(key)}
            {...config}
          />
        );
      })}
    </fieldset>
  );
};
