"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPatientActivities } from "@/api/callers/patients";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPatientActivitiesQuery,
  AdminPatientDetail,
  PatientsDetailActivity,
} from "@/api/req/patients";
import { cn } from "@/lib/utils";
import { numberFormatter } from "../modules/detail-config";

import {
  formatDateTime,
  startOfCurrentMonth,
  startOfCurrentWeek,
  startOfCurrentYear,
  toDateInputValue,
} from "../modules/detail-support";
import { CardShell, ErrorState } from "./common";

export const ActivityList = ({
  detail,
  emptyMessage = "Nenhum evento foi encontrado para este paciente no período selecionado.",
  items = detail.activities.items,
  title = "Atividades recentes",
}: {
  detail: AdminPatientDetail;
  emptyMessage?: string;
  items?: PatientsDetailActivity[];
  title?: string;
}) => {
  const patientName = detail.header.name || "Não informado";

  return (
    <CardShell className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted">Registro dos principais eventos encontrados.</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-surface-muted p-4 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="py-3 pr-3 font-black">Data</th>
                <th className="px-3 py-3 font-black">Ação</th>
                <th className="px-3 py-3 font-black">Descrição</th>
                <th className="px-3 py-3 font-black">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((activity) => (
                <tr key={activity.id}>
                  <td className="py-3 pr-3 font-bold text-muted">
                    {formatDateTime(activity.occurred_at)}
                  </td>
                  <td className="px-3 py-3 font-black text-foreground">{activity.title}</td>
                  <td className="px-3 py-3 text-muted">{activity.description}</td>
                  <td className="px-3 py-3">
                    <span className="block font-black text-foreground">{patientName}</span>
                    <span className="mt-1 block text-xs font-bold text-muted">Paciente</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardShell>
  );
};

export const DetailFilterSelect = ({
  children,
  className,
  label,
  onChange,
  value,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <label className={cn("block text-sm font-black text-muted", className)}>
    {label}
    <span className="relative mt-2 block">
      <select
        className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
      />
    </span>
  </label>
);

export const ActivitiesPagination = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => {
  const safePages = Math.max(1, pages);
  const safePage = Math.min(Math.max(1, page), safePages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-bold text-muted">
        Página {numberFormatter.format(safePage)} de {numberFormatter.format(safePages)}
      </p>
      <div className="flex items-center gap-2">
        <button
          className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
          disabled={safePage <= 1}
          onClick={() => setPage(Math.max(1, safePage - 1))}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Anterior
        </button>
        <button
          className="inline-flex h-10 items-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-foreground transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
          disabled={safePage >= safePages}
          onClick={() => setPage(Math.min(safePages, safePage + 1))}
          type="button"
        >
          Próxima
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export const ActivitiesLoadingState = () => (
  <div className="space-y-5" data-patient-activities-loading="true">
    <CardShell className="h-[8.25rem] animate-pulse bg-surface-muted" />
    <CardShell className="overflow-hidden">
      <div className="border-b border-border p-4">
        <div className="h-6 w-56 rounded-full bg-surface-muted" />
        <div className="mt-2 h-4 w-72 max-w-full rounded-full bg-surface-muted" />
      </div>
      <div className="divide-y divide-border">
        {["one", "two", "three"].map((row) => (
          <div className="grid gap-3 p-4 sm:grid-cols-[10rem_12rem_1fr_12rem]" key={row}>
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
            <div className="h-4 rounded-full bg-surface-muted" />
          </div>
        ))}
      </div>
    </CardShell>
  </div>
);

export const resolveActivityPeriod = (preset: string, customFrom: string, customTo: string) => {
  if (preset === "all") return {};
  if (preset === "custom") {
    return customFrom && customTo ? { from: customFrom, to: customTo } : {};
  }

  const today = toDateInputValue(new Date());

  if (preset === "today") return { from: today, to: today };
  if (preset === "week") return { from: toDateInputValue(startOfCurrentWeek()), to: today };
  if (preset === "month") return { from: toDateInputValue(startOfCurrentMonth()), to: today };
  if (preset === "year") return { from: toDateInputValue(startOfCurrentYear()), to: today };

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : preset === "180d" ? 180 : 90;
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - (days - 1));

  return {
    from: toDateInputValue(from),
    to: today,
  };
};

export const ActivitiesTab = ({ id }: { id: string }) => {
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [area, setArea] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const periodRange = useMemo(
    () => resolveActivityPeriod(period, customFrom, customTo),
    [customFrom, customTo, period],
  );
  const queryInput = useMemo<AdminPatientActivitiesQuery>(
    () => ({
      ...periodRange,
      area,
      limit: 8,
      page,
      q: q.trim() || undefined,
      type,
    }),
    [area, page, periodRange, q, type],
  );
  const query = useAdminPatientActivities(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;

  if (query.isLoading) return <ActivitiesLoadingState />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const activities = query.data;

  return (
    <div className="space-y-5" data-patient-detail-tab="atividades">
      <CardShell className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.25fr)_minmax(160px,1fr)_minmax(160px,1fr)_minmax(150px,.9fr)_minmax(260px,1.35fr)] xl:items-end">
          <label className="block min-w-0 text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
              <input
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm font-bold text-foreground outline-none placeholder:text-muted"
                onChange={(event) => {
                  setQ(event.target.value);
                  setPage(1);
                }}
                placeholder="Buscar por descrição..."
                value={q}
              />
            </span>
          </label>
          <DetailFilterSelect
            className="min-w-0"
            label="Tipo de atividade"
            onChange={(nextValue) => {
              setType(nextValue);
              setPage(1);
            }}
            value={type}
          >
            {activities.filters.types.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            className="min-w-0"
            label="Área"
            onChange={(nextValue) => {
              setArea(nextValue);
              setPage(1);
            }}
            value={area}
          >
            {activities.filters.areas.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({numberFormatter.format(option.count)})
              </option>
            ))}
          </DetailFilterSelect>
          <DetailFilterSelect
            className="min-w-0"
            label="Período"
            onChange={(nextValue) => {
              setPeriod(nextValue);
              setPage(1);
            }}
            value={period}
          >
            {period === "custom" ? (
              <option disabled hidden value="custom">
                Personalizado
              </option>
            ) : null}
            <option value="today">Hoje</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mês</option>
            <option value="year">Este ano</option>
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="180d">Últimos 180 dias</option>
            <option value="all">Todo o período</option>
          </DetailFilterSelect>
          <fieldset className="m-0 min-w-0 border-0 p-0 text-sm font-black text-muted [min-inline-size:0]">
            <legend className="p-0">Data</legend>
            <div className="mt-2 grid gap-2 min-[520px]:grid-cols-2">
              <input
                aria-label="Data inicial"
                className="h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                max={customTo || undefined}
                onChange={(event) => {
                  setPeriod("custom");
                  setCustomFrom(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customFrom}
              />
              <input
                aria-label="Data final"
                className="h-11 w-full min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
                min={customFrom || undefined}
                onChange={(event) => {
                  setPeriod("custom");
                  setCustomTo(event.target.value);
                  setPage(1);
                }}
                type="date"
                value={customTo}
              />
            </div>
          </fieldset>
        </div>
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Atividades da conta</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(activities.data.length)} de{" "}
              {numberFormatter.format(activities.count)} eventos principais filtrados.
            </p>
          </div>
        </div>

        {activities.data.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma atividade encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-40" />
                <col className="w-48" />
                <col />
                <col className="w-52" />
              </colgroup>
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="py-3 pr-3 pl-4 font-black">Data</th>
                  <th className="px-3 py-3 font-black">Ação</th>
                  <th className="px-3 py-3 font-black">Descrição</th>
                  <th className="py-3 pr-4 pl-3 font-black">Usuário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activities.data.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-3 pl-4 font-bold text-muted">
                      {formatDateTime(item.occurred_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{item.type.label}</td>
                    <td className="px-3 py-3 text-muted">{item.description}</td>
                    <td className="py-3 pr-4 pl-3">
                      <span className="block font-black text-foreground">
                        {item.actor?.name || "Não informado"}
                      </span>
                      {item.actor?.role ? (
                        <span className="mt-1 block text-xs font-bold text-muted">
                          {item.actor.role}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-border p-4">
          <ActivitiesPagination page={activities.page} pages={activities.pages} setPage={setPage} />
        </div>
      </CardShell>
    </div>
  );
};
