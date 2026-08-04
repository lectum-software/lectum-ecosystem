"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAdminFinanceCharges } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type { FinanceChargeItem, FinanceListQuery, FinancePeriodValue } from "@/api/req/finance";
import { cn } from "@/lib/utils";

type DateFilterDraft = {
  from: string;
  to: string;
};

type DateFilterFieldName = keyof DateFilterDraft;
type DateFilterDraftUpdate = DateFilterDraft | ((current: DateFilterDraft) => DateFilterDraft);

const LIST_LIMIT_OPTIONS = [10, 20, 50];
const SEARCH_DEBOUNCE_MS = 350;
const FINANCE_FILTER_MIN_YEAR = 1900;
const FINANCE_FILTER_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const validPeriods = new Set<FinancePeriodValue>([
  "all",
  "custom",
  "month",
  "today",
  "week",
  "year",
  "7d",
  "30d",
  "90d",
]);
const statusFilterOptions = [
  { label: "Todos os status", value: "all" },
  { label: "Confirmadas", value: "confirmed" },
] as const;
const validChargeStatuses = new Set<string>(statusFilterOptions.map((option) => option.value));
const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});
const numberFormatter = new Intl.NumberFormat("pt-BR");

const parsePositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.floor(parsed);
};

const isCompleteFinanceFilterDate = (value?: string | null): value is string => {
  if (!value || !FINANCE_FILTER_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  if (year < FINANCE_FILTER_MIN_YEAR) return false;

  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const parseQuery = (params: URLSearchParams): FinanceListQuery => {
  const period = params.get("period") as FinancePeriodValue | null;
  const q = params.get("q");
  const status = params.get("status");
  const from = params.get("from");
  const to = params.get("to");
  const validFrom = isCompleteFinanceFilterDate(from) ? from : undefined;
  const validTo = isCompleteFinanceFilterDate(to) ? to : undefined;
  const hasValidRange = Boolean(validFrom && validTo);
  const validPeriod = period && validPeriods.has(period) ? period : "all";

  return {
    from: hasValidRange ? validFrom : undefined,
    limit: Math.min(50, parsePositiveNumber(params.get("limit"), 20)),
    page: parsePositiveNumber(params.get("page"), 1),
    period: validPeriod === "custom" && !hasValidRange ? "all" : validPeriod,
    q: q || undefined,
    status: status && validChargeStatuses.has(status) && status !== "all" ? status : undefined,
    to: hasValidRange ? validTo : undefined,
  };
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));

const formatMoney = (cents: number | null) =>
  cents === null ? "Indisponível" : moneyFormatter.format(cents / 100);

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
      <span className="sr-only">Buscar por psicólogo, e-mail ou identificador</span>
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
  onCommit,
  value,
}: {
  label: string;
  max?: string;
  min?: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  value?: string;
}) => {
  const invalidDraft = Boolean(value && !isCompleteFinanceFilterDate(value));

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    event.preventDefault();
    onCommit();
    event.currentTarget.blur();
  };

  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[150px]">
      {label}
      <input
        aria-invalid={invalidDraft || undefined}
        className="h-12 w-full min-w-0 rounded-full border border-border bg-surface px-4 py-0 text-sm font-medium text-foreground shadow-control outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15"
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        title="Informe a data completa para aplicar o filtro."
        type="date"
        value={value || ""}
      />
    </label>
  );
};

const StatusFilterField = ({
  onChange,
  value,
}: {
  onChange: (value: string) => void;
  value?: string;
}) => (
  <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-muted sm:min-w-[170px]">
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
      .toUpperCase() || "CB";

  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-black text-primary">
      {initials}
    </span>
  );
};

const ChargeStatusBadge = ({ item }: { item: FinanceChargeItem }) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2 py-1 text-xs font-black",
      item.amount_available ? "bg-emerald-50 text-success" : "bg-yellow-50 text-yellow-700",
    )}
  >
    {item.status_label}
  </span>
);

const IdentifierLine = ({
  className,
  label,
  value,
}: {
  className?: string;
  label: string;
  value: number | string;
}) => (
  <p
    className={cn("min-w-0 break-all text-[11px] font-semibold leading-5 text-muted", className)}
    title={`${label}: ${value}`}
  >
    <span>{label}: </span>
    <code className="font-mono text-foreground">{value}</code>
  </p>
);

const formatChargeSubscriptionPlanState = (item: FinanceChargeItem) => {
  if (!item.subscription) return "—";
  if (item.subscription.status === "ativa") return "Ativo";

  return item.subscription.status_label;
};

const ChargeSubscriptionIdentifier = ({ item }: { item: FinanceChargeItem }) => {
  if (!item.subscription) {
    return <IdentifierLine className="mt-1" label="ID" value="—" />;
  }

  return (
    <div className="mt-1">
      <IdentifierLine label="ID" value={item.subscription.internal_id} />
    </div>
  );
};

