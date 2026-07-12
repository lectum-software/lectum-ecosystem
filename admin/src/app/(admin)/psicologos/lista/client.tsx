"use client";

import {
  AlertTriangle,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  Heart,
  MessageCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
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
  PsychologistsListStatus,
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

const STATUS_COPY: Record<PsychologistsListStatus, { className: string; label: string }> = {
  free: { className: "bg-blue-50 text-blue-700", label: "Gratuito" },
  pending: { className: "bg-orange-50 text-orange-700", label: "Pendente" },
  unpublished: { className: "bg-surface-muted text-muted", label: "Não publicado" },
  verified: { className: "bg-emerald-50 text-emerald-700", label: "Verificado" },
};

const REGISTRY_STATUS_TONE: Record<string, string> = {
  api_indisponivel: "bg-orange-50 text-orange-700",
  aprovado: "bg-emerald-50 text-emerald-700",
  em_analise: "bg-blue-50 text-blue-700",
  limite_tentativas: "bg-orange-50 text-orange-700",
  pendente: "bg-surface-muted text-muted",
  rejeitado: "bg-red-50 text-danger",
};

const numberFormatter = new Intl.NumberFormat("pt-BR");
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const publicFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));
const listExperience = new Set(["0_4", "5_9", "10_plus", "unknown"]);
const listStatuses = new Set(Object.keys(STATUS_COPY));
const LOADING_ROWS = ["loading-1", "loading-2", "loading-3", "loading-4", "loading-5", "loading-6"];
const FILTER_MODAL_CLOSE_DELAY_MS = 260;
const FILTER_KEYS = [
  "accepts_insurance",
  "approach",
  "city",
  "discount_first_session",
  "experience",
  "gender",
  "language",
  "modality",
  "plan",
  "service",
  "social_value",
  "state",
  "status",
  "target_audience",
] as const satisfies readonly (keyof PsychologistsListQuery)[];

type FilterQueryKey = (typeof FILTER_KEYS)[number];

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
  const status = params.get("status") as PsychologistsListStatus | null;
  const experience = params.get("experience") as PsychologistsListQuery["experience"] | null;

  return {
    accepts_insurance: parseBoolean(params.get("accepts_insurance")),
    approach: params.get("approach") || undefined,
    city: params.get("city") || undefined,
    discount_first_session: parseBoolean(params.get("discount_first_session")),
    experience: experience && listExperience.has(experience) ? experience : undefined,
    gender: params.get("gender") || undefined,
    language: params.get("language") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    modality: params.get("modality") || undefined,
    page: parsePositiveNumber(params.get("page"), 1),
    plan: params.get("plan") || undefined,
    q: params.get("q") || undefined,
    service: params.get("service") || undefined,
    social_value: parseBoolean(params.get("social_value")),
    sort: sort && listSorts.has(sort) ? sort : "relevance",
    state: params.get("state") || undefined,
    status: status && listStatuses.has(status) ? status : undefined,
    target_audience: params.get("target_audience") || undefined,
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

const SelectField = ({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: PsychologistsListOption[];
  placeholder: string;
  value?: string;
}) => (
  <label className="block text-sm font-black text-foreground">
    {label}
    <select
      className="mt-2 h-12 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground shadow-control outline-none transition focus:border-primary"
      onChange={(event) => onChange(event.target.value)}
      value={value || ""}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label} ({numberFormatter.format(option.count)})
        </option>
      ))}
    </select>
  </label>
);

