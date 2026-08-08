"use client";

import { ChevronDown, UsersRound } from "lucide-react";
import type { FocusEventHandler } from "react";
import type { AdminCommunitiesDashboard, CommunitiesDashboardQuery } from "@/api/req/communities";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";

import { formatDate } from "../modules/period-support";

import {
  COMMUNITY_DASHBOARD_PERIOD_OPTIONS,
  type CommunityDashboardPeriodPreset,
  type CommunityDashboardPeriodValue,
} from "../modules/statistics-config";

export const CardShell = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => (
  <section
    className={cn(
      "min-w-0 rounded-card border border-border bg-surface shadow-admin-soft",
      className,
    )}
  >
    {children}
  </section>
);

export const LoadingGrid = () => (
  <div className="grid gap-5">
    {["people", "content"].map((key) => (
      <CardShell className="h-80 animate-pulse bg-surface-muted" key={key} />
    ))}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <AdminQueryErrorState
    message={message}
    onRetry={onRetry}
    title="Não foi possível carregar Comunidades"
  />
);

export const EmptyState = ({ period }: { period: AdminCommunitiesDashboard["period"] }) => (
  <CardShell className="border-dashed p-5">
    <div className="flex gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
        <UsersRound aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-semibold">Período sem atividade capturada</h2>
        <p className="mt-1 text-sm text-muted">
          Nenhum post, comentário, denúncia ou atividade foi encontrado entre{" "}
          {formatDate(period.from)} e {formatDate(period.to)}. Ajuste o período ou aguarde novas
          interações.
        </p>
      </div>
    </div>
  </CardShell>
);

export type DashboardPeriodControlsProps = {
  controlIdPrefix: string;
  displayRange: CommunitiesDashboardQuery;
  onDateChange: (field: "from" | "to", value: string) => void;
  onDateControlsBlur: FocusEventHandler<HTMLDivElement>;
  onPeriodChange: (period: CommunityDashboardPeriodPreset) => void;
  period: CommunityDashboardPeriodValue;
  rangeError: string | null;
};

export const DashboardPeriodControls = ({
  controlIdPrefix,
  displayRange,
  onDateChange,
  onDateControlsBlur,
  onPeriodChange,
  period,
  rangeError,
}: DashboardPeriodControlsProps) => (
  <div className="min-w-0">
    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(150px,1fr)_minmax(136px,0.75fr)_minmax(136px,0.75fr)]">
      <label
        className="grid gap-1 text-xs font-semibold text-muted"
        htmlFor={`${controlIdPrefix}-period`}
      >
        Período
        <span className="relative">
          <select
            className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            id={`${controlIdPrefix}-period`}
            onChange={(event) =>
              onPeriodChange(event.target.value as CommunityDashboardPeriodPreset)
            }
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            {COMMUNITY_DASHBOARD_PERIOD_OPTIONS.map((option) => (
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
      <div className="grid min-w-0 gap-3 sm:col-span-2 sm:grid-cols-2" onBlur={onDateControlsBlur}>
        <label className="text-xs font-semibold text-muted" htmlFor={`${controlIdPrefix}-from`}>
          De
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-control focus:border-primary"
            id={`${controlIdPrefix}-from`}
            max={displayRange.to}
            onChange={(event) => onDateChange("from", event.target.value)}
            type="date"
            value={displayRange.from ?? ""}
          />
        </label>
        <label className="text-xs font-semibold text-muted" htmlFor={`${controlIdPrefix}-to`}>
          Até
          <input
            className="mt-1 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-control focus:border-primary"
            id={`${controlIdPrefix}-to`}
            min={displayRange.from}
            onChange={(event) => onDateChange("to", event.target.value)}
            type="date"
            value={displayRange.to ?? ""}
          />
        </label>
      </div>
    </div>
    {period === "custom" && rangeError ? (
      <p className="mt-2 max-w-xl text-xs font-medium text-danger">{rangeError}</p>
    ) : null}
  </div>
);

export const CommunitiesHeader = () => (
  <section className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Comunidades
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Dashboard de Comunidades
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
          Acompanhe a atividade e o engajamento das comunidades.
        </p>
      </div>
    </div>
  </section>
);
