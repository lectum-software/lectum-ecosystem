"use client";

import { BarChart3, ChevronDown, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import Link from "next/link";
import { type ReactNode, useMemo, useState } from "react";
import { useAdminPsychologistPublications } from "@/api/callers/psychologists";
import { resolveApiError } from "@/api/handle";
import type { AdminPsychologistPublicationsQuery } from "@/api/req/psychologists";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { cn } from "@/lib/utils";
import { CardShell, ErrorState } from "../../components/shared";
import type {
  PublicationSortValue,
  PublicationsCustomRange,
  PublicationsPeriodPreset,
  PublicationsPeriodValue,
} from "../../support/config";
import {
  numberFormatter,
  PUBLICATIONS_PERIOD_OPTIONS,
  PUBLICATIONS_SORT_OPTIONS,
} from "../../support/config";
import { getStatisticsRangeForPeriod, isValidStatisticsRange } from "../../support/date-period";
import { publicationAdminDetailHref } from "../../support/media";
import { EngagementLoadingState } from "../statistics/common";
import { PublicationItemMain, PublicationMetrics } from "./media";

export const PublicationsPagination = ({
  page,
  pages,
  setPage,
}: {
  page: number;
  pages: number;
  setPage: (page: number) => void;
}) => (
  <div className="flex flex-wrap items-center justify-center gap-2">
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page <= 1}
      onClick={() => setPage(Math.max(1, page - 1))}
      type="button"
    >
      <ChevronLeft aria-hidden className="h-4 w-4" />
    </button>
    {Array.from({ length: Math.min(5, pages) }, (_, index) => {
      const start = Math.min(Math.max(page - 2, 1), Math.max(pages - 4, 1));
      const itemPage = start + index;
      if (itemPage > pages) return null;

      return (
        <button
          className={cn(
            "h-10 min-w-10 rounded-control border px-3 text-sm font-black",
            itemPage === page
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-surface text-foreground",
          )}
          key={itemPage}
          onClick={() => setPage(itemPage)}
          type="button"
        >
          {itemPage}
        </button>
      );
    })}
    <button
      className="grid h-10 w-10 place-items-center rounded-control border border-border bg-surface text-foreground disabled:opacity-40"
      disabled={page >= pages}
      onClick={() => setPage(Math.min(pages, page + 1))}
      type="button"
    >
      <ChevronRight aria-hidden className="h-4 w-4" />
    </button>
  </div>
);

const PublicationFilterSelect = ({
  children,
  id,
  onChange,
  value,
}: {
  children: ReactNode;
  id: string;
  onChange: (value: string) => void;
  value: string;
}) => (
  <span className="relative mt-2 block">
    <select
      className="h-11 w-full appearance-none rounded-control border border-border bg-surface py-0 pl-3 pr-14 text-sm font-bold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      id={id}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
    <ChevronDown
      aria-hidden
      className="pointer-events-none absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground"
    />
  </span>
);

