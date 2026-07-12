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
  Heart,
  type LucideIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Stethoscope,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
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
  PsychologistsListItem,
  PsychologistsListOption,
  PsychologistsListQuery,
  PsychologistsListSort,
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
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));
const LOADING_ROWS = ["loading-1", "loading-2", "loading-3", "loading-4", "loading-5", "loading-6"];
const FILTER_MODAL_CLOSE_DELAY_MS = 260;
const FILTER_KEYS = [
  "accepts_insurance",
  "approach",
  "available_today",
  "city",
  "discount_first_session",
  "gender",
  "language",
  "modality",
  "more_experienced",
  "q",
  "race_color",
  "religion",
  "service",
  "social_value",
  "specialty",
  "state",
  "target_audience",
  "verified",
] as const satisfies readonly (keyof PsychologistsListQuery)[];

type FilterQueryKey = (typeof FILTER_KEYS)[number];

const DEPRECATED_FILTER_KEYS = ["experience", "plan", "status"] as const;

type FilterFeatureKey = Extract<
  FilterQueryKey,
  | "accepts_insurance"
  | "available_today"
  | "discount_first_session"
  | "more_experienced"
  | "social_value"
  | "verified"
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
    description: "Psicólogos com registro verificado junto ao Conselho Federal de Psicologia.",
    icon: ShieldCheck,
    label: "Somente verificados",
    name: "verified",
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

