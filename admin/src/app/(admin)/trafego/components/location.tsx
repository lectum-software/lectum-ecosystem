"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  AdminTrafficSummary,
  TrafficLocationItem,
  TrafficRankingItem,
} from "@/api/req/traffic";
import { BRAZIL_STATE_MAP_PATHS } from "@/lib/brazil-state-map";
import { cn } from "@/lib/utils";
import { adminPrimaryGradient } from "@/lib/visual-tokens";
import { WORLD_COUNTRY_MAP_PATHS } from "@/lib/world-country-map";

import {
  COUNTRY_WORLD_MAP_ID_BY_KEY,
  formatRankingSummary,
  normalizeLocationLookupKey,
  numberFormatter,
  resolveBrazilStateCode,
  TRAFFIC_LOCATION_MAP_SCOPE_LABELS,
  TRAFFIC_LOCATION_RANKING_LIMIT,
  type TrafficLocationMapScope,
} from "../modules/traffic-support";

import { hexToRgba } from "./overview-cards";

export const RankingList = ({
  destinationLabel,
  items,
}: {
  destinationLabel: string;
  items: TrafficRankingItem[];
}) => (
  <div className="mt-4 divide-y divide-border">
    {items.length === 0 ? (
      <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
        Nenhuma visualização com destino identificado no período.
      </p>
    ) : (
      items.map((item, index) => (
        <div className="flex min-w-0 items-start justify-between gap-3 py-3" key={item.id}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold leading-6 text-foreground">
              #{index + 1} {item.label}
            </p>
            <p className="mt-1 text-xs font-bold text-muted">{formatRankingSummary(item)}</p>
          </div>
          {item.path ? (
            <Link
              aria-label={`Ir até ${destinationLabel} no Admin: ${item.label}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-primary shadow-control transition hover:border-primary hover:bg-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
              href={item.path}
              title={`Ir até ${destinationLabel} no Admin`}
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
            </Link>
          ) : (
            <span
              aria-label={`URL indisponível para ${destinationLabel}: ${item.label}`}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface-muted text-muted opacity-60"
              role="img"
              title="URL indisponível"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
            </span>
          )}
        </div>
      ))
    )}
  </div>
);

export const getLocationCountRange = (items: TrafficLocationItem[]) => {
  const counts = items.filter((item) => item.count > 0).map((item) => item.count);

  if (counts.length === 0) return { max: 0, min: 0 };

  return {
    max: Math.max(...counts),
    min: Math.min(...counts),
  };
};

export const getLocationIntensity = (count: number, min: number, max: number) => {
  if (count <= 0) return 0;
  if (max <= min) return 1;

  return (count - min) / (max - min);
};

export const formatLocationAccessCount = (count: number) =>
  `${numberFormatter.format(count)} ${count === 1 ? "acesso" : "acessos"}`;

export const sumLocationCounts = (items: TrafficLocationItem[]) =>
  items.reduce((total, item) => total + item.count, 0);

export const LocationSummaryStats = ({
  locations,
}: {
  locations: Pick<AdminTrafficSummary["locations"], "cities" | "countries" | "states">;
}) => {
  const stats = [
    {
      count: locations.cities.length,
      id: "cities",
      label: "Cidades",
      total: sumLocationCounts(locations.cities),
    },
    {
      count: locations.states.length,
      id: "states",
      label: "Estados",
      total: sumLocationCounts(locations.states),
    },
    {
      count: locations.countries.length,
      id: "countries",
      label: "Países",
      total: sumLocationCounts(locations.countries),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {stats.map((item) => (
        <div className="rounded-[1.25rem] bg-surface-muted p-4" key={item.id}>
          <p className="text-xs font-black uppercase tracking-[0.08em] text-muted">{item.label}</p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {numberFormatter.format(item.count)}
          </p>
          <p className="mt-1 text-xs font-bold text-muted">
            {formatLocationAccessCount(item.total)}
          </p>
        </div>
      ))}
    </div>
  );
};

export const LocationMapLegend = ({ items }: { items: TrafficLocationItem[] }) => {
  const { max, min } = getLocationCountRange(items);

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 text-[0.68rem] font-bold text-muted">
      <span className="whitespace-nowrap">{numberFormatter.format(min)}</span>
      <span
        aria-hidden
        className="h-2 min-w-24 flex-1 rounded-full"
        style={{
          background: adminPrimaryGradient,
        }}
      />
      <span className="whitespace-nowrap">{numberFormatter.format(max)}</span>
    </div>
  );
};

export const LocationBarRanking = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: TrafficLocationItem[];
  title: string;
}) => {
  const topItems = items.slice(0, TRAFFIC_LOCATION_RANKING_LIMIT);
  const maxCount = Math.max(1, ...topItems.map((item) => item.count));

  return (
    <div className="min-w-0">
      <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
      <div className="mt-5 space-y-4">
        {topItems.length === 0 ? (
          <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold leading-5 text-muted">
            {emptyMessage}
          </p>
        ) : (
          topItems.map((item) => (
            <div className="min-w-0" key={item.id}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                  <span className="min-w-0 truncate">{item.label}</span>
                  <ChevronRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary" />
                </span>
                <span className="shrink-0 font-black text-foreground">
                  {numberFormatter.format(item.count)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border/70">
                <div
                  aria-hidden
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.max(8, (item.count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const LocationRankingList = ({
  emptyMessage,
  items,
  title,
}: {
  emptyMessage: string;
  items: TrafficLocationItem[];
  title: string;
}) => (
  <div className="rounded-[1.35rem] border border-border/70 bg-surface p-4">
    <h4 className="text-xs font-black uppercase tracking-[0.08em] text-muted">{title}</h4>
    <div className="mt-3 space-y-3">
      {items.length === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-3 text-xs font-bold text-muted">
          {emptyMessage}
        </p>
      ) : (
        items.slice(0, TRAFFIC_LOCATION_RANKING_LIMIT).map((item, index) => (
          <div key={item.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[0.68rem] font-black text-primary">
                  {index + 1}
                </span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="whitespace-nowrap text-xs font-black text-foreground">
                {formatLocationAccessCount(item.count)}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                aria-hidden
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

export const BrazilStateChoroplethMap = ({ states }: { states: TrafficLocationItem[] }) => {
  const statesByCode = new Map<string, TrafficLocationItem>();

  for (const state of states) {
    const code = resolveBrazilStateCode(state);
    if (code) statesByCode.set(code, state);
  }

  const { max, min } = getLocationCountRange([...statesByCode.values()]);
  const highlightedStates = [...statesByCode.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, TRAFFIC_LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedStates
    ? `Mapa do Brasil por UF com destaque para ${highlightedStates}.`
    : "Mapa do Brasil sem estados brasileiros identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[20rem] w-full max-w-[22rem]"
        role="img"
        viewBox="0 0 360 380"
      >
        {BRAZIL_STATE_MAP_PATHS.map((statePath) => {
          const item = statesByCode.get(statePath.code);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("var(--admin-primary)", 0.28 + intensity * 0.62)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("var(--admin-primary)", 0.74) : "var(--admin-border)";

          return (
            <path
              d={statePath.d}
              fill={fill}
              key={statePath.code}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "1.2" : "0.9"}
            >
              <title>
                {item
                  ? `${statePath.name}: ${formatLocationAccessCount(item.count)}`
                  : `${statePath.name}: sem acesso`}
              </title>
            </path>
          );
        })}
      </svg>
      {statesByCode.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Sem estados brasileiros identificados. Locais fora do Brasil continuam nos rankings.
        </figcaption>
      ) : null}
    </figure>
  );
};

export const resolveWorldCountryMapPath = (item: TrafficLocationItem) => {
  const idParts = item.id.split(":");
  const candidates = [item.id, idParts[idParts.length - 1], item.label];

  for (const candidate of candidates) {
    const normalized = normalizeLocationLookupKey(candidate);
    const mappedId = COUNTRY_WORLD_MAP_ID_BY_KEY[normalized];
    const mappedCountry = mappedId
      ? WORLD_COUNTRY_MAP_PATHS.find((country) => country.id === mappedId)
      : null;
    if (mappedCountry) return mappedCountry;

    const countryByName = WORLD_COUNTRY_MAP_PATHS.find(
      (country) => normalizeLocationLookupKey(country.name) === normalized,
    );
    if (countryByName) return countryByName;
  }

  return null;
};

export const WorldCountryMap = ({ countries }: { countries: TrafficLocationItem[] }) => {
  const { max, min } = getLocationCountRange(countries);
  const countriesByMapId = new Map<string, TrafficLocationItem>();

  for (const item of countries) {
    const countryPath = resolveWorldCountryMapPath(item);
    if (countryPath) countriesByMapId.set(countryPath.id, item);
  }

  const highlightedCountries = countries
    .slice(0, TRAFFIC_LOCATION_RANKING_LIMIT)
    .map((item) => item.label)
    .join(", ");
  const ariaLabel = highlightedCountries
    ? `Mapa-múndi com destaque para ${highlightedCountries}.`
    : "Mapa-múndi sem países identificados no período.";

  return (
    <figure className="min-w-0">
      <svg
        aria-label={ariaLabel}
        className="mx-auto h-auto max-h-[18rem] w-full max-w-[30rem]"
        role="img"
        viewBox="0 0 520 270"
      >
        {WORLD_COUNTRY_MAP_PATHS.map((country) => {
          const item = countriesByMapId.get(country.id);
          const intensity = item ? getLocationIntensity(item.count, min, max) : 0;
          const fill = item
            ? hexToRgba("var(--admin-primary)", 0.32 + intensity * 0.6)
            : "var(--admin-surface-muted)";
          const stroke = item ? hexToRgba("var(--admin-primary)", 0.78) : "var(--admin-border)";

          return (
            <path
              d={country.d}
              fill={fill}
              key={country.id}
              stroke={stroke}
              strokeLinejoin="round"
              strokeWidth={item ? "0.85" : "0.45"}
            >
              <title>
                {item
                  ? `${country.name}: ${formatLocationAccessCount(item.count)}`
                  : `${country.name}: sem acesso`}
              </title>
            </path>
          );
        })}
      </svg>
      {countries.length > 0 && countriesByMapId.size === 0 ? (
        <figcaption className="mt-2 text-center text-xs font-bold leading-5 text-muted">
          Países não encontrados na malha continuam no ranking agregado.
        </figcaption>
      ) : null}
    </figure>
  );
};

export const LocationMapScopeToggle = ({
  hasCountries,
  hasStates,
  onScopeChange,
  scope,
}: {
  hasCountries: boolean;
  hasStates: boolean;
  onScopeChange: (scope: TrafficLocationMapScope) => void;
  scope: TrafficLocationMapScope;
}) => {
  const options: TrafficLocationMapScope[] = ["states", "countries"];

  return (
    <fieldset
      aria-label="Alternar mapa de localização"
      className="grid grid-cols-2 rounded-full bg-surface-muted p-1 text-xs font-black"
    >
      {options.map((option) => {
        const disabled = option === "states" ? !hasStates : !hasCountries;

        return (
          <button
            aria-pressed={scope === option}
            className={cn(
              "rounded-full px-3 py-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-45",
              scope === option
                ? "bg-surface text-primary shadow-control"
                : "text-muted hover:text-foreground",
            )}
            disabled={disabled}
            key={option}
            onClick={() => onScopeChange(option)}
            type="button"
          >
            {TRAFFIC_LOCATION_MAP_SCOPE_LABELS[option]}
          </button>
        );
      })}
    </fieldset>
  );
};

export const LocationMapPanel = ({
  countries,
  onScopeChange,
  scope,
  states,
}: {
  countries: TrafficLocationItem[];
  onScopeChange: (scope: TrafficLocationMapScope) => void;
  scope: TrafficLocationMapScope;
  states: TrafficLocationItem[];
}) => {
  const activeItems = scope === "states" ? states : countries;
  const title = scope === "states" ? "Acessos por Estado" : "Acessos por País";
  const rankingTitle = scope === "states" ? "Estados" : "Países";
  const emptyMessage =
    scope === "states" ? "Nenhum estado identificado." : "Nenhum país identificado.";

  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-border/70 bg-surface">
      <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-base font-black text-foreground">{title}</h4>
        <LocationMapScopeToggle
          hasCountries={countries.length > 0}
          hasStates={states.length > 0}
          onScopeChange={onScopeChange}
          scope={scope}
        />
      </div>
      <div className="grid gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(12rem,0.9fr)] lg:items-center">
        <div className="min-h-[16rem] min-w-0">
          {scope === "states" ? (
            <BrazilStateChoroplethMap states={states} />
          ) : (
            <WorldCountryMap countries={countries} />
          )}
        </div>
        <LocationBarRanking emptyMessage={emptyMessage} items={activeItems} title={rankingTitle} />
      </div>
      <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <LocationMapLegend items={activeItems} />
        <span className="text-[0.68rem] font-bold text-subtle">intensidade por acessos</span>
      </div>
    </div>
  );
};

export const LocationOverview = ({
  locations,
}: {
  locations: Pick<AdminTrafficSummary["locations"], "cities" | "countries" | "states" | "total">;
}) => {
  const [preferredScope, setPreferredScope] = useState<TrafficLocationMapScope>("states");
  const hasCountries = locations.countries.length > 0;
  const hasStates = locations.states.length > 0;
  const scope =
    preferredScope === "states" && !hasStates && hasCountries ? "countries" : preferredScope;
  const secondaryItems = scope === "states" ? locations.countries : locations.states;
  const secondaryTitle = scope === "states" ? "Países" : "Top estados";
  const secondaryEmptyMessage =
    scope === "states" ? "Nenhum país identificado." : "Nenhum estado identificado.";

  return (
    <div className="mt-5 space-y-4">
      <LocationSummaryStats locations={locations} />
      {locations.total === 0 ? (
        <p className="rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
          Nenhum acesso com localização identificada foi encontrado no período selecionado.
        </p>
      ) : (
        <>
          <LocationMapPanel
            countries={locations.countries}
            onScopeChange={setPreferredScope}
            scope={scope}
            states={locations.states}
          />
          <div className="grid gap-3 2xl:grid-cols-2">
            <LocationRankingList
              emptyMessage="Nenhuma cidade identificada."
              items={locations.cities}
              title="Top cidades"
            />
            <LocationRankingList
              emptyMessage={secondaryEmptyMessage}
              items={secondaryItems}
              title={secondaryTitle}
            />
          </div>
          <p className="text-xs font-bold leading-5 text-muted">
            Total considerado: {formatLocationAccessCount(locations.total)} com localização
            aproximada. Cidades com frequência muito baixa podem aparecer agrupadas para reduzir
            exposição.
          </p>
        </>
      )}
    </div>
  );
};