const ErrorState = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <CardShell className="p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Não foi possível carregar as cobranças</h2>
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
    {["charge-loading-1", "charge-loading-2", "charge-loading-3"].map((key) => (
      <div className="h-24 animate-pulse rounded-3xl bg-surface-muted" key={key} />
    ))}
  </div>
);

const EmptyState = () => (
  <div className="rounded-3xl border border-dashed border-border bg-surface-muted p-8 text-center">
    <CreditCard aria-hidden className="mx-auto h-10 w-10 text-primary" />
    <h2 className="mt-3 text-lg font-semibold text-foreground">
      Nenhuma cobrança confirmada encontrada
    </h2>
    <p className="mt-1 text-sm text-muted">
      A lista usa somente payment_event real do Mercado Pago com status confirmado.
    </p>
  </div>
);

const pageNumbers = (current: number, pages: number) => {
  const window = new Set([1, pages, current - 1, current, current + 1, current + 2]);

  return [...window]
    .filter((value) => value >= 1 && value <= pages)
    .sort((left, right) => left - right);
};

const ChargesTable = ({ items }: { items: FinanceChargeItem[] }) => (
  <>
    <div className="grid gap-3 p-4 lg:hidden">
      {items.map((item) => (
        <article className="rounded-3xl border border-border bg-surface p-4" key={item.event_id}>
          <div className="flex items-start gap-3">
            <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-black text-foreground">
                  {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                </h3>
                <ChargeStatusBadge item={item} />
              </div>
              <p className="truncate text-xs font-bold text-muted">
                {item.subscription?.psychologist.email ?? "Sem vínculo local"}
              </p>
              <IdentifierLine className="mt-2" label="ID" value={item.internal_id} />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="font-semibold text-muted">Data</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatDateTime(item.occurred_at)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-muted">Valor</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {formatMoney(item.amount_cents)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="font-semibold text-muted">Assinatura</dt>
                  <dd className="mt-1 font-bold text-foreground">
                    {item.subscription?.plan.name ?? "Não identificado"}
                  </dd>
                  <p className="mt-1 text-muted">{formatChargeSubscriptionPlanState(item)}</p>
                  <ChargeSubscriptionIdentifier item={item} />
                </div>
              </dl>
            </div>
          </div>
        </article>
      ))}
    </div>

    <div className="hidden overflow-x-auto lg:block">
      <table className="w-full min-w-[1080px] text-left text-sm">
        <caption className="sr-only">Relação completa de cobranças confirmadas</caption>
        <thead className="border-b border-border text-xs font-bold uppercase tracking-[0.08em] text-muted">
          <tr>
            <th className="px-5 py-4">Data</th>
            <th className="px-5 py-4">ID</th>
            <th className="px-5 py-4">Psicólogo</th>
            <th className="px-5 py-4">Assinatura</th>
            <th className="px-5 py-4">Valor</th>
            <th className="px-5 py-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => (
            <tr className="transition hover:bg-primary-soft/35" key={item.event_id}>
              <td className="whitespace-nowrap px-5 py-4 text-muted">
                {formatDateTime(item.occurred_at)}
              </td>
              <td className="max-w-[210px] px-5 py-4">
                <IdentifierLine label="ID" value={item.internal_id} />
              </td>
              <td className="px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <InitialsAvatar name={item.subscription?.psychologist.name ?? "Cobrança"} />
                  <div className="min-w-0">
                    <p className="truncate font-black text-foreground">
                      {item.subscription?.psychologist.name ?? "Assinatura não vinculada"}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {item.subscription?.psychologist.email ?? "Sem vínculo local"}
                    </p>
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <p className="font-black text-foreground">
                  {item.subscription?.plan.name ?? "Não identificado"}
                </p>
                <p className="text-xs text-muted">{formatChargeSubscriptionPlanState(item)}</p>
                <ChargeSubscriptionIdentifier item={item} />
              </td>
              <td className="whitespace-nowrap px-5 py-4 font-black text-foreground">
                {formatMoney(item.amount_cents)}
              </td>
              <td className="px-5 py-4">
                <ChargeStatusBadge item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </>
);

export const AdminFinanceChargesClient = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const query = useMemo(() => parseQuery(new URLSearchParams(searchString)), [searchString]);
  const dateQueryKey = `${query.from ?? ""}|${query.to ?? ""}`;
  const queryDateDraft = useMemo<DateFilterDraft>(
    () => ({ from: query.from ?? "", to: query.to ?? "" }),
    [query.from, query.to],
  );
  const [dateDraftState, setDateDraftState] = useState(() => ({
    key: dateQueryKey,
    range: queryDateDraft,
  }));
  const dateDraft = dateDraftState.key === dateQueryKey ? dateDraftState.range : queryDateDraft;
  const lastEditedDateFieldRef = useRef<DateFilterFieldName>("from");
  const chargesQuery = useAdminFinanceCharges(query);
  const queryError = chargesQuery.error ? resolveApiError(chargesQuery.error) : null;
  const summary = chargesQuery.data;
  const items = summary?.data ?? [];

  const setDateDraft = (update: DateFilterDraftUpdate) => {
    setDateDraftState((currentState) => {
      const currentRange = currentState.key === dateQueryKey ? currentState.range : queryDateDraft;
      const range = typeof update === "function" ? update(currentRange) : update;

      return { key: dateQueryKey, range };
    });
  };

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

    const from = params.get("from");
    const to = params.get("to");
    const hasDateParams = params.has("from") || params.has("to");
    const hasCompleteRange = isCompleteFinanceFilterDate(from) && isCompleteFinanceFilterDate(to);

    if (hasDateParams && !hasCompleteRange) {
      params.delete("from");
      params.delete("to");
      if (params.get("period") === "custom") params.set("period", "all");
    }

    if (options.resetPage !== false) params.delete("page");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const hasTableFilters = Boolean(query.q || query.status || query.from || query.to);
  const commitChargeDateFilters = () => {
    const hasIncompleteDraft =
      (dateDraft.from && !isCompleteFinanceFilterDate(dateDraft.from)) ||
      (dateDraft.to && !isCompleteFinanceFilterDate(dateDraft.to));

    if (hasIncompleteDraft) return;

    if (!dateDraft.from && !dateDraft.to) {
      replaceParams({ from: null, period: "all", to: null });
      return;
    }

    let nextFrom = dateDraft.from || dateDraft.to;
    let nextTo = dateDraft.to || dateDraft.from;

    if (nextFrom > nextTo) {
      if (lastEditedDateFieldRef.current === "from") nextTo = nextFrom;
      else nextFrom = nextTo;
    }

    replaceParams({ from: nextFrom, period: "custom", to: nextTo });
    setDateDraft({ from: nextFrom, to: nextTo });
  };
  const handleChargeDateDraftChange = (field: DateFilterFieldName, value: string) => {
    lastEditedDateFieldRef.current = field;
    setDateDraft((current) => ({ ...current, [field]: value }));
  };
  const handleDateFiltersBlur = (event: FocusEvent<HTMLDivElement>) => {
    const currentTarget = event.currentTarget;
    const nextFocusedElement = event.relatedTarget as Node | null;

    if (nextFocusedElement && currentTarget.contains(nextFocusedElement)) return;

    window.setTimeout(() => {
      const activeElement = document.activeElement;

      if (activeElement && currentTarget.contains(activeElement)) return;

      commitChargeDateFilters();
    }, 0);
  };
  const clearTableFilters = () => {
    setDateDraft({ from: "", to: "" });
    replaceParams({
      from: null,
      period: "all",
      q: null,
      status: null,
      to: null,
    });
  };

  const pages = summary?.pages ?? 1;
  const page = Math.min(query.page ?? 1, pages);

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <header className="rounded-card border border-border/70 bg-surface/90 p-5 shadow-admin-soft backdrop-blur md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Financeiro
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Cobranças
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted">
              Relação completa de cobranças confirmadas por eventos reais do Mercado Pago.
            </p>
          </div>
        </div>
      </header>

      <CardShell className="overflow-hidden">
        <div className="space-y-4 border-b border-border px-4 py-4">
          <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 xl:w-[360px] xl:max-w-[360px] xl:flex-none xl:pt-5">
              <SearchBox
                key={query.q ?? ""}
                onSearch={(value) => replaceParams({ q: value || null })}
                value={query.q}
              />
              <p className="mt-2 pl-1 text-sm font-semibold text-foreground">
                {summary ? numberFormatter.format(summary.count) : "—"} cobranças encontradas
              </p>
            </div>
            <div className="flex min-w-0 flex-col gap-2 text-sm font-medium text-foreground sm:flex-row sm:flex-wrap sm:items-end xl:flex-1 xl:justify-end">
              <div
                className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                onBlur={handleDateFiltersBlur}
              >
                <DateFilterField
                  label="Data de"
                  max={isCompleteFinanceFilterDate(dateDraft.to) ? dateDraft.to : undefined}
                  onChange={(value) => handleChargeDateDraftChange("from", value)}
                  onCommit={commitChargeDateFilters}
                  value={dateDraft.from}
                />
                <DateFilterField
                  label="Data até"
                  min={isCompleteFinanceFilterDate(dateDraft.from) ? dateDraft.from : undefined}
                  onChange={(value) => handleChargeDateDraftChange("to", value)}
                  onCommit={commitChargeDateFilters}
                  value={dateDraft.to}
                />
              </div>
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

        {chargesQuery.isLoading ? <LoadingState /> : null}
        {chargesQuery.isError && queryError ? (
          <div className="p-4">
            <ErrorState message={queryError} onRetry={() => void chargesQuery.refetch()} />
          </div>
        ) : null}
        {summary && items.length === 0 ? <EmptyState /> : null}
        {summary && items.length > 0 ? <ChargesTable items={items} /> : null}

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
