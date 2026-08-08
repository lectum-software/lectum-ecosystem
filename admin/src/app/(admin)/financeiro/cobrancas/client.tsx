"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FocusEvent, useMemo, useRef, useState } from "react";
import { useAdminFinanceCharges } from "@/api/callers/finance";
import { resolveApiError } from "@/api/handle";
import type { FinanceListQuery } from "@/api/req/finance";
import { cn } from "@/lib/utils";
import { CardShell, DateFilterField, SearchBox, StatusFilterField } from "./components/filters";
import {
  ChargesTable,
  EmptyState,
  ErrorState,
  LoadingState,
  pageNumbers,
} from "./components/table";
import {
  type DateFilterDraft,
  type DateFilterDraftUpdate,
  type DateFilterFieldName,
  isCompleteFinanceFilterDate,
  LIST_LIMIT_OPTIONS,
  numberFormatter,
  parseQuery,
} from "./modules/charge-support";

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
              Relação completa de cobranças confirmadas pelo Mercado Pago.
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
                    number === page && "border-primary bg-primary text-primary-foreground",
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
