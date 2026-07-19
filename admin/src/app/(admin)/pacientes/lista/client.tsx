"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useAdminPatientsList } from "@/api/callers/patients/list";
import { resolveApiError } from "@/api/handle";
import type {
  PatientsListItem,
  PatientsListProvider,
  PatientsListQuery,
  PatientsListSort,
  PatientsListStatus,
} from "@/api/req/patients/list";
import { cn } from "@/lib/utils";

const SORT_OPTIONS: Array<{ id: PatientsListSort; label: string }> = [
  { id: "recent", label: "Cadastro recente" },
  { id: "name", label: "Nome" },
];

const STATUS_OPTIONS: Array<{ id: PatientsListStatus; label: string }> = [
  { id: "active", label: "Ativos" },
  { id: "inactive", label: "Inativos" },
];

const PROVIDER_OPTIONS: Array<{ id: PatientsListProvider; label: string }> = [
  { id: "email_password", label: "E-mail e senha" },
  { id: "google", label: "Google" },
];

const listSorts = new Set(SORT_OPTIONS.map((item) => item.id));
const listStatuses = new Set(STATUS_OPTIONS.map((item) => item.id));
const listProviders = new Set(PROVIDER_OPTIONS.map((item) => item.id));
const LOADING_ROWS = ["loading-1", "loading-2", "loading-3", "loading-4", "loading-5"];
const SEARCH_DEBOUNCE_MS = 350;
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/Sao_Paulo",
  year: "numeric",
});

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

const parseQuery = (params: URLSearchParams): PatientsListQuery => {
  const sort = params.get("sort") as PatientsListSort | null;
  const status = params.get("status") as PatientsListStatus | null;
  const provider = params.get("provider") as PatientsListProvider | null;

  return {
    gender: params.get("gender") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 12)),
    page: parsePositiveNumber(params.get("page"), 1),
    provider: provider && listProviders.has(provider) ? provider : undefined,
    q: params.get("q") || undefined,
    sort: sort && listSorts.has(sort) ? sort : "recent",
    status: status && listStatuses.has(status) ? status : undefined,
  };
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
    .toUpperCase() || "PA";

const formatDate = (value: string | null) => {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return dateFormatter.format(date);
};

const formatLocation = (item: PatientsListItem) => {
  const cityState = [item.city, item.state].filter(Boolean).join(", ");
  if (cityState) return cityState;

  return item.country || "—";
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

const SearchBox = ({ onSearch, value }: { onSearch: (value: string) => void; value?: string }) => {
  const [draft, setDraft] = useState(value || "");

  useEffect(() => {
    const normalized = draft.trim();
    const current = value || "";

    if (normalized === current) return;

    const timer = window.setTimeout(() => {
      onSearch(normalized);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draft, onSearch, value]);

  return (
    <label className="relative block h-12 w-full min-w-0 text-sm font-medium text-foreground">
      <span className="sr-only">Buscar por nome ou e-mail</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome ou e-mail..."
        type="search"
        value={draft}
      />
    </label>
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
  options: Array<{ id: string; label: string }>;
  placeholder?: string;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[180px]">
    {label}
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || ""}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronRight
        aria-hidden
        className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-foreground"
      />
    </span>
  </label>
);

const statusClassName = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-surface-muted text-muted",
} as const;

const CompactBadge = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: keyof typeof statusClassName;
}) => (
  <span
    className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-bold", statusClassName[tone])}
  >
    {children}
  </span>
);

const RowActions = ({ item }: { item: PatientsListItem }) => (
  <Link
    aria-label={`Abrir detalhe administrativo de ${item.name}`}
    className="inline-grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-primary shadow-control transition hover:border-primary/45 hover:bg-primary-soft"
    href={item.detail_url}
    onClick={(event) => event.stopPropagation()}
  >
    <Eye aria-hidden className="h-4 w-4" />
  </Link>
);

const PatientMobileCard = ({
  item,
  onOpenDetail,
}: {
  item: PatientsListItem;
  onOpenDetail: (href: string) => void;
}) => (
  <button
    className="w-full rounded-3xl border border-border bg-surface p-4 text-left shadow-control transition hover:border-primary/30 hover:shadow-admin-soft"
    onClick={() => onOpenDetail(item.detail_url)}
    type="button"
  >
    <div className="flex items-start gap-3">
      <Avatar name={item.name} src={item.avatar} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-foreground">{item.name}</p>
        <p className="truncate text-xs font-semibold text-muted" title={item.email}>
          {item.email}
        </p>
      </div>
      <CompactBadge tone={item.status}>{item.status_label}</CompactBadge>
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
      <div>
        <dt className="font-semibold text-muted">Cadastro</dt>
        <dd className="mt-1 font-bold text-foreground">{formatDate(item.created_at)}</dd>
      </div>
      <div>
        <dt className="font-semibold text-muted">Origem</dt>
        <dd className="mt-1 font-bold text-foreground">{item.provider_label}</dd>
      </div>
      <div>
        <dt className="font-semibold text-muted">Gênero</dt>
        <dd className="mt-1 font-bold text-foreground">{item.gender_label}</dd>
      </div>
      <div>
        <dt className="font-semibold text-muted">Cidade/UF</dt>
        <dd className="mt-1 font-bold text-foreground">{formatLocation(item)}</dd>
      </div>
    </dl>
  </button>
);

