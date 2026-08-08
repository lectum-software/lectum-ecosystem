"use client";

import {
  Activity,
  Award,
  ChevronDown,
  MessageCircle,
  Search,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import type { AdminPsychologistsDashboard } from "@/api/req/psychologists";
import { CardShell } from "../components/metric-cards";
import {
  buildSupplyDemandRows,
  getSupplyDemandSortValue,
  type SupplyDemandDimensionConfig,
  SupplyDemandHeaderCell,
  SupplyDemandListRow,
} from "../components/supply-demand";
import {
  getPlanSegmentSummary,
  normalizeComparisonLabel,
  PlanSegmentSelect,
} from "../components/timeline-filters";
import {
  formatSelectedPeriod,
  numberFormatter,
  type PlanSegmentFilter,
  SUPPLY_DEMAND_SORT_OPTIONS,
  type SupplyDemandSortKey,
} from "../modules/dashboard-support";

export const StatsContent = ({ summary }: { summary: AdminPsychologistsDashboard }) => {
  const [activeDimensionId, setActiveDimensionId] = useState("specialties");
  const [optionQuery, setOptionQuery] = useState("");
  const [planSegment, setPlanSegment] = useState<PlanSegmentFilter>("all");
  const [sortKey, setSortKey] = useState<SupplyDemandSortKey>("searches");
  const filterSearches = summary.filters_searches.dimensions;
  const planSegmentSummary = getPlanSegmentSummary(summary, planSegment);
  const statistics = planSegmentSummary.statistics;

  const comparisonDimensions: SupplyDemandDimensionConfig[] = [
    {
      demand: filterSearches.specialties,
      icon: Award,
      id: "specialties",
      label: "Especialidades",
      supply: statistics.specialties,
    },
    {
      demand: filterSearches.services,
      icon: ShieldCheck,
      id: "services",
      label: "Serviços",
      supply: statistics.services,
    },
    {
      demand: filterSearches.approaches,
      icon: MessageCircle,
      id: "approaches",
      label: "Abordagens",
      supply: statistics.approaches,
    },
    {
      demand: filterSearches.target_audiences,
      icon: UsersRound,
      id: "target-audience",
      label: "Público atendido",
      supply: statistics.target_audience,
    },
    {
      demand: filterSearches.modalities,
      icon: Activity,
      id: "modalities",
      label: "Modalidades",
      supply: statistics.modalities,
    },
    {
      demand: filterSearches.states,
      icon: Search,
      id: "states",
      label: "Estado",
      supply: statistics.states,
    },
    {
      demand: filterSearches.cities,
      icon: Search,
      id: "cities",
      label: "Cidade",
      supply: statistics.cities,
    },
    {
      demand: filterSearches.genders,
      icon: UserCheck,
      id: "genders",
      label: "Gênero",
      supply: statistics.gender,
    },
    {
      demand: filterSearches.race_colors,
      icon: UsersRound,
      id: "race-colors",
      label: "Raça",
      supply: statistics.race_colors,
    },
    {
      demand: filterSearches.religions,
      icon: ShieldCheck,
      id: "religions",
      label: "Religião",
      supply: statistics.religions,
    },
    {
      demand: filterSearches.features,
      icon: UserCheck,
      id: "features",
      label: "Selos e facilidades",
      supply: statistics.features,
    },
    {
      demand: filterSearches.languages,
      icon: Search,
      id: "languages",
      label: "Idiomas",
      supply: statistics.languages,
    },
  ];
  const selectedDimension =
    comparisonDimensions.find((dimension) => dimension.id === activeDimensionId) ??
    comparisonDimensions[0];
  const rows = buildSupplyDemandRows(selectedDimension);
  const normalizedQuery = normalizeComparisonLabel(optionQuery);
  const visibleRows = rows
    .filter((row) => normalizeComparisonLabel(row.label).includes(normalizedQuery))
    .toSorted((left, right) => {
      const sortDifference =
        getSupplyDemandSortValue(right, sortKey) - getSupplyDemandSortValue(left, sortKey);

      if (sortDifference !== 0) return sortDifference;

      return right.searchesCount - left.searchesCount;
    });
  const SelectedIcon = selectedDimension.icon;
  const periodLabel = formatSelectedPeriod(summary.period);
  const emptyRowsMessage =
    selectedDimension.id === "cities" && optionQuery.trim().length === 0
      ? `Nenhuma cidade com pelo menos ${numberFormatter.format(
          summary.filters_searches.minimum_city_searches,
        )} buscas ou psicólogo cadastrado no período selecionado.`
      : `Nenhuma opção encontrada para “${optionQuery}”.`;
  const handleDimensionChange = (dimensionId: string) => {
    setActiveDimensionId(dimensionId);
    setOptionQuery("");
  };

  return (
    <div className="space-y-4">
      <CardShell className="overflow-hidden">
        <div className="border-b border-border bg-surface-muted p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface text-primary">
                <SelectedIcon aria-hidden className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Comparativo de oferta e demanda
                  </h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{periodLabel}</p>
              </div>
            </div>
            <PlanSegmentSelect
              id="supply-demand-plan-segment"
              onChange={setPlanSegment}
              value={planSegment}
            />
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(180px,0.85fr)_minmax(260px,1.15fr)_minmax(220px,0.85fr)]">
            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-filter-type"
            >
              Tipo de filtro
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-filter-type"
                  onChange={(event) => handleDimensionChange(event.target.value)}
                  value={selectedDimension.id}
                >
                  {comparisonDimensions.map((dimension) => (
                    <option key={dimension.id} value={dimension.id}>
                      {dimension.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-search"
            >
              Buscar opção
              <span className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                />
                <input
                  className="h-11 w-full rounded-control border border-border bg-surface pl-11 pr-4 text-sm font-bold text-foreground shadow-control outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-search"
                  onChange={(event) => setOptionQuery(event.target.value)}
                  placeholder={`Buscar em ${selectedDimension.label.toLowerCase()}`}
                  type="search"
                  value={optionQuery}
                />
              </span>
            </label>

            <label
              className="grid gap-1 text-xs font-semibold text-muted"
              htmlFor="supply-demand-sort"
            >
              Ordenar por
              <span className="relative">
                <select
                  className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-11 text-sm font-semibold text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  id="supply-demand-sort"
                  onChange={(event) => setSortKey(event.target.value as SupplyDemandSortKey)}
                  value={sortKey}
                >
                  {SUPPLY_DEMAND_SORT_OPTIONS.map((option) => (
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
          </div>
        </div>

        <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)_minmax(160px,0.9fr)_190px] gap-4 border-b border-border bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted lg:grid">
          <SupplyDemandHeaderCell label="Opções do filtro" total={rows.length} />
          <SupplyDemandHeaderCell
            align="center"
            label="Buscas"
            total={selectedDimension.demand.total}
          />
          <SupplyDemandHeaderCell
            align="center"
            label="Psicólogos"
            total={selectedDimension.supply.total}
          />
          <span className="text-center">Buscas/psicólogo</span>
          <span className="text-right">Leitura</span>
        </div>

        {visibleRows.length > 0 ? (
          <ul className="max-h-[680px] overflow-y-auto">
            {visibleRows.map((row) => (
              <SupplyDemandListRow key={row.id} row={row} />
            ))}
          </ul>
        ) : (
          <div className="p-6 text-sm font-bold text-muted">{emptyRowsMessage}</div>
        )}
      </CardShell>
    </div>
  );
};
