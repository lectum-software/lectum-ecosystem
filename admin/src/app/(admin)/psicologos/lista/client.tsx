"use client";

import {
  AlertTriangle,
  Award,
  BadgePercent,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  HandHeart,
  type LucideIcon,
  RefreshCw,
  Search,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAdminPsychologistsList } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type {
  AdminPsychologistsList,
  PsychologistsListEngagementId,
  PsychologistsListItem,
  PsychologistsListOption,
  PsychologistsListQuery,
  PsychologistsListSort,
  PsychologistsListTractionCategoryId,
  PsychologistsListTractionEngagementQuadrantId,
} from "@/api/req/psychologists";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: Array<{ id: PsychologistsListSort; label: string }> = [
  { id: "relevance", label: "Mais relevantes" },
  { id: "rating", label: "Melhor avaliação" },
  { id: "favorites", label: "Mais favoritados" },
  { id: "whatsapp", label: "Mais cliques WhatsApp" },
  { id: "recent", label: "Cadastro recente" },
  { id: "name", label: "Nome" },
];

const numberFormatter = new Intl.NumberFormat("pt-BR");
const registrationDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));
const LOADING_ROWS = ["loading-1", "loading-2", "loading-3", "loading-4", "loading-5", "loading-6"];
const FILTER_MODAL_CLOSE_DELAY_MS = 260;
const SEARCH_DEBOUNCE_MS = 350;
const FILTER_KEYS = [
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "engagement",
  "gender",
  "language",
  "modality",
  "more_experienced",
  "plan",
  "profile_status",
  "q",
  "race_color",
  "registry_status",
  "religion",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
  "traction",
  "traction_engagement",
] as const satisfies readonly (keyof PsychologistsListQuery)[];

type FilterQueryKey = (typeof FILTER_KEYS)[number];

const DEPRECATED_FILTER_KEYS = ["experience", "status", "verified"] as const;

type FilterFeatureKey = Extract<
  FilterQueryKey,
  | "accepts_insurance"
  | "available_today"
  | "discount_first_session"
  | "more_experienced"
  | "social_value"
>;

type FilterFeatureOption = {
  description: string;
  icon: LucideIcon;
  label: string;
  name: FilterFeatureKey;
};

const FILTER_FEATURE_OPTIONS: FilterFeatureOption[] = [
  {
    description: "Psicólogos com disponibilidade para atendimento ainda hoje.",
    icon: CalendarCheck,
    label: "Disponível hoje",
    name: "available_today",
  },
  {
    description: "Psicólogos com mais de 10 anos de experiência.",
    icon: Award,
    label: "Mais experientes",
    name: "more_experienced",
  },
  {
    description: "Psicólogos com condição especial para a primeira consulta.",
    icon: BadgePercent,
    label: "Desconto na 1ª sessão",
    name: "discount_first_session",
  },
  {
    description: "Psicólogos que atendem por planos de saúde.",
    icon: Stethoscope,
    label: "Aceita convênios",
    name: "accepts_insurance",
  },
  {
    description: "Para a população de baixa renda.",
    icon: HandHeart,
    label: "Valor social",
    name: "social_value",
  },
];

const MODALITY_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "online", label: "Online" },
  { count: 0, id: "presencial", label: "Presencial" },
];

const PLAN_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "professional", label: "Assinante" },
  { count: 0, id: "courtesy", label: "Cortesia" },
  { count: 0, id: "free", label: "Gratuito" },
];

const PROFILE_STATUS_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "active", label: "Ativo" },
  { count: 0, id: "inactive", label: "Inativo" },
];

const REGISTRY_STATUS_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "active", label: "Ativo" },
  { count: 0, id: "pending", label: "Pendente" },
];