const PatientsTable = ({
  items,
  onOpenDetail,
}: {
  items: PatientsListItem[];
  onOpenDetail: (href: string) => void;
}) => (
  <>
    <div className="grid gap-3 lg:hidden">
      {items.map((item) => (
        <PatientMobileCard item={item} key={item.id} onOpenDetail={onOpenDetail} />
      ))}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full table-auto text-left text-sm">
        <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="px-5 py-4">Paciente</th>
            <th className="px-3 py-4">Status</th>
            <th className="px-3 py-4">Origem</th>
            <th className="px-3 py-4">Cidade/UF</th>
            <th className="px-3 py-4">Cadastro</th>
            <th className="px-3 py-4">Gênero</th>
            <th className="px-5 py-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
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
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={item.name} src={item.avatar} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{item.name}</p>
                    <p className="truncate text-xs font-bold text-muted" title={item.email}>
                      {item.email}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-4">
                <CompactBadge tone={item.status}>{item.status_label}</CompactBadge>
              </td>
              <td className="whitespace-nowrap px-3 py-4 font-semibold text-foreground">
                {item.provider_label}
              </td>
              <td className="whitespace-nowrap px-3 py-4 font-semibold text-foreground">
                {formatLocation(item)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 font-semibold text-foreground">
                {formatDate(item.created_at)}
              </td>
              <td className="whitespace-nowrap px-3 py-4 font-semibold text-foreground">
                {item.gender_label}
              </td>
              <td className="px-5 py-4 text-center">
                <RowActions item={item} />
              </td>
            </tr>
          ))}
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
    <h2 className="mt-3 text-lg font-semibold text-foreground">Nenhum paciente encontrado</h2>
    <p className="mt-1 text-sm text-muted">
      Ajuste a busca ou limpe os filtros para ver pacientes cadastrados.
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

export const AdminPatientsListClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const listQuery = useAdminPatientsList(query);
  const queryError = listQuery.error ? resolveApiError(listQuery.error) : null;

  const replaceParams = (
    updates: Partial<Record<keyof PatientsListQuery, string | number | null>>,
    options: { resetPage?: boolean } = { resetPage: true },
  ) => {
    const params = new URLSearchParams(searchString);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined || value === "") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    }

    if (options.resetPage !== false) params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const summary = listQuery.data;
  const items = summary?.data ?? [];
  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Pacientes
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Lista de pacientes
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Acesse todos os pacientes da plataforma.
            </p>
          </div>
        </div>
      </header>

      <div className="min-w-0 space-y-4">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 xl:w-full xl:max-w-[520px]">
            <SearchBox
              key={query.q ?? ""}
              onSearch={(value) => replaceParams({ q: value || null })}
              value={query.q}
            />
          </div>
          <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap xl:justify-end">
            <SelectField
              label="Status"
              onChange={(value) => replaceParams({ status: value || null })}
              options={STATUS_OPTIONS}
              placeholder="Todos"
              value={query.status}
            />
            <SelectField
              label="Forma de cadastro"
              onChange={(value) => replaceParams({ provider: value || null })}
              options={PROVIDER_OPTIONS}
              placeholder="Todas"
              value={query.provider}
            />
            <SelectField
              label="Ordenar por"
              onChange={(value) => replaceParams({ sort: value as PatientsListSort })}
              options={SORT_OPTIONS}
              value={query.sort || "recent"}
            />
          </div>
        </div>

        <CardShell className="overflow-hidden">
          <div className="border-b border-border px-4 py-4">
            <p className="text-sm font-semibold text-foreground">
              {summary ? numberFormatter.format(summary.count) : "—"} pacientes encontrados
            </p>
            {summary && summary.active_filters_count > 0 ? (
              <p className="mt-1 text-xs font-semibold text-muted">
                {summary.active_filters_count} filtro(s) ativo(s)
              </p>
            ) : null}
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
              <PatientsTable items={items} onOpenDetail={(href) => router.push(href)} />
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
    </div>
  );
};
