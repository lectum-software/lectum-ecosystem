"use client";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminCommunityActivities } from "@/api/callers/communities";
import type {
  AdminCommunityActivitiesQuery,
  AdminCommunityActivityItem,
} from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { PaginationControls, QueryStatus } from "../components/content-controls";

import { CommunityReportFilterSelect } from "../components/report-cards";
import {
  type ActivityPeriodValue,
  cardClass,
  formatActivityDateTime,
  numberFormatter,
  resolveCommunityActivityPeriod,
} from "../modules/detail-support";

export const communityActivityAreaLabels: Record<string, string> = {
  comunidade: "Comunidade",
  conteudo: "Conteúdo",
  dados: "Dados",
  denuncias: "Denúncias",
  identidade_visual: "Identidade visual",
  moderacao: "Moderação",
  regras: "Regras",
};

export const normalizeCommunityActivityKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const formatCommunityActivityAreaLabel = (area: string) =>
  communityActivityAreaLabels[normalizeCommunityActivityKey(area)] || area;

export const ActivitiesTab = ({ slug }: { slug: string }) => {
  const [period, setPeriod] = useState<ActivityPeriodValue>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [area, setArea] = useState("all");
  const [type, setType] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const periodRange = useMemo(
    () => resolveCommunityActivityPeriod(period, customFrom, customTo),
    [customFrom, customTo, period],
  );
  const queryInput = useMemo<AdminCommunityActivitiesQuery>(
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
  const result = useAdminCommunityActivities(slug, queryInput);
  const activities = result.data;
  const activityItems = activities?.data ?? [];
  const areaOptions = activities?.filters.areas ?? [
    { count: 0, id: "all", label: "Todas as áreas" },
  ];
  const typeOptions = activities?.filters.types ?? [
    { count: 0, id: "all", label: "Todos os tipos" },
  ];

  return (
    <div className="space-y-5" data-community-detail-tab="atividades">
      <section className={cn(cardClass, "p-4")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <CommunityReportFilterSelect
            className="flex-1"
            label="Período"
            onChange={(nextValue) => {
              setPeriod(nextValue as ActivityPeriodValue);
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
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            className="flex-1"
            label="Área"
            onChange={(nextValue) => {
              setArea(nextValue);
              setPage(1);
            }}
            value={area}
          >
            {areaOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {`${formatCommunityActivityAreaLabel(option.label)} (${numberFormatter.format(option.count)})`}
              </option>
            ))}
          </CommunityReportFilterSelect>
          <CommunityReportFilterSelect
            className="flex-1"
            label="Tipo de atividade"
            onChange={(nextValue) => {
              setType(nextValue);
              setPage(1);
            }}
            value={type}
          >
            {typeOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {`${option.label} (${numberFormatter.format(option.count)})`}
              </option>
            ))}
          </CommunityReportFilterSelect>
          <label className="block flex-1 text-sm font-black text-muted">
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
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-black text-muted">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              max={customTo || undefined}
              onChange={(event) => {
                setPeriod("custom");
                setCustomFrom(event.target.value);
                setPage(1);
              }}
              type="date"
              value={customFrom}
            />
          </label>
          <label className="block text-sm font-black text-muted">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              min={customFrom || undefined}
              onChange={(event) => {
                setPeriod("custom");
                setCustomTo(event.target.value);
                setPage(1);
              }}
              type="date"
              value={customTo}
            />
          </label>
        </div>
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-black text-foreground">Atividades administrativas</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(activityItems.length)} de{" "}
              {numberFormatter.format(activities?.count ?? 0)} eventos principais filtrados.
            </p>
          </div>
        </div>

        {result.isLoading || result.error ? (
          <div className="p-4">
            <QueryStatus
              error={result.error}
              loading={result.isLoading}
              onRetry={() => void result.refetch()}
            />
          </div>
        ) : null}

        {activities && activityItems.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma atividade administrativa registrada para os filtros atuais.
          </p>
        ) : null}

        {activityItems.length > 0 ? (
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
                {activityItems.map((activity: AdminCommunityActivityItem) => (
                  <tr key={activity.id}>
                    <td className="py-3 pr-3 pl-4 font-bold text-muted">
                      {formatActivityDateTime(activity.created_at)}
                    </td>
                    <td className="px-3 py-3 font-black text-foreground">{activity.summary}</td>
                    <td className="px-3 py-3 text-muted">
                      {activity.reason || "Sem descrição registrada."}
                    </td>
                    <td className="py-3 pr-4 pl-3">
                      <span className="block font-black text-foreground">
                        {activity.actor || "Não informado"}
                      </span>
                      <span className="mt-1 block text-xs font-bold text-muted">Admin</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {activities ? (
          <div className="border-t border-border p-4">
            <PaginationControls page={activities.page} pages={activities.pages} setPage={setPage} />
          </div>
        ) : null}
      </section>
    </div>
  );
};
