"use client";

import { Check, ChevronRight, Search, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type {
  AdminPsychologistsList,
  PsychologistsListOption,
  PsychologistsListQuery,
} from "@/api/req/psychologists";
import { canRenderImage } from "@/lib/admin-media";
import { cn } from "@/lib/utils";

import {
  ENGAGEMENT_FILTER_OPTIONS,
  FILTER_FEATURE_OPTIONS,
  type FilterFeatureKey,
  type FilterFeatureOption,
  type FilterQueryKey,
  initials,
  MODALITY_FILTER_OPTIONS,
  PLAN_FILTER_OPTIONS,
  PROFILE_CONVERSION_ENGAGEMENT_FILTER_OPTIONS,
  PROFILE_CONVERSION_FILTER_OPTIONS,
  PROFILE_STATUS_FILTER_OPTIONS,
  REGISTRY_STATUS_FILTER_OPTIONS,
  SEARCH_DEBOUNCE_MS,
} from "../modules/list-support";

export const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  if (!canRenderImage(src)) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">
        {initials(name)}
      </span>
    );
  }

  return (
    <Image
      alt={`Foto de ${name}`}
      className="h-12 w-12 shrink-0 rounded-full object-cover"
      height={48}
      src={src ?? ""}
      width={48}
    />
  );
};

export const FilterSelectField = ({
  className,
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  options: PsychologistsListOption[];
  placeholder: string;
  value?: string;
}) => (
  <label className={cn("grid min-w-0 gap-2 text-sm font-semibold text-foreground", className)}>
    <span>{label}</span>
    <span className="relative block">
      <select
        className="h-12 w-full appearance-none rounded-2xl border border-border/80 bg-surface-muted px-4 pr-11 text-sm font-bold text-foreground shadow-none outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
        onChange={(event) => onChange(event.target.value)}
        value={value || ""}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-muted"
      />
    </span>
    <span className="block min-h-4 text-xs font-medium leading-4 text-danger" />
  </label>
);

export const FilterFeatureCard = ({
  checked,
  onToggle,
  option,
}: {
  checked: boolean;
  onToggle: (name: FilterFeatureKey) => void;
  option: FilterFeatureOption;
}) => {
  const Icon = option.icon;

  return (
    <button
      aria-pressed={checked}
      className={cn(
        "group flex w-full items-start gap-3 rounded-[22px] border p-3.5 text-left transition duration-200 ease-out sm:p-4",
        checked
          ? "border-primary/45 bg-surface shadow-admin-soft"
          : "border-border/70 bg-surface shadow-control hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-admin-soft",
      )}
      onClick={() => onToggle(option.name)}
      type="button"
    >
      <span
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-2xl transition duration-200 ease-out",
          checked
            ? "bg-primary-soft text-primary ring-1 ring-primary/20"
            : "bg-primary-soft/70 text-primary",
        )}
      >
        <Icon aria-hidden className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold leading-5 text-foreground">{option.label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
      </span>
      <span
        className={cn(
          "mt-1 flex h-6 w-11 shrink-0 items-center rounded-full border p-0.5 transition duration-200 ease-out",
          checked
            ? "border-primary/45 bg-primary"
            : "border-border bg-surface-muted group-hover:border-primary/25",
        )}
      >
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full bg-surface text-transparent shadow-control transition duration-200 ease-out",
            checked && "translate-x-5 text-primary",
          )}
        >
          <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
        </span>
      </span>
    </button>
  );
};