const TRACTION_ENGAGEMENT_FILTER_OPTIONS: PsychologistsListOption[] = [
  {
    count: 0,
    id: "strong_traction_high_engagement",
    label: "Tração forte + alto engajamento",
  },
  {
    count: 0,
    id: "strong_traction_low_engagement",
    label: "Tração forte + baixo engajamento",
  },
  {
    count: 0,
    id: "low_traction_high_engagement",
    label: "Alto engajamento + baixa tração",
  },
  {
    count: 0,
    id: "low_traction_low_engagement",
    label: "Baixa tração + baixo engajamento",
  },
];

const TRACTION_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "strong_traction", label: "Tração Forte" },
  { count: 0, id: "unconverted_traffic", label: "Tráfego Não Convertido" },
  { count: 0, id: "unconverted_interest", label: "Interesse Não Convertido" },
  { count: 0, id: "low_traction", label: "Baixa Tração" },
  { count: 0, id: "insufficient_data", label: "Dados Insuficientes" },
];

const ENGAGEMENT_FILTER_OPTIONS: PsychologistsListOption[] = [
  { count: 0, id: "muito_ativo", label: "Muito engajamento" },
  { count: 0, id: "ativo", label: "Engajado" },
  { count: 0, id: "pouco_ativo", label: "Pouco engajado" },
  { count: 0, id: "sem_base", label: "Sem base" },
];
const PSYCHOLOGIST_ENGAGEMENT_LABEL_BY_ID: Record<PsychologistsListEngagementId, string> = {
  ativo: "Engajado",
  muito_ativo: "Muito engajamento",
  pouco_ativo: "Pouco engajado",
  sem_base: "Sem base",
};
const listTractionCategories = new Set<PsychologistsListTractionCategoryId>(
  TRACTION_FILTER_OPTIONS.map((option) => option.id as PsychologistsListTractionCategoryId),
);
const listEngagementCategories = new Set<PsychologistsListEngagementId>(
  ENGAGEMENT_FILTER_OPTIONS.map((option) => option.id as PsychologistsListEngagementId),
);
const listTractionEngagementQuadrants = new Set<PsychologistsListTractionEngagementQuadrantId>(
  TRACTION_ENGAGEMENT_FILTER_OPTIONS.map(
    (option) => option.id as PsychologistsListTractionEngagementQuadrantId,
  ),
);

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur",
      className,
    )}
  >
    {children}
  </section>
);

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

const parseBoolean = (value: string | null) => (value === "true" ? true : undefined);

const parseTractionCategory = (
  value: string | null,
): PsychologistsListTractionCategoryId | undefined =>
  value && listTractionCategories.has(value as PsychologistsListTractionCategoryId)
    ? (value as PsychologistsListTractionCategoryId)
    : undefined;

const parseEngagementCategory = (
  value: string | null,
): PsychologistsListEngagementId | undefined =>
  value && listEngagementCategories.has(value as PsychologistsListEngagementId)
    ? (value as PsychologistsListEngagementId)
    : undefined;

const parseTractionEngagementQuadrant = (
  value: string | null,
): PsychologistsListTractionEngagementQuadrantId | undefined =>
  value &&
  listTractionEngagementQuadrants.has(value as PsychologistsListTractionEngagementQuadrantId)
    ? (value as PsychologistsListTractionEngagementQuadrantId)
    : undefined;

