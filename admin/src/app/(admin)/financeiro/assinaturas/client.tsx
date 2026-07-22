"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useAdminFinanceSubscriptions } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type {
  FinanceListQuery,
  FinancePeriodValue,
  FinanceSubscriptionItem,
} from "@/api/req/finance";
import { cn } from "@/lib/utils";

const LIST_LIMIT_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 350;
const validPeriods = new Set<FinancePeriodValue>([
  "all",
  "custom",
  "month",
  "today",
  "week",
  "year",
]);
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");
const statusFilterOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Ativas", value: "ativa" },
  { label: "Inadimplentes", value: "inadimplente" },
  { label: "Canceladas", value: "cancelada" },
] as const;
const validSubscriptionStatuses = new Set<string>(
  statusFilterOptions.map((option) => option.value),
);

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

const parseQuery = (params: URLSearchParams): FinanceListQuery => {
  const period = params.get("period") as FinancePeriodValue | null;
  const q = params.get("q");
  const status = params.get("status");

  return {
    from: params.get("from") || undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 20)),
    page: parsePositiveNumber(params.get("page"), 1),
    period: period && validPeriods.has(period) ? period : "all",
    q: q || undefined,
    status:
      status && validSubscriptionStatuses.has(status) && status !== "all" ? status : undefined,
    to: params.get("to") || undefined,
  };
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));

const formatNullableDate = (value: string | null) => (value ? formatDate(value) : "—");
const formatMoney = (cents: number) => moneyFormatter.format(cents / 100);

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
      <span className="sr-only">Buscar por nome, e-mail ou identificador</span>
      <Search
        aria-hidden
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
      />
      <input
        className="h-full w-full appearance-none rounded-full border border-border bg-surface py-0 pl-10 pr-4 text-sm font-medium text-foreground shadow-control outline-none transition placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Nome, e-mail ou ID..."
        type="search"
        value={draft}
      />
    </label>
  );
};