export const FilterPanel = ({
  data,
  onFilter,
  query,
}: {
  data?: AdminPsychologistsList;
  onFilter: (key: FilterQueryKey, value: string | boolean | null) => void;
  query: PsychologistsListQuery;
}) => {
  const filters = data?.filters;
  const empty: PsychologistsListOption[] = [];
  const toggleFilterFeature = (name: FilterFeatureKey) => {
    onFilter(name, query[name] === true ? null : true);
  };
  const updateProfileConversionFilter = (value: string) => {
    onFilter("profile_conversion", value || null);

    if (value) onFilter("profile_conversion_engagement", null);
  };
  const updateEngagementFilter = (value: string) => {
    onFilter("engagement", value || null);

    if (value) onFilter("profile_conversion_engagement", null);
  };
  return (
    <>
      <FilterSelectField
        className="col-span-2"
        label="Plano"
        onChange={(value) => onFilter("plan", value || null)}
        options={PLAN_FILTER_OPTIONS}
        placeholder="Todos os planos"
        value={query.plan}
      />
      <FilterSelectField
        className="col-span-2"
        label="Status perfil"
        onChange={(value) => onFilter("profile_status", value || null)}
        options={PROFILE_STATUS_FILTER_OPTIONS}
        placeholder="Todos"
        value={query.profile_status}
      />
      <FilterSelectField
        className="col-span-2"
        label="Status registro"
        onChange={(value) => onFilter("registry_status", value || null)}
        options={REGISTRY_STATUS_FILTER_OPTIONS}
        placeholder="Todos"
        value={query.registry_status}
      />
      <FilterSelectField
        className="col-span-2"
        label="Conversão"
        onChange={updateProfileConversionFilter}
        options={PROFILE_CONVERSION_FILTER_OPTIONS}
        placeholder="Todas"
        value={query.profile_conversion}
      />
      <FilterSelectField
        className="col-span-2"
        label="Engajamento"
        onChange={updateEngagementFilter}
        options={ENGAGEMENT_FILTER_OPTIONS}
        placeholder="Todos"
        value={query.engagement}
      />
      <FilterSelectField
        className="col-span-2"
        label="Especialidade"
        onChange={(value) => onFilter("specialty", value || null)}
        options={filters?.specialties ?? empty}
        placeholder="Todas"
        value={query.specialty}
      />
      <FilterSelectField
        className="col-span-2"
        label="Serviços"
        onChange={(value) => onFilter("service", value || null)}
        options={filters?.services ?? empty}
        placeholder="Todos os serviços"
        value={query.service}
      />
      <FilterSelectField
        className="col-span-2"
        label="Modalidades de atendimento"
        onChange={(value) => onFilter("modality", value || null)}
        options={MODALITY_FILTER_OPTIONS}
        placeholder="Todas as modalidades"
        value={query.modality}
      />
      <FilterSelectField
        className="col-span-2"
        label="Abordagens"
        onChange={(value) => onFilter("approach", value || null)}
        options={filters?.approaches ?? empty}
        placeholder="Todas as abordagens"
        value={query.approach}
      />
      <FilterSelectField
        className="col-span-2"
        label="Público atendido"
        onChange={(value) => onFilter("target_audience", value || null)}
        options={filters?.target_audience ?? empty}
        placeholder="Todos os públicos"
        value={query.target_audience}
      />
      <FilterSelectField
        className="col-span-1"
        label="Estado"
        onChange={(value) => onFilter("state", value || null)}
        options={filters?.states ?? empty}
        placeholder="Todos"
        value={query.state}
      />
      <FilterSelectField
        className="col-span-1"
        label="Cidade"
        onChange={(value) => onFilter("city", value || null)}
        options={filters?.cities ?? empty}
        placeholder="Todas as cidades"
        value={query.city}
      />
      <FilterSelectField
        className="col-span-2"
        label="Gênero do psicólogo"
        onChange={(value) => onFilter("gender", value || null)}
        options={filters?.genders ?? empty}
        placeholder="Todos os gêneros"
        value={query.gender}
      />
      <FilterSelectField
        className="col-span-2"
        label="Raça do psicólogo"
        onChange={(value) => onFilter("race_color", value || null)}
        options={filters?.race_colors ?? empty}
        placeholder="Todas as raças/cores"
        value={query.race_color}
      />
      <FilterSelectField
        className="col-span-2"
        label="Religião do psicólogo"
        onChange={(value) => onFilter("religion", value || null)}
        options={filters?.religions ?? empty}
        placeholder="Todas as religiões"
        value={query.religion}
      />
      <FilterSelectField
        className="col-span-2"
        label="Idiomas de atendimento"
        onChange={(value) => onFilter("language", value || null)}
        options={filters?.languages ?? empty}
        placeholder="Todos os idiomas"
        value={query.language}
      />

      <section className="col-span-2 mt-2 grid gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Selos e facilidades</h3>
          <p className="mt-1 text-xs leading-5 text-muted">
            Refine por confiança, acessibilidade e condições de atendimento.
          </p>
        </div>

        <div className="grid gap-3">
          {FILTER_FEATURE_OPTIONS.map((option) => (
            <FilterFeatureCard
              checked={query[option.name] === true}
              key={option.name}
              onToggle={toggleFilterFeature}
              option={option}
            />
          ))}
        </div>
      </section>
    </>
  );
};

