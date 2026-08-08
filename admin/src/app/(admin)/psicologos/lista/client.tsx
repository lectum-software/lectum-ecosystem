"use client";

import { ChevronRight, Filter, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminPsychologistsList } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { PsychologistsListQuery, PsychologistsListSort } from "@/api/req/psychologists";
import { AdminPagination } from "@/components/admin-shell/pagination";
import { cn } from "@/lib/utils";
import {
  ActiveFiltersSummary,
  buildActiveFilterItems,
  FilterPanel,
  SearchBox,
} from "./components/filters";
import { EmptyState, ErrorState, LoadingState, PsychologistsTable } from "./components/table";
import {
  CardShell,
  DEPRECATED_FILTER_KEYS,
  FILTER_KEYS,
  FILTER_MODAL_CLOSE_DELAY_MS,
  type FilterQueryKey,
  numberFormatter,
  parseQuery,
  SORT_OPTIONS,
} from "./modules/list-support";

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
    if (key === "profile_conversion" || key === "engagement")
      params.delete("profile_conversion_engagement");
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
            <AdminPagination
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
                  className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-control transition duration-200 ease-out hover:-translate-y-px hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
