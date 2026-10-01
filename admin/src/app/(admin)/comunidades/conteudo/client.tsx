"use client";

import { FileText, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAdminGlobalContent } from "@/api/callers/communities/global-content";
import type {
  AdminGlobalContentItem,
  AdminGlobalContentQuery,
} from "@/api/req/communities/global-content";
import { AdminPagination } from "@/components/admin-shell/pagination";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import styles from "./content.module.css";
import { ContentRow } from "./content-row";
import {
  type ContentFilters,
  ContentFiltersForm,
  contentFiltersSchema,
  defaultFilters,
} from "./filters";

const dayFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

export function GlobalContentClient() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const parsed = contentFiltersSchema.safeParse(
    Object.fromEntries(
      Object.entries(defaultFilters).map(([key, value]) => [key, params.get(key) ?? value]),
    ),
  );
  const filters = parsed.success ? parsed.data : defaultFilters;
  const page = Math.min(100000, Math.max(1, Number(params.get("page")) || 1));
  const limit = [8, 12, 20, 50].includes(Number(params.get("limit")))
    ? Number(params.get("limit"))
    : 20;
  const query: AdminGlobalContentQuery = {
    ...filters,
    community: filters.community || undefined,
    from: filters.period === "custom" ? filters.from : undefined,
    to: filters.period === "custom" ? filters.to : undefined,
    page: Math.floor(page),
    limit,
  };
  const result = useAdminGlobalContent(query);
  const data = result.isSuccess ? result.data : undefined;
  const update = (next: ContentFilters, nextPage = 1, nextLimit = limit) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (
        value &&
        value !== defaultFilters[key as keyof ContentFilters] &&
        (!(key === "from" || key === "to") || next.period === "custom")
      )
        search.set(key, value);
    }
    if (nextPage > 1) search.set("page", String(nextPage));
    if (nextLimit !== 20) search.set("limit", String(nextLimit));
    router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { scroll: false });
  };
  const groups = new Map<string, AdminGlobalContentItem[]>();
  for (const item of data?.data ?? []) {
    const date = dayFormatter.format(new Date(item.created_at));
    groups.set(date, [...(groups.get(date) ?? []), item]);
  }

  return (
    <div className={`${styles.content} admin-content-library`}>
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Conteúdo</h1>
          <p className="mt-1 text-sm text-muted">Posts e respostas dos psicólogos</p>
        </div>
        <button
          aria-label="Atualizar conteúdo"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-surface hover:text-primary disabled:opacity-50"
          disabled={result.isFetching}
          onClick={() => void result.refetch()}
          title="Atualizar"
          type="button"
        >
          <RefreshCw aria-hidden className={`h-4 w-4 ${result.isFetching ? "animate-spin" : ""}`} />
        </button>
      </header>
      <ContentFiltersForm
        communities={data?.communities ?? []}
        initial={filters}
        key={JSON.stringify(filters)}
        onApply={(next) => update(next)}
      />
      <section aria-busy={result.isFetching} aria-label="Conteúdo dos psicólogos" className="pt-5">
        <p aria-live="polite" className="mb-4 text-sm text-muted">
          {data
            ? `${new Intl.NumberFormat("pt-BR").format(data.count)} ${data.count === 1 ? "conteúdo encontrado" : "conteúdos encontrados"}`
            : result.isLoading
              ? "Carregando conteúdo..."
              : ""}
        </p>
        {result.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div aria-hidden className="h-44 animate-pulse rounded-lg bg-surface" key={item} />
            ))}
          </div>
        ) : null}
        {result.isError ? (
          <AdminQueryErrorState
            error={result.error}
            onRetry={() => void result.refetch()}
            title="Não foi possível carregar o conteúdo"
          />
        ) : null}
        {data?.count === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText aria-hidden className="h-8 w-8 text-muted" />
            <h2 className="text-lg font-semibold">Nenhum conteúdo encontrado</h2>
            <p className="text-sm text-muted">Tente outro nome, comunidade ou período.</p>
          </div>
        ) : null}
        <div className="space-y-6">
          {[...groups].map(([date, items]) => (
            <section key={date}>
              <h2 className="mb-3 text-base font-semibold">{date}</h2>
              <div className="overflow-hidden rounded-lg border border-border">
                {items.map((item) => (
                  <ContentRow item={item} key={`${item.type}:${item.content_id}`} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {data && data.count > 0 ? (
          <div className="mt-5">
            <AdminPagination
              onChangePage={(value) => update(filters, value)}
              onLimit={(value) => update(filters, 1, value)}
              page={data.page}
              pages={data.pages}
              perPage={data.per_page}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