export type ActiveFilterItem = {
  key: FilterQueryKey;
  label: string;
  value?: string;
};

export const optionLabel = (options: PsychologistsListOption[] | undefined, value?: string) => {
  if (!value) return undefined;

  return options?.find((option) => option.id === value)?.label ?? value;
};

export const buildActiveFilterItems = (
  query: PsychologistsListQuery,
  data?: AdminPsychologistsList,
) => {
  const active: ActiveFilterItem[] = [];
  const filters = data?.filters;

  if (query.q?.trim()) active.push({ key: "q", label: "Busca", value: query.q.trim() });

  const optionFilters: Array<{
    key: FilterQueryKey;
    label: string;
    options: PsychologistsListOption[] | undefined;
  }> = [
    { key: "plan", label: "Plano", options: PLAN_FILTER_OPTIONS },
    { key: "profile_status", label: "Status perfil", options: PROFILE_STATUS_FILTER_OPTIONS },
    { key: "registry_status", label: "Status registro", options: REGISTRY_STATUS_FILTER_OPTIONS },
    { key: "profile_conversion", label: "Conversão", options: PROFILE_CONVERSION_FILTER_OPTIONS },
    { key: "engagement", label: "Engajamento", options: ENGAGEMENT_FILTER_OPTIONS },
    {
      key: "profile_conversion_engagement",
      label: "Quadrante",
      options: PROFILE_CONVERSION_ENGAGEMENT_FILTER_OPTIONS,
    },
    { key: "specialty", label: "Especialidade", options: filters?.specialties },
    { key: "service", label: "Serviço", options: filters?.services },
    { key: "modality", label: "Modalidade", options: MODALITY_FILTER_OPTIONS },
    { key: "approach", label: "Abordagem", options: filters?.approaches },
    { key: "target_audience", label: "Público", options: filters?.target_audience },
    { key: "state", label: "Estado", options: filters?.states },
    { key: "city", label: "Cidade", options: filters?.cities },
    { key: "gender", label: "Gênero", options: filters?.genders },
    { key: "race_color", label: "Raça/cor", options: filters?.race_colors },
    { key: "religion", label: "Religião", options: filters?.religions },
    { key: "language", label: "Idioma", options: filters?.languages },
  ];

  for (const filter of optionFilters) {
    const value = query[filter.key];
    if (typeof value !== "string" || !value) continue;

    active.push({
      key: filter.key,
      label: filter.label,
      value: optionLabel(filter.options, value),
    });
  }

  for (const option of FILTER_FEATURE_OPTIONS) {
    if (query[option.name] === true) active.push({ key: option.name, label: option.label });
  }

  return active;
};

export const ActiveFiltersSummary = ({
  filters,
  removeHref,
}: {
  filters: ActiveFilterItem[];
  removeHref: (key: FilterQueryKey) => string;
}) => {
  if (filters.length === 0) return null;

  return (
    <ul aria-label="Filtros aplicados na tabela" className="flex min-w-0 flex-wrap gap-2">
      {filters.map((filter) => {
        const readableFilter = filter.value ? `${filter.label}: ${filter.value}` : filter.label;

        return (
          <li
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-primary/15 bg-primary-soft/70 px-3 text-xs font-medium leading-5 text-muted"
            key={`${filter.key}-${filter.value ?? "ativo"}`}
          >
            <span className="font-semibold text-foreground">{filter.label}</span>
            {filter.value ? <span>: {filter.value}</span> : null}
            <a
              aria-label={`Remover filtro ${readableFilter}`}
              className="-mr-1 grid h-5 w-5 place-items-center rounded-full text-primary transition hover:bg-primary/10 hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              href={removeHref(filter.key)}
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </a>
          </li>
        );
      })}
    </ul>
  );
};

export const SearchBox = ({
  onSearch,
  value,
}: {
  onSearch: (value: string) => void;
  value?: string;
}) => {
  const [draft, setDraft] = useState(value || "");
  const onSearchRef = useRef(onSearch);

  useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const normalized = draft.trim();
    const current = value || "";

    if (normalized === current) return;

    const timer = window.setTimeout(() => {
      onSearchRef.current(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, value]);

  return (
    <label className="relative block h-12 w-full min-w-0 text-sm font-medium text-foreground">
      <span className="sr-only">Buscar por nome, e-mail ou CRP</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome, e-mail ou CRP..."
        type="search"
        value={draft}
      />
    </label>
  );
};