const parseQuery = (params: URLSearchParams): PsychologistsListQuery => {
  const sort = params.get("sort") as PsychologistsListSort | null;

  return {
    accepts_insurance: parseBoolean(params.get("accepts_insurance")),
    approach: params.get("approach") || undefined,
    available_today: parseBoolean(params.get("available_today")),
    city: params.get("city") || undefined,
    discount_first_session: parseBoolean(params.get("discount_first_session")),
    engagement: parseEngagementCategory(params.get("engagement")),
    gender: params.get("gender") || undefined,
    language: params.get("language") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    modality: params.get("modality") || undefined,
    more_experienced: parseBoolean(params.get("more_experienced")),
    page: parsePositiveNumber(params.get("page"), 1),
    plan: params.get("plan") || undefined,
    profile_status: params.get("profile_status") || undefined,
    q: params.get("q") || undefined,
    race_color: params.get("race_color") || undefined,
    registry_status: params.get("registry_status") || undefined,
    religion: params.get("religion") || undefined,
    service: params.get("service") || undefined,
    social_value: parseBoolean(params.get("social_value")),
    sort: sort && listSorts.has(sort) ? sort : "relevance",
    specialty: params.get("specialty") || undefined,
    state: params.get("state") || undefined,
    target_audience: params.get("target_audience") || undefined,
    traction: parseTractionCategory(params.get("traction")),
    traction_engagement: parseTractionEngagementQuadrant(params.get("traction_engagement")),
  };
};

