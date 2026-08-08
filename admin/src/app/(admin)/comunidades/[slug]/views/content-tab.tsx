"use client";
import { ChevronDown, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminCommunityContent } from "@/api/callers/communities";
import type { AdminCommunityContentQuery } from "@/api/req/communities";
import { cn } from "@/lib/utils";
import { ContentItemCard } from "../components/content-card";

import { PaginationControls, QueryStatus } from "../components/content-controls";
import {
  type ContentCustomRange,
  type ContentPeriodValue,
  type ContentSortValue,
  cardClass,
  contentPeriodOptions,
  contentSortOptions,
  contentTypeOptions,
  getContentRangeForPeriod,
  isValidContentRange,
  numberFormatter,
  parseContentPeriodParam,
  parseContentSortParam,
  parseContentTypeParam,
} from "../modules/detail-support";

export type ContentBaseQuery = Pick<
  AdminCommunityContentQuery,
  "limit" | "page" | "q" | "sort" | "type"
>;

export const ContentTab = ({ createdAt, slug }: { createdAt: string; slug: string }) => {
  const searchParams = useSearchParams();
  const initialSort = parseContentSortParam(searchParams.get("contentSort"));
  const initialType = parseContentTypeParam(searchParams.get("contentType"));
  const initialPeriod = parseContentPeriodParam(searchParams.get("contentPeriod"));
  const initialRange = useMemo(
    () => getContentRangeForPeriod(initialPeriod, createdAt),
    [createdAt, initialPeriod],
  );
  const [query, setQuery] = useState<ContentBaseQuery>({
    limit: 10,
    page: 1,
    q: "",
    sort: initialSort,
    type: initialType,
  });
  const [selectedPeriod, setSelectedPeriod] = useState<ContentPeriodValue>(initialPeriod);
  const [appliedPeriod, setAppliedPeriod] = useState<ContentPeriodValue>(initialPeriod);
  const [draftRange, setDraftRange] = useState<ContentCustomRange>(initialRange);
  const [appliedRange, setAppliedRange] = useState<ContentCustomRange>(initialRange);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const contentQueryInput = useMemo<AdminCommunityContentQuery>(
    () => ({
      ...query,
      from: appliedPeriod === "custom" ? appliedRange.from : undefined,
      period: appliedPeriod,
      to: appliedPeriod === "custom" ? appliedRange.to : undefined,
    }),
    [appliedPeriod, appliedRange.from, appliedRange.to, query],
  );
  const result = useAdminCommunityContent(slug, contentQueryInput);

  const updateQuery = (patch: Partial<ContentBaseQuery>) => {
    setQuery((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };
  const handlePeriodChange = (period: ContentPeriodValue) => {
    setSelectedPeriod(period);
    setRangeError(null);
    updateQuery({});

    if (period === "custom") {
      if (!isValidContentRange(draftRange)) {
        setRangeError(
          "Informe um período personalizado completo, com data inicial menor ou igual à final.",
        );
        return;
      }

      setAppliedPeriod("custom");
      setAppliedRange(draftRange);
      return;
    }

    const nextRange = getContentRangeForPeriod(period, createdAt);
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setAppliedPeriod(period);
  };
  const handleCustomDateChange = (field: keyof ContentCustomRange, value: string) => {
    const nextRange = { ...draftRange, [field]: value };

    setSelectedPeriod("custom");
    setDraftRange(nextRange);
    updateQuery({});

    if (!isValidContentRange(nextRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(nextRange);
  };

  return (
    <div className="space-y-5">
      <section className={cn(cardClass, "p-5")}>
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.95fr_0.85fr_0.65fr_0.65fr]">
          <label className="block text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
                onChange={(event) => updateQuery({ q: event.target.value })}
                placeholder="Texto, título ou autor"
                type="search"
                value={query.q ?? ""}
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-type">
            Tipo
            <span className="relative mt-2 block">
              <select
                className="h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-12 text-sm font-bold text-foreground"
                id="community-content-type"
                onChange={(event) =>
                  updateQuery({ type: event.target.value as AdminCommunityContentQuery["type"] })
                }
                value={query.type ?? "all"}
              >
                {contentTypeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-period">
            Período
            <span className="relative mt-2 block">
              <select
                className="h-11 w-full appearance-none rounded-control border border-border bg-surface px-3 pr-12 text-sm font-bold text-foreground"
                id="community-content-period"
                onChange={(event) => handlePeriodChange(event.target.value as ContentPeriodValue)}
                value={selectedPeriod}
              >
                {selectedPeriod === "custom" ? (
                  <option disabled hidden value="custom">
                    Personalizado
                  </option>
                ) : null}
                {contentPeriodOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-from">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              id="community-content-from"
              max={draftRange.to}
              onChange={(event) => handleCustomDateChange("from", event.target.value)}
              type="date"
              value={draftRange.from ?? ""}
            />
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="community-content-to">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              id="community-content-to"
              min={draftRange.from}
              onChange={(event) => handleCustomDateChange("to", event.target.value)}
              type="date"
              value={draftRange.to ?? ""}
            />
          </label>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </section>

      <section className={cn(cardClass, "p-5")}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-foreground">Conteúdo da comunidade</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(result.data?.data.length ?? 0)} de{" "}
              {numberFormatter.format(result.data?.count ?? 0)} registros.
            </p>
          </div>
          <label
            className="relative flex h-11 w-full cursor-pointer items-center gap-2 rounded-control border border-border bg-surface px-3 pr-10 text-xs font-black text-muted transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:w-64"
            htmlFor="community-content-sort"
          >
            <span className="shrink-0">Ordenar</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
              {contentSortOptions.find((option) => option.id === (query.sort ?? "engagement"))
                ?.label ?? "Mais populares"}
            </span>
            <select
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-control bg-transparent opacity-0 outline-none"
              id="community-content-sort"
              onChange={(event) => updateQuery({ sort: event.target.value as ContentSortValue })}
              value={query.sort ?? "engagement"}
            >
              {contentSortOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            />
          </label>
        </div>
        <div className="mt-5 space-y-3">
          <QueryStatus
            error={result.error}
            loading={result.isLoading}
            onRetry={() => void result.refetch()}
          />
          {result.data?.data.length === 0 ? (
            <p className="rounded-2xl bg-surface-muted p-4 text-sm text-muted">
              Nenhum conteúdo encontrado com os filtros atuais.
            </p>
          ) : null}
          {result.data?.data.map((item) => (
            <ContentItemCard item={item} key={`${item.type}-${item.content_id}`} slug={slug} />
          ))}
        </div>
        {result.data ? (
          <div className="mt-5">
            <PaginationControls
              page={result.data.page}
              pages={result.data.pages}
              setPage={(page) => updateQuery({ page })}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
};