const CardShell = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section
    className={cn(
      "min-w-0 max-w-full rounded-card border border-border bg-surface shadow-admin-soft",
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

const parseQuery = (params: URLSearchParams): PsychologistsListQuery => {
  const sort = params.get("sort") as PsychologistsListSort | null;

  return {
    accepts_insurance: parseBoolean(params.get("accepts_insurance")),
    approach: params.get("approach") || undefined,
    available_today: parseBoolean(params.get("available_today")),
    city: params.get("city") || undefined,
    discount_first_session: parseBoolean(params.get("discount_first_session")),
    gender: params.get("gender") || undefined,
    language: params.get("language") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    modality: params.get("modality") || undefined,
    more_experienced: parseBoolean(params.get("more_experienced")),
    page: parsePositiveNumber(params.get("page"), 1),
    q: params.get("q") || undefined,
    race_color: params.get("race_color") || undefined,
    religion: params.get("religion") || undefined,
    service: params.get("service") || undefined,
    social_value: parseBoolean(params.get("social_value")),
    sort: sort && listSorts.has(sort) ? sort : "relevance",
    specialty: params.get("specialty") || undefined,
    state: params.get("state") || undefined,
    target_audience: params.get("target_audience") || undefined,
    verified: parseBoolean(params.get("verified")),
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

const onlyDigits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

const stripCrpPrefix = (value: string) => value.replace(/^(?:CRP\s*[:\-–—]?\s*)+/i, "").trim();

const formatCrpNumber = (value?: string | null) => {
  const normalized = stripCrpPrefix(value?.trim() ?? "");
  if (!normalized) return null;

  const [rawRegion, ...rawNumberParts] = normalized.split("/");
  const regionDigits = onlyDigits(rawRegion).slice(0, 2);
  const numberDigits = onlyDigits(rawNumberParts.join("/")).slice(0, 6);

  if (regionDigits && numberDigits) {
    return `${regionDigits.padStart(2, "0")}/${numberDigits.padStart(6, "0")}`;
  }

  return normalized;
};

const formatCrpLabel = (value?: string | null) => {
  const crp = formatCrpNumber(value);

  return crp ? `CRP ${crp}` : "CRP não informado";
};

const Avatar = ({ name, src }: { name: string; src: string | null }) => {
  if (!canRenderImage(src)) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
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

const FilterTextField = ({
  className,
  label,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value?: string;
}) => (
  <label className={cn("grid min-w-0 gap-2 text-sm font-semibold text-foreground", className)}>
    <span>{label}</span>
    <span className="relative block">
      <Search
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-12 w-full rounded-2xl border border-border/80 bg-surface-muted px-4 pl-11 text-sm font-bold text-foreground shadow-none outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10"
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value || ""}
      />
    </span>
    <span className="block min-h-4 text-xs font-medium leading-4 text-danger" />
  </label>
);

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
        <span className="block text-sm font-extrabold leading-5 text-foreground">
          {option.label}
        </span>
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

  return (
    <>
      <FilterTextField
        className="col-span-2"
        label="Pesquisa"
        onChange={(value) => onFilter("q", value || null)}
        placeholder="Buscar por nome ou CRP"
        value={query.q}
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
          <h3 className="text-sm font-extrabold text-foreground">Selos e facilidades</h3>
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

const SearchBox = ({ onSearch, value }: { onSearch: (value: string) => void; value?: string }) => {
  const [draft, setDraft] = useState(value || "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSearch(draft.trim());
  };

  return (
    <form className="flex w-full min-w-0 flex-col gap-2 sm:flex-row" onSubmit={submit}>
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Buscar por nome ou CRP</span>
        <Search
          aria-hidden
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        />
        <input
          className="h-12 w-full rounded-control border border-border bg-surface py-2 pl-10 pr-3 text-sm font-bold text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary"
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Nome ou CRP do psicólogo..."
          value={draft}
        />
      </label>
      <button
        className="h-12 w-full shrink-0 rounded-control bg-primary px-4 text-sm font-black text-white shadow-control transition hover:bg-primary-hover sm:w-auto"
        type="submit"
      >
        Buscar
      </button>
    </form>
  );
};

const badgeClassName = {
  active: "bg-emerald-50 text-emerald-700",
  courtesy: "bg-violet-50 text-violet-700",
  free: "bg-blue-50 text-blue-700",
  inactive: "bg-surface-muted text-muted",
  pending: "bg-orange-50 text-orange-700",
  professional: "bg-primary-soft text-primary",
} as const;

const CompactBadge = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: keyof typeof badgeClassName;
}) => (
  <span
    className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", badgeClassName[tone])}
  >
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

const WhatsAppIcon = ({ className, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    className={cn("h-5 w-5 shrink-0", className)}
    fill="none"
    viewBox="0 0 20 20"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title>WhatsApp</title>
    <path
      d="M14.56 11.985C14.3125 11.8608 13.095 11.2625 12.8683 11.1791C12.6408 11.0966 12.4758 11.0558 12.31 11.3041C12.1458 11.5516 11.6708 12.1091 11.5267 12.2741C11.3825 12.44 11.2375 12.46 10.99 12.3366C10.7425 12.2116 9.94417 11.9508 8.99833 11.1075C8.2625 10.4508 7.765 9.63997 7.62083 9.39164C7.47667 9.14414 7.60583 9.00997 7.72917 8.88664C7.84083 8.77581 7.9775 8.59747 8.10083 8.45331C8.225 8.30831 8.26583 8.20497 8.34917 8.03914C8.43167 7.87414 8.39083 7.72997 8.32833 7.60581C8.26583 7.48247 7.77083 6.26247 7.565 5.76664C7.36333 5.28414 7.15917 5.34997 7.0075 5.34164C6.86333 5.33497 6.69833 5.33331 6.5325 5.33331C6.3675 5.33331 6.09917 5.39497 5.8725 5.64331C5.64583 5.89081 5.00583 6.48997 5.00583 7.70914C5.00583 8.92747 5.89333 10.105 6.01667 10.2708C6.14083 10.4358 7.76333 12.9375 10.2475 14.01C10.8383 14.265 11.2992 14.4175 11.6592 14.5308C12.2525 14.72 12.7925 14.6933 13.2183 14.6291C13.6942 14.5583 14.6833 14.03 14.89 13.4516C15.0967 12.8733 15.0967 12.3775 15.0342 12.2741C14.9725 12.1708 14.8075 12.1091 14.5592 11.985H14.56ZM10.0417 18.1541H10.0383C8.56314 18.1543 7.11507 17.7576 5.84583 17.0058L5.545 16.8275L2.4275 17.6458L3.25917 14.6058L3.06333 14.2941C2.2387 12.981 1.80245 11.4614 1.805 9.91081C1.80583 5.36914 5.50167 1.67414 10.045 1.67414C12.245 1.67414 14.3133 2.53247 15.8683 4.08914C17.418 5.63201 18.2861 7.7307 18.2792 9.91747C18.2767 14.4591 14.5817 18.1541 10.0417 18.1541ZM17.0525 2.90664C15.1979 1.03979 12.6731 -0.00695713 10.0417 -2.68403e-05C4.50917 -2.68403e-05 0.00833333 4.49414 0.005 10.0208C0.005 11.7875 0.455 13.5141 1.31417 15.0275L0 20L5.0975 18.6625C6.5981 19.5304 8.30145 19.9864 10.035 19.9841H10.0392C15.57 19.9841 20.0708 15.4916 20.0742 9.96581C20.0929 7.30066 19.0317 4.7415 17.1325 2.87164L17.0525 2.90664Z"
      fill="currentColor"
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

const RatingCell = ({ item }: { item: PsychologistsListItem }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap font-black text-foreground">
    <Star aria-hidden className="h-4 w-4 fill-warning text-warning" />
    {item.rating_avg.toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1,
    })}
    <span className="text-xs font-bold text-muted">
      ({numberFormatter.format(item.rating_count)})
    </span>
  </span>
);

const MetricCell = ({ icon, value }: { icon: ReactNode; value: number }) => (
  <span className="inline-flex items-center gap-1 whitespace-nowrap font-black text-foreground">
    {icon}
    {numberFormatter.format(value)}
  </span>
);

const RowActions = ({ item }: { item: PsychologistsListItem }) => (
  <div className="flex shrink-0 items-center gap-2">
    <Link
      className="grid h-9 w-9 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={item.detail_url}
      onClick={(event) => event.stopPropagation()}
      title="Abrir detalhe administrativo"
    >
      <Eye aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir detalhe administrativo de {item.name}</span>
    </Link>
    <a
      className="grid h-9 w-9 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
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

const PsychologistsTable = ({
  items,
  onOpenDetail,
}: {
  items: PsychologistsListItem[];
  onOpenDetail: (href: string) => void;
}) => (
  <div className="min-w-0 max-w-full overflow-x-auto">
    <table className="w-full min-w-[1120px] table-fixed text-left text-sm">
      <caption className="sr-only">Lista administrativa de psicólogos</caption>
      <colgroup>
        <col className="w-24" />
        <col className="w-[25%]" />
        <col className="w-32" />
        <col className="w-28" />
        <col className="w-32" />
        <col className="w-32" />
        <col className="w-32" />
        <col className="w-32" />
        <col className="w-28" />
      </colgroup>
      <thead className="border-b border-border text-xs text-muted">
        <tr>
          <th className="px-3 py-4 font-black">Ranking</th>
          <th className="px-3 py-4 font-black">Psicólogo</th>
          <th className="px-3 py-4 font-black">Plano</th>
          <th className="px-3 py-4 font-black">Perfil</th>
          <th className="px-3 py-4 font-black">Registro</th>
          <th className="px-3 py-4 font-black">Avaliações</th>
          <th className="px-3 py-4 font-black">Favoritado</th>
          <th className="px-3 py-4 font-black">WhatsApp</th>
          <th className="px-3 py-4 font-black">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => {
          const plan = resolvePlanLabel(item);
          const profile = resolveProfileLabel(item);
          const registry = resolveRegistryLabel(item);

          return (
            <tr
              aria-label={`Abrir detalhe administrativo de ${item.name}`}
              className="cursor-pointer transition hover:bg-surface-muted/50 focus:bg-primary-soft/60 focus:outline-none"
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
              <td className="whitespace-nowrap px-3 py-3 text-xl font-black text-primary">
                {item.ranking_position ? `#${item.ranking_position}` : "—"}
              </td>
              <td className="px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={item.name} src={item.avatar} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">
                      {item.name}{" "}
                      {item.verified ? (
                        <VerifiedBadgeIcon
                          aria-label="Perfil verificado"
                          className="inline h-4 w-4 align-[-2px]"
                        />
                      ) : null}
                    </p>
                    <p className="truncate text-xs font-bold text-muted">
                      {formatCrpLabel(item.crp)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <CompactBadge tone={plan.tone}>{plan.label}</CompactBadge>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <CompactBadge tone={profile.tone}>{profile.label}</CompactBadge>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <CompactBadge tone={registry.tone}>{registry.label}</CompactBadge>
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <RatingCell item={item} />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <MetricCell
                  icon={<Heart aria-hidden className="h-4 w-4 text-primary" />}
                  value={item.favorites_count}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <MetricCell
                  icon={<WhatsAppIcon aria-hidden className="h-4 w-4 text-success" />}
                  value={item.whatsapp_clicks_count}
                />
              </td>
              <td className="whitespace-nowrap px-3 py-3">
                <RowActions item={item} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
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
          <h2 className="text-lg font-black">Não foi possível carregar a lista</h2>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
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
    <h2 className="mt-3 text-lg font-black text-foreground">Nenhum psicólogo encontrado</h2>
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
              <span className="px-1 text-sm font-black text-muted">...</span>
            ) : null}
            <button
              aria-current={number === page ? "page" : undefined}
              className={cn(
                "grid h-10 min-w-10 place-items-center rounded-2xl border border-border bg-surface px-3 text-sm font-black text-foreground",
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
      <label className="text-xs font-black text-muted">
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

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-clip">
      <header className="space-y-4">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-2 text-xs font-bold text-muted"
        >
          <Link className="hover:text-primary" href="/dashboard">
            Dashboard
          </Link>
          <span>/</span>
          <Link className="hover:text-primary" href="/psicologos">
            Psicólogos
          </Link>
          <span>/</span>
          <span className="text-foreground">Lista de psicólogos</span>
        </nav>
        <div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
              Lista de Psicólogos
            </h1>
            <p className="mt-2 text-sm font-medium text-muted">
              Encontre profissionais por nome, CRP e filtros cadastrados.
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 xl:w-full xl:max-w-[560px]">
            <SearchBox
              key={query.q || "empty-search"}
              onSearch={(value) => replaceParams({ q: value || null })}
              value={query.q}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap xl:justify-end">
            <label className="flex min-w-0 flex-col gap-1 text-xs font-black text-muted sm:min-w-[210px]">
              Ordenar por
              <select
                className="h-12 min-w-0 rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control"
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
            </label>
            <button
              className="inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control"
              onClick={openFilters}
              type="button"
            >
              <Filter aria-hidden className="h-4 w-4" />
              Filtros ativos
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs text-primary">
                {summary?.active_filters_count ?? 0}
              </span>
            </button>
          </div>
        </div>

        <CardShell className="overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <p className="text-sm font-black text-foreground">
              {summary ? numberFormatter.format(summary.count) : "—"} psicólogos encontrados
            </p>
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
                  className="self-center text-lg font-extrabold leading-5 text-foreground"
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
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-extrabold text-white shadow-control transition duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