const toPublicHref = (url: string) => {
  if (/^https?:\/\//.test(url)) return url;

  return `${publicFrontendUrl.replace(/\/$/, "")}${url}`;
};

const canRenderImage = (src: string | null) => {
  if (!src) return false;
  if (src.startsWith("/")) return true;

  try {
    const url = new URL(src);
    const apiHost = new URL(apiUrl).hostname;

    return ["localhost", "127.0.0.1", apiHost].includes(url.hostname);
  } catch {
    return false;
  }
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "PS";

const formatRegistrationDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return registrationDateFormatter.format(date);
};

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
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

const FilterSelectField = ({
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

const FilterFeatureCard = ({
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
          ? "border-primary/45 bg-surface shadow-[0_12px_28px_rgb(48_140_232_/_10%)]"
          : "border-border/70 bg-surface shadow-[0_8px_22px_rgb(15_23_42_/_4%)] hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-[0_14px_32px_rgb(15_23_42_/_7%)]",
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
            "grid h-5 w-5 place-items-center rounded-full bg-surface text-transparent shadow-[0_2px_8px_rgb(15_23_42_/_12%)] transition duration-200 ease-out",
            checked && "translate-x-5 text-primary",
          )}
        >
          <Check aria-hidden className="h-3 w-3" strokeWidth={2.8} />
        </span>
      </span>
    </button>
  );
};

const FilterPanel = ({
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
  const updateTractionFilter = (value: string) => {
    onFilter("traction", value || null);

    if (value) onFilter("traction_engagement", null);
  };
  const updateEngagementFilter = (value: string) => {
    onFilter("engagement", value || null);

    if (value) onFilter("traction_engagement", null);
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
        label="Tração"
        onChange={updateTractionFilter}
        options={TRACTION_FILTER_OPTIONS}
        placeholder="Todas"
        value={query.traction}
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

type ActiveFilterItem = {
  key: FilterQueryKey;
  label: string;
  value?: string;
};

const optionLabel = (options: PsychologistsListOption[] | undefined, value?: string) => {
  if (!value) return undefined;

  return options?.find((option) => option.id === value)?.label ?? value;
};

const buildActiveFilterItems = (query: PsychologistsListQuery, data?: AdminPsychologistsList) => {
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
    { key: "traction", label: "Tração", options: TRACTION_FILTER_OPTIONS },
    { key: "engagement", label: "Engajamento", options: ENGAGEMENT_FILTER_OPTIONS },
    {
      key: "traction_engagement",
      label: "Quadrante",
      options: TRACTION_ENGAGEMENT_FILTER_OPTIONS,
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

const ActiveFiltersSummary = ({
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

const SearchBox = ({ onSearch, value }: { onSearch: (value: string) => void; value?: string }) => {
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

const statusTextClassName = {
  active: "text-success",
  courtesy: "text-muted",
  danger: "text-danger",
  free: "text-muted",
  info: "text-primary",
  inactive: "text-muted",
  pending: "text-warning",
  professional: "text-muted",
  warning: "text-warning",
} as const;

const StatusText = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: keyof typeof statusTextClassName;
}) => (
  <span className={cn("inline text-sm font-medium leading-5", statusTextClassName[tone])}>
    {children}
  </span>
);

const VerifiedBadgeIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-5 w-5 shrink-0", className)}
    fill="none"
    viewBox="0 0 30 28"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>Perfil verificado</title>
    <path
      d="M10.3636 28L7.77273 23.7333L2.86364 22.6667L3.34091 17.7333L0 14L3.34091 10.2667L2.86364 5.33333L7.77273 4.26667L10.3636 0L15 1.93333L19.6364 0L22.2273 4.26667L27.1364 5.33333L26.6591 10.2667L30 14L26.6591 17.7333L27.1364 22.6667L22.2273 23.7333L19.6364 28L15 26.0667L10.3636 28ZM13.5682 18.7333L21.2727 11.2L19.3636 9.26667L13.5682 14.9333L10.6364 12.1333L8.72727 14L13.5682 18.7333Z"
      fill="#308CE8"
    />
  </svg>
);

const resolvePlanLabel = (item: PsychologistsListItem) => {
  const value = `${item.plan_slug ?? ""} ${item.plan_name ?? ""}`.toLowerCase();

  if (item.registry_verification.source === "admin_grant")
    return { label: "Cortesia", tone: "courtesy" as const };
  if (value.includes("cortesia")) return { label: "Cortesia", tone: "courtesy" as const };
  if (value.includes("gratuito") || !item.plan_name)
    return { label: "Gratuito", tone: "free" as const };

  return { label: "Profissional", tone: "professional" as const };
};

const resolveRegistryLabel = (item: PsychologistsListItem) =>
  item.registry_verification.status === "aprovado"
    ? { label: "Ativo", tone: "active" as const }
    : { label: "Pendente", tone: "pending" as const };

const resolveProfileLabel = (item: PsychologistsListItem) =>
  item.published
    ? { label: "Ativo", tone: "active" as const }
    : { label: "Inativo", tone: "inactive" as const };

const resolveTractionLabel = (item: PsychologistsListItem) => {
  if (item.traction.id === "strong_traction")
    return { label: item.traction.label, tone: "active" as const };
  if (item.traction.id === "unconverted_interest")
    return { label: item.traction.label, tone: "info" as const };
  if (item.traction.id === "unconverted_traffic")
    return { label: item.traction.label, tone: "warning" as const };
  if (item.traction.id === "insufficient_data")
    return { label: item.traction.label, tone: "inactive" as const };

  return { label: item.traction.label, tone: "danger" as const };
};

const resolveEngagementLabel = (item: PsychologistsListItem) => {
  const label = PSYCHOLOGIST_ENGAGEMENT_LABEL_BY_ID[item.engagement.id] ?? item.engagement.label;

  if (item.engagement.id === "muito_ativo") return { label, tone: "active" as const };
  if (item.engagement.id === "ativo") return { label, tone: "info" as const };
  if (item.engagement.id === "pouco_ativo") return { label, tone: "warning" as const };

  return { label, tone: "inactive" as const };
};

const RowActions = ({ item }: { item: PsychologistsListItem }) => (
  <div className="flex shrink-0 items-center justify-center gap-1.5">
    <Link
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={item.detail_url}
      onClick={(event) => event.stopPropagation()}
      title="Abrir detalhe administrativo"
    >
      <Eye aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir detalhe administrativo de {item.name}</span>
    </Link>
    <a
      className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={toPublicHref(item.public_profile_url)}
      onClick={(event) => event.stopPropagation()}
      rel="noreferrer"
      target="_blank"
      title="Abrir perfil público"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir perfil público de {item.name}</span>
    </a>
  </div>
);

const PsychologistCard = ({ item }: { item: PsychologistsListItem }) => {
  const plan = resolvePlanLabel(item);
  const profile = resolveProfileLabel(item);
  const registry = resolveRegistryLabel(item);
  const traction = resolveTractionLabel(item);
  const engagement = resolveEngagementLabel(item);

  return (
    <article
      aria-label={`Resumo administrativo de ${item.name}`}
      className="min-w-0 rounded-[1.5rem] border border-border bg-surface p-4"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={item.name} src={item.avatar} />
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">
              {item.ranking_position ? `#${item.ranking_position} - ` : ""}
              {item.name}{" "}
              {item.verified ? (
                <VerifiedBadgeIcon
                  aria-label="Perfil verificado"
                  className="inline h-3.5 w-3.5 align-[-1px]"
                />
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-xs font-medium text-muted" title={item.email}>
              {item.email}
            </p>
          </div>
        </div>
        <RowActions item={item} />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        <StatusText tone={plan.tone}>{plan.label}</StatusText>
        <StatusText tone={profile.tone}>Perfil {profile.label}</StatusText>
        <StatusText tone={registry.tone}>Registro {registry.label}</StatusText>
        <StatusText tone={traction.tone}>Tração {traction.label}</StatusText>
        <StatusText tone={engagement.tone}>Engajamento {engagement.label}</StatusText>
      </div>

      <dl className="mt-4 grid max-w-xs gap-2 text-xs text-muted">
        <div className="rounded-2xl bg-surface-muted px-3 py-2">
          <dt>Data de cadastro</dt>
          <dd className="mt-1 text-sm font-semibold text-foreground">
            {formatRegistrationDate(item.created_at)}
          </dd>
        </div>
      </dl>
    </article>
  );
};

const PsychologistsTable = ({
  items,
  onOpenDetail,
}: {
  items: PsychologistsListItem[];
  onOpenDetail: (href: string) => void;
}) => (
  <>
    <div className="grid min-w-0 gap-3 p-3 lg:hidden">
      {items.map((item) => (
        <PsychologistCard item={item} key={item.id} />
      ))}
    </div>

    <div className="hidden min-w-0 max-w-full overflow-hidden lg:block">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Lista administrativa de psicólogos</caption>
        <colgroup>
          <col className="w-[6%]" />
          <col className="w-[25%]" />
          <col className="w-[12%]" />
          <col className="w-[10%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[13%]" />
          <col className="w-[10%]" />
          <col className="w-[7%]" />
        </colgroup>
        <thead className="border-b border-border bg-surface-muted/70 text-xs text-muted">
          <tr>
            <th className="py-4 pl-3 pr-2 font-semibold">Rank</th>
            <th className="px-2 py-4 font-semibold">Psicólogo</th>
            <th className="px-2 py-4 font-semibold">Data de cadastro</th>
            <th className="px-2 py-4 font-semibold">Plano</th>
            <th className="px-2 py-4 font-semibold">Perfil</th>
            <th className="px-2 py-4 font-semibold">Registro</th>
            <th className="px-2 py-4 font-semibold">Tração</th>
            <th className="px-2 py-4 font-semibold">Engajamento</th>
            <th className="px-2 py-4 text-center font-semibold">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const plan = resolvePlanLabel(item);
            const profile = resolveProfileLabel(item);
            const registry = resolveRegistryLabel(item);
            const traction = resolveTractionLabel(item);
            const engagement = resolveEngagementLabel(item);

            return (
              <tr
                aria-label={`Abrir detalhe administrativo de ${item.name}`}
                className="cursor-pointer transition hover:bg-primary-soft/35 focus:bg-primary-soft/60 focus:outline-none"
                key={item.id}
                onClick={() => onOpenDetail(item.detail_url)}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpenDetail(item.detail_url);
                  }
                }}
                tabIndex={0}
              >
                <td className="whitespace-nowrap py-4 pl-3 pr-2 text-lg font-semibold text-primary">
                  {item.ranking_position ? `#${item.ranking_position}` : "—"}
                </td>
                <td className="px-2 py-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={item.name} src={item.avatar} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {item.name}{" "}
                        {item.verified ? (
                          <VerifiedBadgeIcon
                            aria-label="Perfil verificado"
                            className="inline h-3.5 w-3.5 align-[-1px]"
                          />
                        ) : null}
                      </p>
                      <p className="truncate text-xs font-bold text-muted" title={item.email}>
                        {item.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-2 py-3 font-semibold text-foreground">
                  {formatRegistrationDate(item.created_at)}
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={plan.tone}>{plan.label}</StatusText>
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={profile.tone}>{profile.label}</StatusText>
                </td>
                <td className="whitespace-nowrap px-2 py-3">
                  <StatusText tone={registry.tone}>{registry.label}</StatusText>
                </td>
                <td className="px-2 py-3">
                  <StatusText tone={traction.tone}>{traction.label}</StatusText>
                </td>
                <td className="px-2 py-3">
                  <StatusText tone={engagement.tone}>{engagement.label}</StatusText>
                </td>
                <td className="px-2 py-3 text-center">
                  <RowActions item={item} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </>
);

const LoadingState = () => (
  <div className="space-y-4">
    {LOADING_ROWS.map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar a lista</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </CardShell>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <UsersRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhum psicólogo encontrado</h2>
    <p className="mt-1 text-sm text-muted">
      Ajuste a busca ou limpe os filtros para ver profissionais cadastrados.
    </p>
  </div>
);

const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

const Pagination = ({
  onChangePage,
  onLimit,
  page,
  pages,
  perPage,
}: {
  onChangePage: (page: number) => void;
  onLimit: (limit: number) => void;
  page: number;
  pages: number;
  perPage: number;
}) => {
  const numbers = pageNumbers(page, pages);

  return (
    <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onChangePage(page - 1)}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          <span className="sr-only">Página anterior</span>
        </button>
        {numbers.map((number, index) => (
          <div className="flex items-center gap-2" key={number}>
            {index > 0 && number - numbers[index - 1] > 1 ? (
              <span className="px-1 text-sm font-semibold text-muted">...</span>
            ) : null}
            <button
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "grid h-10 min-w-10 place-items-center rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-foreground",
                number === page && "border-primary bg-primary text-white",
              )}
              onClick={() => onChangePage(number)}
              type="button"
            >
              {number}
            </button>
          </div>
        ))}
        <button
          className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
          disabled={page >= pages}
          onClick={() => onChangePage(page + 1)}
          type="button"
        >
          <ChevronRight aria-hidden className="h-4 w-4" />
          <span className="sr-only">Próxima página</span>
        </button>
      </div>
      <label className="text-xs font-semibold text-muted">
        Itens por página
        <select
          className="ml-2 h-10 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control"
          onChange={(event) => onLimit(Number(event.target.value))}
          value={perPage}
        >
          {[8, 12, 20, 50].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

export const AdminPsychologistsListClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const [draftQuery, setDraftQuery] = useState<PsychologistsListQuery>(query);
  const filterCloseTimerRef = useRef<number | null>(null);
  const filterOpenFrameRef = useRef<number | null>(null);
  const listQuery = useAdminPsychologistsList(query);
  const queryError = listQuery.error ? resolveApiError(listQuery.error) : null;

  const replaceParams = (
    updates: Partial<Record<keyof PsychologistsListQuery, string | boolean | number | null>>,
    options: { resetPage?: boolean } = { resetPage: true },
  ) => {
    const params = new URLSearchParams(searchString);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "" || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    for (const key of DEPRECATED_FILTER_KEYS) params.delete(key);

    if (options.resetPage !== false) params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const getRemoveActiveFilterHref = (key: FilterQueryKey) => {
    const params = new URLSearchParams(searchString);

    params.delete(key);
    if (key === "traction" || key === "engagement") params.delete("traction_engagement");
    for (const deprecatedKey of DEPRECATED_FILTER_KEYS) params.delete(deprecatedKey);
    params.delete("page");

    const next = params.toString();
    return next ? `${pathname}?${next}` : pathname;
  };

  const closeFilters = useCallback(() => {
    if (filterOpenFrameRef.current) {
      window.cancelAnimationFrame(filterOpenFrameRef.current);
      filterOpenFrameRef.current = null;
    }

    setFiltersSheetOpen(false);

    if (filterCloseTimerRef.current) {
      window.clearTimeout(filterCloseTimerRef.current);
    }

    filterCloseTimerRef.current = window.setTimeout(() => {
      setFiltersOpen(false);
      filterCloseTimerRef.current = null;
    }, FILTER_MODAL_CLOSE_DELAY_MS);
  }, []);

  const openFilters = useCallback(() => {
    if (filterCloseTimerRef.current) {
      window.clearTimeout(filterCloseTimerRef.current);
      filterCloseTimerRef.current = null;
    }

    if (filterOpenFrameRef.current) {
      window.cancelAnimationFrame(filterOpenFrameRef.current);
    }

    setDraftQuery(query);
    setFiltersSheetOpen(false);
    setFiltersOpen(true);

    filterOpenFrameRef.current = window.requestAnimationFrame(() => {
      setFiltersSheetOpen(true);
      filterOpenFrameRef.current = null;
    });
  }, [query]);

  const clearFilters = () => {
    const params = new URLSearchParams(searchString);

    for (const key of FILTER_KEYS) params.delete(key);
    for (const key of DEPRECATED_FILTER_KEYS) params.delete(key);
    params.delete("page");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    closeFilters();
  };

  const updateDraftFilter = (key: FilterQueryKey, value: string | boolean | null) => {
    setDraftQuery((current) => ({
      ...current,
      [key]: value === null || value === "" || value === false ? undefined : value,
    }));
  };

  const applyDraftFilters = () => {
    const params = new URLSearchParams(searchString);

    for (const key of FILTER_KEYS) {
      const value = draftQuery[key];

      if (value === null || value === undefined || value === "" || value === false) {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    for (const key of DEPRECATED_FILTER_KEYS) params.delete(key);

    params.delete("page");

    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    closeFilters();
  };

  useEffect(() => {
    if (!filtersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilters();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFilters, filtersOpen]);

  useEffect(
    () => () => {
      if (filterCloseTimerRef.current) window.clearTimeout(filterCloseTimerRef.current);
      if (filterOpenFrameRef.current) window.cancelAnimationFrame(filterOpenFrameRef.current);
    },
    [],
  );

  const summary = listQuery.data;
  const items = summary?.data ?? [];
  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);
  const activeFilterItems = useMemo(() => buildActiveFilterItems(query, summary), [query, summary]);

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Psicólogos
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Lista de Psicólogos
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Acesse todos os profissionais da plataforma.
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 lg:w-full lg:max-w-[560px]">
            <SearchBox
              key={query.q ?? ""}
              onSearch={(value) => replaceParams({ q: value || null })}
              value={query.q}
            />
          </div>
          <button
            className="inline-flex h-12 w-full min-w-0 items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-control transition hover:border-primary hover:text-primary sm:w-auto"
            onClick={openFilters}
            type="button"
          >
            <Filter aria-hidden className="h-4 w-4" />
            Filtros ativos
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium text-primary">
              {activeFilterItems.length}
            </span>
          </button>
        </div>

        <ActiveFiltersSummary filters={activeFilterItems} removeHref={getRemoveActiveFilterHref} />

        <CardShell className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-foreground">
              {summary ? numberFormatter.format(summary.count) : "—"} psicólogos encontrados
            </p>
            <label className="flex w-full min-w-0 items-center justify-between gap-2 text-xs font-medium text-muted sm:w-auto sm:justify-end">
              <span className="shrink-0">Ordenar por</span>
              <span className="relative block min-w-0 flex-1 text-sm font-medium text-foreground sm:w-[220px] sm:flex-none">
                <select
                  className="h-10 w-full min-w-0 appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-9 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  onChange={(event) =>
                    replaceParams({ sort: event.target.value as PsychologistsListSort })
                  }
                  value={query.sort || "relevance"}
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  aria-hidden
                  className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rotate-90 text-foreground"
                />
              </span>
            </label>
          </div>

          <div className="p-4 lg:p-0">
            {listQuery.isLoading ? <LoadingState /> : null}
            {listQuery.isError && queryError ? (
              <div className="p-4">
                <ErrorState message={queryError} onRetry={() => void listQuery.refetch()} />
              </div>
            ) : null}
            {summary && items.length === 0 ? <EmptyState /> : null}
            {summary && items.length > 0 ? (
              <PsychologistsTable items={items} onOpenDetail={(href) => router.push(href)} />
            ) : null}
          </div>

          {summary ? (
            <Pagination
              onChangePage={(nextPage) => replaceParams({ page: nextPage }, { resetPage: false })}
              onLimit={(limit) => replaceParams({ limit, page: 1 }, { resetPage: false })}
              page={page}
              pages={pages}
              perPage={summary.per_page}
            />
          ) : null}
        </CardShell>
      </div>

      {filtersOpen ? (
        <div
          aria-labelledby="admin-psychologists-filters-title"
          aria-modal="true"
          className={cn(
            "fixed inset-0 z-50 flex items-end justify-center bg-overlay p-0 text-foreground backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-6",
            filtersSheetOpen ? "opacity-100" : "opacity-0",
          )}
          role="dialog"
        >
          <button
            aria-label="Fechar filtros"
            className="absolute inset-0"
            onClick={closeFilters}
            type="button"
          />
          <div
            className={cn(
              "relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-border bg-surface text-foreground shadow-admin transition-transform duration-300 ease-out motion-reduce:transition-none sm:h-auto sm:max-h-[min(880px,calc(100dvh-2rem))] sm:max-w-[560px] sm:rounded-[32px] sm:border",
              filtersSheetOpen ? "translate-y-0" : "translate-y-full",
            )}
            role="document"
          >
            <div className="shrink-0 border-b border-border bg-surface/95 px-5 py-2.5 backdrop-blur sm:px-6 sm:py-3">
              <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-start gap-x-3">
                <button
                  aria-label="Fechar filtros"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-background text-muted transition duration-200 ease-out hover:bg-surface-muted hover:text-foreground"
                  onClick={closeFilters}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" strokeWidth={2.25} />
                </button>
                <h2
                  className="self-center text-lg font-bold leading-5 text-foreground"
                  id="admin-psychologists-filters-title"
                >
                  Filtros de busca
                </h2>
                <button
                  className="self-center rounded-full px-2 py-1 text-[13px] font-medium text-primary transition duration-200 ease-out hover:bg-primary-soft"
                  onClick={clearFilters}
                  type="button"
                >
                  Limpar
                </button>

                <p className="col-span-2 col-start-2 mt-1 max-w-[292px] text-[13px] leading-[17px] text-muted sm:max-w-none sm:text-sm sm:leading-5">
                  Ajuste os critérios para encontrar o psicólogo ideal para você
                </p>
              </div>
            </div>

            <form
              className="grid min-h-0 flex-1 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto px-5 py-4 sm:px-6"
              onSubmit={(event) => {
                event.preventDefault();
                applyDraftFilters();
              }}
            >
              <FilterPanel data={summary} onFilter={updateDraftFilter} query={draftQuery} />

              <div className="sticky bottom-0 col-span-2 -mx-5 mt-5 bg-gradient-to-t from-surface via-surface/95 to-surface/0 px-5 pb-2 pt-8 sm:-mx-6 sm:px-6">
                <button
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-white shadow-control transition duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  type="submit"
                >
                  Aplicar filtros
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};