const DateFilterField = ({
  label,
  max,
  min,
  onChange,
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[160px]">
    {label}
    <input
      className="h-12 w-full min-w-0 rounded-full border border-border bg-surface px-4 py-0 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      max={max}
      min={min}
      onChange={(event) => onChange(event.target.value)}
      type="date"
      value={value || ""}
    />
  </label>
);

const StatusFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[180px]">
    Status
    <span className="relative block text-sm font-medium text-foreground">
      <select
        className="h-12 w-full min-w-0 appearance-none rounded-full border border-border bg-surface py-0 pl-4 pr-12 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
        onChange={(event) => onChange(event.target.value)}
        value={value || "all"}
      >
        {statusFilterOptions.map((option) => (
          <option key={option.value} value={option.value}>
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

const InitialsAvatar = ({ name }: { name: string }) => {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "PS";

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials}
    </span>
  );
};

const statusClassName = {
  ativa: "bg-emerald-50 text-success",
  cancelada: "bg-red-50 text-danger",
  inadimplente: "bg-yellow-50 text-yellow-700",
  inativa: "bg-surface-muted text-muted",
} as const;

const StatusBadge = ({ item }: { item: FinanceSubscriptionItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      statusClassName[item.status as keyof typeof statusClassName] ?? "bg-surface-muted text-muted",
    )}
  >
    {item.status_label}
  </span>
);

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar assinaturas</h2>
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

const LoadingState = () => (
  <div className="space-y-4 p-4">
    {["subscription-loading-1", "subscription-loading-2", "subscription-loading-3"].map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <UsersRound aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">
      Nenhuma assinatura paga encontrada
    </h2>
    <p className="mt-1 text-sm text-muted">
      A lista exclui plano gratuito e cortesia administrativa.
    </p>
  </div>
);

const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

const SubscriptionsTable = ({ items }: { items: FinanceSubscriptionItem[] }) => (
  <>
    <div className="grid gap-3 p-4 lg:hidden">
      {items.map((item) => (
        <article className="rounded-3xl border border-border bg-surface p-4" key={item.id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.psychologist.name} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">{item.psychologist.name}</h3>
                <StatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">{item.psychologist.email}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-semibold text-muted">Valor</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatMoney(item.plan.price_cents)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Início</dt>
                  <dd className="mt-1 font-bold text-foreground">{formatDate(item.started_at)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Última</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatNullableDate(item.last_charge_at)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Próxima</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatNullableDate(item.next_charge_at)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </article>
      ))}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <caption className="sr-only">Relação completa de assinaturas pagas</caption>
        <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="px-5 py-4">Psicólogo</th>
            <th className="px-5 py-4">Início</th>
            <th className="px-5 py-4">Última</th>
            <th className="px-5 py-4">Próxima</th>
            <th className="px-5 py-4">Valor</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr className="transition hover:bg-primary-soft/35" key={item.id}>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.psychologist.name} />
                  <div className="min-w-0">
                    <Link
                      className="truncate font-black text-foreground transition hover:text-primary"
                      href={item.detail_url}
                    >
                      {item.psychologist.name}
                    </Link>
                    <p className="truncate text-xs text-muted">{item.psychologist.email}</p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-muted">
                {formatDate(item.started_at)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-muted">
                {formatNullableDate(item.last_charge_at)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-muted">
                {formatNullableDate(item.next_charge_at)}
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-black text-foreground">
                {formatMoney(item.plan.price_cents)}
              </td>
              <td className="px-5 py-4">
                <StatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

export const AdminFinanceSubscriptionsClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const subscriptionsQuery = useAdminFinanceSubscriptions(query);
  const queryError = subscriptionsQuery.error ? resolveApiError(subscriptionsQuery.error) : null;
  const summary = subscriptionsQuery.data;
  const items = summary?.data ?? [];

  const replaceParams = (
    updates: Partial<Record<keyof FinanceListQuery, string | number | null>>,
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

  const hasTableFilters = Boolean(query.q || query.status || query.from || query.to);
  const handleStartDateFilterChange = (field: "from" | "to", value: string) => {
    if (!value) {
      const otherDate = field === "from" ? query.to : query.from;
      replaceParams(
        otherDate ? { [field]: otherDate, period: "custom" } : { [field]: null, period: "all" },
      );
      return;
    }

    let nextFrom = field === "from" ? value : (query.from ?? summary?.period.from ?? value);
    let nextTo = field === "to" ? value : (query.to ?? summary?.period.to ?? value);

    if (nextFrom > nextTo) {
      if (field === "from") nextTo = nextFrom;
      else nextFrom = nextTo;
    }

    replaceParams({ from: nextFrom, period: "custom", to: nextTo });
  };
  const clearTableFilters = () => {
    replaceParams({ from: null, period: "all", q: null, status: null, to: null });
  };

  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);
  const periodSummary = summary
    ? `${summary.period.label} · ${summary.period.from} a ${summary.period.to}`
    : "Carregando período";

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Financeiro
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Relação de assinaturas
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Relação completa de assinaturas profissionais pagas no período selecionado.
            </p>
            <p className="mt-2 text-xs font-bold text-muted">{periodSummary}</p>
          </div>
          <Link
            className="inline-flex h-11 w-fit items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary/40 hover:text-primary"
            href="/financeiro"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            Voltar ao Financeiro
          </Link>
        </div>
      </header>

      <CardShell className="overflow-hidden">
        <div className="space-y-4 border-b border-border px-4 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-foreground">
              {summary ? numberFormatter.format(summary.count) : "—"} assinaturas encontradas
            </p>
            <p className="text-xs font-bold text-muted">
              {hasTableFilters
                ? "Filtros aplicados sobre assinaturas pagas reais."
                : "Busque por psicólogo, e-mail ou identificador."}
            </p>
          </div>
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0 xl:w-full xl:max-w-[520px]">
              <SearchBox
                key={query.q ?? ""}
                onSearch={(value) => replaceParams({ q: value || null })}
                value={query.q}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground sm:flex-row sm:flex-wrap sm:items-end xl:flex-nowrap xl:justify-end">
              <DateFilterField
                label="Início de"
                max={query.to}
                onChange={(value) => handleStartDateFilterChange("from", value)}
                value={query.from}
              />
              <DateFilterField
                label="Início até"
                min={query.from}
                onChange={(value) => handleStartDateFilterChange("to", value)}
                value={query.to}
              />
              <StatusFilterField
                onChange={(value) => replaceParams({ status: value === "all" ? null : value })}
                value={query.status}
              />
              {hasTableFilters ? (
                <button
                  className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-surface px-5 text-sm font-semibold text-foreground shadow-control transition hover:border-primary hover:text-primary"
                  onClick={clearTableFilters}
                  type="button"
                >
                  Limpar
                </button>
              ) : null}
            </div>
          </div>
        </div>
        {subscriptionsQuery.isLoading ? <LoadingState /> : null}
        {subscriptionsQuery.isError && queryError ? (
          <div className="p-4">
            <ErrorState message={queryError} onRetry={() => void subscriptionsQuery.refetch()} />
          </div>
        ) : null}
        {summary && items.length === 0 ? <EmptyState /> : null}
        {summary && items.length > 0 ? <SubscriptionsTable items={items} /> : null}

        {summary ? (
          <div className="flex flex-col gap-4 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => replaceParams({ page: page - 1 }, { resetPage: false })}
                type="button"
              >
                <ChevronLeft aria-hidden className="h-4 w-4" />
                <span className="sr-only">Página anterior</span>
              </button>
              {pageNumbers(page, pages).map((number) => (
                <button
                  aria-current={number === page ? "page" : undefined}
                  className={cn(
                    "grid h-10 min-w-10 place-items-center rounded-2xl border border-border bg-surface px-3 text-sm font-semibold text-foreground",
                    number === page && "border-primary bg-primary text-white",
                  )}
                  key={number}
                  onClick={() => replaceParams({ page: number }, { resetPage: false })}
                  type="button"
                >
                  {number}
                </button>
              ))}
              <button
                className="grid h-10 w-10 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-40"
                disabled={page >= pages}
                onClick={() => replaceParams({ page: page + 1 }, { resetPage: false })}
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
                onChange={(event) =>
                  replaceParams(
                    { limit: Number(event.target.value), page: 1 },
                    { resetPage: false },
                  )
                }
                value={summary.per_page}
              >
                {LIST_LIMIT_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
      </CardShell>
    </div>
  );
};