export const PublicationsTab = ({ createdAt, id }: { createdAt: string; id: string }) => {
  const [q, setQ] = useState("");
  const [community, setCommunity] = useState("all");
  const [type, setType] = useState<AdminPsychologistPublicationsQuery["type"]>("all");
  const [sort, setSort] = useState<PublicationSortValue>("engagement");
  const [selectedPeriod, setSelectedPeriod] = useState<PublicationsPeriodValue>("all");
  const [appliedPeriod, setAppliedPeriod] = useState<PublicationsPeriodValue>("all");
  const [draftRange, setDraftRange] = useState<PublicationsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [appliedRange, setAppliedRange] = useState<PublicationsCustomRange>(() =>
    getStatisticsRangeForPeriod("all", createdAt),
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const queryInput = useMemo<AdminPsychologistPublicationsQuery>(
    () => ({
      community: community === "all" ? undefined : community,
      from: appliedPeriod === "custom" ? appliedRange.from : undefined,
      limit: 5,
      page,
      period: appliedPeriod,
      q: q || undefined,
      sort,
      to: appliedPeriod === "custom" ? appliedRange.to : undefined,
      type,
    }),
    [appliedPeriod, appliedRange.from, appliedRange.to, community, page, q, sort, type],
  );
  const query = useAdminPsychologistPublications(id, queryInput);
  const errorMessage = query.error ? resolveApiError(query.error) : null;
  const resetToFirstPage = () => {
    setPage(1);
  };
  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
  };
  const handlePeriodChange = (period: PublicationsPeriodPreset) => {
    const nextRange = getStatisticsRangeForPeriod(period, createdAt);

    setSelectedPeriod(period);
    setRangeError(null);
    resetToFirstPage();
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setAppliedPeriod(period);
  };
  const handleCustomDateChange = (field: keyof PublicationsCustomRange, value: string) => {
    const nextRange = { ...draftRange, [field]: value };

    setSelectedPeriod("custom");
    setDraftRange(nextRange);
    resetToFirstPage();

    if (!isValidStatisticsRange(nextRange)) {
      setRangeError(
        "Informe um período personalizado completo, com data inicial menor ou igual à final.",
      );
      return;
    }

    setRangeError(null);
    setAppliedPeriod("custom");
    setAppliedRange(nextRange);
  };

  if (query.isLoading) return <EngagementLoadingState rows={2} />;
  if (query.isError && errorMessage) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />;
  }
  if (!query.data) return null;

  const publications = query.data;

  return (
    <div className="space-y-5" data-psychologist-detail-tab="publicacoes">
      <CardShell className="p-4">
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.9fr_0.75fr_0.9fr_0.8fr_0.8fr]">
          <label className="block text-sm font-black text-muted">
            Buscar
            <span className="mt-2 flex h-11 items-center gap-2 rounded-control border border-border bg-surface px-3">
              <Search aria-hidden className="h-4 w-4 text-muted" />
              <input
                className="w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:text-subtle"
                onChange={(event) => {
                  setQ(event.target.value);
                  resetToFirstPage();
                }}
                placeholder="Título ou conteúdo"
                type="search"
                value={q}
              />
            </span>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-community">
            Comunidade
            <PublicationFilterSelect
              id="publications-community"
              onChange={(value) => {
                setCommunity(value);
                resetToFirstPage();
              }}
              value={community}
            >
              <option value="all">Todas</option>
              {publications.filters.communities.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-type">
            Tipo
            <PublicationFilterSelect
              id="publications-type"
              onChange={(value) => {
                setType(value as AdminPsychologistPublicationsQuery["type"]);
                resetToFirstPage();
              }}
              value={type ?? "all"}
            >
              {publications.filters.types.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted" htmlFor="publications-period">
            Período
            <PublicationFilterSelect
              id="publications-period"
              onChange={(value) => handlePeriodChange(value as PublicationsPeriodPreset)}
              value={selectedPeriod}
            >
              {selectedPeriod === "custom" ? (
                <option disabled hidden value="custom">
                  Personalizado
                </option>
              ) : null}
              {PUBLICATIONS_PERIOD_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </PublicationFilterSelect>
          </label>
          <label className="block text-sm font-black text-muted">
            De
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              max={draftRange.to}
              onChange={(event) => handleCustomDateChange("from", event.target.value)}
              type="date"
              value={draftRange.from ?? ""}
            />
          </label>
          <label className="block text-sm font-black text-muted">
            Até
            <input
              className="mt-2 h-11 w-full rounded-control border border-border bg-surface px-3 text-sm font-bold text-foreground"
              min={draftRange.from}
              onChange={(event) => handleCustomDateChange("to", event.target.value)}
              type="date"
              value={draftRange.to ?? ""}
            />
          </label>
        </div>
        {rangeError ? <p className="mt-3 text-xs font-bold text-danger">{rangeError}</p> : null}
      </CardShell>

      <CardShell className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Publicações</h2>
            <p className="mt-1 text-sm text-muted">
              Mostrando {numberFormatter.format(publications.data.length)} de{" "}
              {numberFormatter.format(publications.count)} registros.
            </p>
          </div>
          <label
            className="relative flex h-11 w-full cursor-pointer items-center gap-2 rounded-control border border-border bg-transparent px-3 pr-10 text-xs font-black text-muted transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 sm:w-64"
            htmlFor="publications-sort"
          >
            <span className="shrink-0">Ordenar</span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
              {PUBLICATIONS_SORT_OPTIONS.find((option) => option.id === sort)?.label ??
                "Mais populares"}
            </span>
            <select
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-control bg-transparent opacity-0 outline-none"
              id="publications-sort"
              onChange={(event) => {
                setSort(event.target.value as PublicationSortValue);
                resetToFirstPage();
              }}
              value={sort}
            >
              {PUBLICATIONS_SORT_OPTIONS.map((option) => (
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

        {publications.data.length === 0 ? (
          <p className="p-5 text-sm font-bold text-muted">
            Nenhuma publicação encontrada para os filtros atuais.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {publications.data.map((item) => {
              const adminDetailHref = publicationAdminDetailHref(item);

              return (
                <article
                  className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-start"
                  key={`${item.type}-${item.id}`}
                >
                  <PublicationItemMain item={item} />
                  <div className="flex justify-end gap-2 lg:flex-col">
                    <Link
                      aria-label="Ver analytics da publicação no Admin"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-primary/30 text-primary transition hover:bg-primary-soft"
                      href={adminDetailHref}
                      title="Analytics"
                    >
                      <BarChart3 aria-hidden className="h-4 w-4" />
                      <span className="sr-only">Analytics</span>
                    </Link>
                    <Link
                      aria-label="Ver publicação no site"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-foreground transition hover:border-primary hover:text-primary"
                      href={toPublicFrontendHref(item.public_url)}
                      rel="noreferrer"
                      target="_blank"
                      title="Ver no site"
                    >
                      <Eye aria-hidden className="h-4 w-4" />
                      <span className="sr-only">Ver no site</span>
                    </Link>
                  </div>
                  <div className="lg:col-span-2">
                    <PublicationMetrics item={item} />
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="border-t border-border p-4">
          <PublicationsPagination
            page={publications.page}
            pages={publications.pages}
            setPage={handlePageChange}
          />
        </div>
      </CardShell>
    </div>
  );
};