const ToggleFilter = ({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center gap-3 text-sm font-bold text-foreground">
    <input
      checked={checked}
      className="h-5 w-5 rounded border-border text-primary accent-primary"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
    {label}
  </label>
);

const FilterPanel = ({
  className,
  data,
  onFilter,
  query,
  showHeader = true,
}: {
  className?: string;
  data?: AdminPsychologistsList;
  onFilter: (key: FilterQueryKey, value: string | boolean | null) => void;
  query: PsychologistsListQuery;
  showHeader?: boolean;
}) => {
  const filters = data?.filters;
  const empty: PsychologistsListOption[] = [];

  return (
    <div className={cn("space-y-5", className)}>
      {showHeader ? (
        <div>
          <h2 className="text-lg font-black text-foreground">Filtros de busca</h2>
          <p className="mt-1 text-xs font-bold text-muted">
            Todos os filtros usam campos reais dos perfis profissionais.
          </p>
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-sm font-black text-foreground">Localização</h3>
          <SelectField
            label="Estado"
            onChange={(value) => onFilter("state", value || null)}
            options={filters?.states ?? empty}
            placeholder="Todos os estados"
            value={query.state}
          />
          <SelectField
            label="Cidade"
            onChange={(value) => onFilter("city", value || null)}
            options={filters?.cities ?? empty}
            placeholder="Todas as cidades"
            value={query.city}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-black text-foreground">Status e plano</h3>
          <SelectField
            label="Status"
            onChange={(value) => onFilter("status", value || null)}
            options={filters?.statuses ?? empty}
            placeholder="Todos"
            value={query.status}
          />
          <SelectField
            label="Plano"
            onChange={(value) => onFilter("plan", value || null)}
            options={filters?.plans ?? empty}
            placeholder="Todos os planos"
            value={query.plan}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-black text-foreground">Selos e diferenciais</h3>
          <SelectField
            label="Experiência"
            onChange={(value) => onFilter("experience", value || null)}
            options={filters?.experience_ranges ?? empty}
            placeholder="Todas"
            value={query.experience}
          />
          <ToggleFilter
            checked={query.discount_first_session === true}
            label="Desconto 1ª sessão"
            onChange={(checked) => onFilter("discount_first_session", checked || null)}
          />
          <ToggleFilter
            checked={query.accepts_insurance === true}
            label="Aceita convênios"
            onChange={(checked) => onFilter("accepts_insurance", checked || null)}
          />
          <ToggleFilter
            checked={query.social_value === true}
            label="Valor social"
            onChange={(checked) => onFilter("social_value", checked || null)}
          />
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-black text-foreground">Perfil profissional</h3>
          <SelectField
            label="Público atendido"
            onChange={(value) => onFilter("target_audience", value || null)}
            options={filters?.target_audience ?? empty}
            placeholder="Todos"
            value={query.target_audience}
          />
          <SelectField
            label="Abordagem"
            onChange={(value) => onFilter("approach", value || null)}
            options={filters?.approaches ?? empty}
            placeholder="Todas"
            value={query.approach}
          />
          <SelectField
            label="Serviço"
            onChange={(value) => onFilter("service", value || null)}
            options={filters?.services ?? empty}
            placeholder="Todos"
            value={query.service}
          />
          <SelectField
            label="Modalidade"
            onChange={(value) => onFilter("modality", value || null)}
            options={filters?.modalities ?? empty}
            placeholder="Todas"
            value={query.modality}
          />
          <SelectField
            label="Idioma"
            onChange={(value) => onFilter("language", value || null)}
            options={filters?.languages ?? empty}
            placeholder="Todos"
            value={query.language}
          />
          <SelectField
            label="Gênero"
            onChange={(value) => onFilter("gender", value || null)}
            options={filters?.genders ?? empty}
            placeholder="Todos"
            value={query.gender}
          />
        </div>
      </div>
    </div>
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

const statusBadge = (status: PsychologistsListStatus) => (
  <span
    className={cn("rounded-full px-2.5 py-1 text-xs font-black", STATUS_COPY[status].className)}
  >
    {STATUS_COPY[status].label}
  </span>
);

const registryStatusBadge = (item: PsychologistsListItem) => (
  <span
    className={cn(
      "rounded-full px-2.5 py-1 text-xs font-black",
      REGISTRY_STATUS_TONE[item.registry_verification.status] ?? "bg-surface-muted text-muted",
    )}
  >
    {item.registry_verification.status_label}
  </span>
);

const RatingCell = ({ item }: { item: PsychologistsListItem }) => (
  <div>
    <p className="inline-flex items-center gap-1 font-black text-foreground">
      <Star aria-hidden className="h-4 w-4 fill-warning text-warning" />
      {item.rating_avg.toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
        minimumFractionDigits: 1,
      })}
    </p>
    <p className="mt-1 text-xs font-bold text-muted">
      {numberFormatter.format(item.rating_count)} avaliações
    </p>
  </div>
);

const MetricCell = ({ icon, label, value }: { icon: ReactNode; label: string; value: number }) => (
  <div>
    <p className="inline-flex items-center gap-1 font-black text-foreground">
      {icon}
      {numberFormatter.format(value)}
    </p>
    <p className="mt-1 text-xs font-bold text-muted">{label}</p>
  </div>
);

const RowActions = ({ item }: { item: PsychologistsListItem }) => (
  <div className="flex shrink-0 items-center gap-2">
    <Link
      className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={item.detail_url}
      title="Abrir detalhe administrativo"
    >
      <Eye aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir detalhe administrativo de {item.name}</span>
    </Link>
    <a
      className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary"
      href={toPublicHref(item.public_profile_url)}
      rel="noreferrer"
      target="_blank"
      title="Abrir perfil público"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
      <span className="sr-only">Abrir perfil público de {item.name}</span>
    </a>
  </div>
);

const MobilePsychologistCard = ({ item }: { item: PsychologistsListItem }) => (
  <article className="min-w-0 rounded-3xl border border-border bg-surface p-4 shadow-control">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={item.name} src={item.avatar} />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-foreground">
            {item.name}{" "}
            {item.verified ? <BadgeCheck className="inline h-4 w-4 text-primary" /> : null}
          </p>
          <p className="text-xs font-bold text-muted">{item.crp || "CRP não informado"}</p>
        </div>
      </div>
      <p className="text-xl font-black text-primary">
        {item.ranking_position ? `#${item.ranking_position}` : "—"}
      </p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div>
        <p className="text-xs font-bold text-muted">Localização</p>
        <p className="font-black text-foreground">
          {[item.city, item.state].filter(Boolean).join(", ") || "Não informado"}
        </p>
      </div>
      <div>
        <p className="text-xs font-bold text-muted">Experiência</p>
        <p className="font-black text-foreground">
          {item.experience_years ? `${item.experience_years} anos+` : "Não informada"}
        </p>
      </div>
      <RatingCell item={item} />
      <MetricCell
        icon={<Heart aria-hidden className="h-4 w-4 text-primary" />}
        label="favoritos"
        value={item.favorites_count}
      />
      <MetricCell
        icon={<MessageCircle aria-hidden className="h-4 w-4 text-success" />}
        label="WhatsApp"
        value={item.whatsapp_clicks_count}
      />
      <div>
        <p className="text-xs font-bold text-muted">Status</p>
        <div className="mt-1">{statusBadge(item.status)}</div>
      </div>
      <div className="col-span-2">
        <p className="text-xs font-bold text-muted">Verificação profissional</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {registryStatusBadge(item)}
          <span className="text-xs font-bold text-subtle">
            {item.registry_verification.source_label}
          </span>
        </div>
      </div>
    </div>
    <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-xs font-bold text-muted">{item.plan_name || "Sem plano ativo"}</p>
      <RowActions item={item} />
    </div>
  </article>
);

const PsychologistsTable = ({ items }: { items: PsychologistsListItem[] }) => (
  <div className="hidden min-w-0 max-w-full overflow-hidden min-[1700px]:block">
    <table className="w-full table-fixed text-left text-sm">
      <caption className="sr-only">Lista administrativa de psicólogos</caption>
      <colgroup>
        <col className="w-20" />
        <col className="w-[28%]" />
        <col className="w-[14%]" />
        <col className="w-[11%]" />
        <col className="w-[13%]" />
        <col className="w-[10%]" />
        <col className="w-[10%]" />
        <col className="w-24" />
      </colgroup>
      <thead className="border-b border-border text-xs text-muted">
        <tr>
          <th className="px-3 py-4 font-black">Ranking</th>
          <th className="px-3 py-4 font-black">Psicólogo</th>
          <th className="px-3 py-4 font-black">Localização</th>
          <th className="px-3 py-4 font-black">Experiência</th>
          <th className="px-3 py-4 font-black">Avaliações</th>
          <th className="px-3 py-4 font-black">Favoritado</th>
          <th className="px-3 py-4 font-black">WhatsApp</th>
          <th className="px-3 py-4 font-black">Ações</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {items.map((item) => (
          <tr className="transition hover:bg-surface-muted/50" key={item.id}>
            <td className="px-3 py-5 text-2xl font-black text-primary">
              {item.ranking_position ? `#${item.ranking_position}` : "—"}
            </td>
            <td className="px-3 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={item.name} src={item.avatar} />
                <div className="min-w-0">
                  <p className="truncate font-black text-foreground">
                    {item.name}{" "}
                    {item.verified ? <BadgeCheck className="inline h-4 w-4 text-primary" /> : null}
                  </p>
                  <p className="truncate text-xs font-bold text-muted">
                    Psicóloga · {item.crp || "CRP não informado"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statusBadge(item.status)}
                    {registryStatusBadge(item)}
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-black text-primary">
                      {item.plan_name || "Sem plano"}
                    </span>
                  </div>
                </div>
              </div>
            </td>
            <td className="break-words px-3 py-5 font-bold text-muted">
              {[item.city, item.state].filter(Boolean).join(", ") || "Não informado"}
            </td>
            <td className="break-words px-3 py-5 font-bold text-foreground">
              {item.experience_years ? `${item.experience_years} anos+` : "—"}
            </td>
            <td className="break-words px-3 py-5">
              <RatingCell item={item} />
            </td>
            <td className="break-words px-3 py-5">
              <MetricCell
                icon={<Heart aria-hidden className="h-4 w-4 text-primary" />}
                label="total"
                value={item.favorites_count}
              />
            </td>
            <td className="break-words px-3 py-5">
              <MetricCell
                icon={<MessageCircle aria-hidden className="h-4 w-4 text-success" />}
                label="cliques"
                value={item.whatsapp_clicks_count}
              />
            </td>
            <td className="px-3 py-5">
              <RowActions item={item} />
            </td>
          </tr>
        ))}
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
    router.replace(pathname, { scroll: false });
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
              <>
                <div className="space-y-3 min-[1700px]:hidden">
                  {items.map((item) => (
                    <MobilePsychologistCard item={item} key={item.id} />
                  ))}
                </div>
                <PsychologistsTable items={items} />
              </>
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
              "relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-border bg-surface shadow-admin transition-transform duration-300 ease-out motion-reduce:transition-none sm:h-auto sm:max-h-[min(860px,calc(100dvh-2rem))] sm:max-w-3xl sm:rounded-[2rem] sm:border",
              filtersSheetOpen ? "translate-y-0" : "translate-y-full sm:translate-y-4",
            )}
            role="document"
          >
            <div className="shrink-0 border-b border-border bg-surface/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-start gap-3">
                <button
                  aria-label="Fechar filtros"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-border bg-background text-muted transition hover:bg-surface-muted hover:text-foreground"
                  onClick={closeFilters}
                  type="button"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
                <div className="min-w-0 pt-1">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal aria-hidden className="h-5 w-5 shrink-0 text-primary" />
                    <h2
                      className="text-lg font-black leading-6 text-foreground"
                      id="admin-psychologists-filters-title"
                    >
                      Filtros de busca
                    </h2>
                  </div>
                  <p className="mt-1 text-xs font-bold leading-5 text-muted sm:text-sm">
                    Segmente a lista com os mesmos dados reais usados na descoberta pública de
                    psicólogos.
                  </p>
                </div>
                <button
                  className="mt-1 rounded-full px-2 py-1 text-xs font-black text-primary transition hover:bg-primary-soft"
                  onClick={clearFilters}
                  type="button"
                >
                  Limpar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              <FilterPanel
                className="mx-auto max-w-2xl"
                data={summary}
                onFilter={updateDraftFilter}
                query={draftQuery}
                showHeader={false}
              />
            </div>

            <div className="shrink-0 border-t border-border bg-surface/95 px-4 py-3 shadow-admin-soft sm:px-6">
              <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button
                  className="h-12 rounded-control border border-border bg-surface px-5 text-sm font-black text-foreground transition hover:border-border-strong"
                  onClick={closeFilters}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="h-12 rounded-control bg-primary px-5 text-sm font-black text-white shadow-control transition hover:bg-primary-hover"
                  onClick={applyDraftFilters}
                  type="button"
                >
                  Aplicar filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
