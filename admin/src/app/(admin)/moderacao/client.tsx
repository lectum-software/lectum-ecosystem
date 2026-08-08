"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useAdminCommunitiesList } from "@/api/callers/communities";
import {
  useAdminModerationEvent,
  useAdminModerationEvents,
  useAdminModerationReview,
  useAdminModerationSummary,
} from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import type {
  AdminModerationEvent,
  AdminModerationEventDetail,
  AdminModerationEventsQuery,
} from "@/api/req/moderation";
import { cn } from "@/lib/utils";
import { DetailDialog } from "./components/detail";
import { ContentSensitiveEventsTable } from "./components/events-table";

import { Card, FiltersBar, Header } from "./components/header-filters";

import { ErrorState, RemoveModal, ResolveModal } from "./components/modals";
import {
  areTextualFiltersEqual,
  cardClass,
  EVENT_LIMIT,
  type Filters,
  initialFilters,
  normalizeTextualFilters,
  textualFiltersSchema,
} from "./modules/moderation-support";
import { ModerationOverviewCharts } from "./overview-charts";

export const AdminModerationClient = ({ mode = "overview" }: { mode?: "overview" | "textual" }) => {
  const isTextualPage = mode === "textual";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [appliedTextualFilters, setAppliedTextualFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const [selectedOverrideId, setSelectedOverrideId] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<AdminModerationEventDetail | null>(null);
  const [removeTarget, setRemoveTarget] = useState<AdminModerationEventDetail | null>(null);
  const filtersForm = useForm<Filters>({
    defaultValues: initialFilters,
    mode: "onChange",
    resolver: zodResolver(textualFiltersSchema),
  });
  const communitiesInput = useMemo(() => ({ limit: 50, page: 1, sort: "name" as const }), []);
  const communities = useAdminCommunitiesList(communitiesInput, { enabled: isTextualPage });
  const communityOptions = useMemo(
    () => [
      { label: "Todas", value: "all" },
      ...(communities.data?.data ?? []).map((community) => ({
        label: community.name,
        value: community.id,
      })),
    ],
    [communities.data?.data],
  );
  const watchedTextualAutoFilters = useWatch({
    control: filtersForm.control,
    name: ["status", "decision", "community"],
  });
  const watchedTextualAutoFiltersKey = watchedTextualAutoFilters.join("|");
  const latestAppliedTextualFiltersRef = useRef(appliedTextualFilters);
  const summary = useAdminModerationSummary();
  const eventsInput: AdminModerationEventsQuery = useMemo(
    () => ({
      community: appliedTextualFilters.community.trim() || "all",
      decision: appliedTextualFilters.decision,
      from: appliedTextualFilters.from,
      limit: EVENT_LIMIT,
      page,
      status: appliedTextualFilters.status,
      to: appliedTextualFilters.to,
    }),
    [appliedTextualFilters, page],
  );
  const events = useAdminModerationEvents(eventsInput);
  const selectedId = isTextualPage
    ? (selectedOverrideId ?? searchParams.get("event") ?? null)
    : null;
  const detail = useAdminModerationEvent(selectedId);
  const review = useAdminModerationReview();
  const firstError = isTextualPage ? (events.error ?? communities.error) : summary.error;

  useEffect(() => {
    latestAppliedTextualFiltersRef.current = appliedTextualFilters;
  }, [appliedTextualFilters]);

  const applyCurrentTextualFilters = useCallback(
    async ({ includeDateDraft = false }: { includeDateDraft?: boolean } = {}) => {
      if (!isTextualPage) return;

      if (includeDateDraft) {
        const validDates = await filtersForm.trigger(["from", "to"], { shouldFocus: false });
        if (!validDates) return;
      }

      const current = normalizeTextualFilters(filtersForm.getValues());
      const normalized = includeDateDraft
        ? current
        : {
            ...current,
            from: latestAppliedTextualFiltersRef.current.from,
            to: latestAppliedTextualFiltersRef.current.to,
          };

      if (areTextualFiltersEqual(latestAppliedTextualFiltersRef.current, normalized)) return;

      setAppliedTextualFilters(normalized);
      setPage(1);
    },
    [filtersForm, isTextualPage],
  );

  const handleTextualDateBlur = useCallback(() => {
    void applyCurrentTextualFilters({ includeDateDraft: true });
  }, [applyCurrentTextualFilters]);

  useEffect(() => {
    if (!isTextualPage) return;
    void watchedTextualAutoFiltersKey;

    const timeout = window.setTimeout(() => {
      void applyCurrentTextualFilters();
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [applyCurrentTextualFilters, isTextualPage, watchedTextualAutoFiltersKey]);

  const selectEvent = (event: AdminModerationEvent) => {
    if (!isTextualPage) {
      router.push(`/moderacao/conteudo-sensivel?event=${encodeURIComponent(event.id)}`);
      return;
    }

    setSelectedOverrideId(event.id);
    const params = new URLSearchParams(searchParams.toString());
    params.set("event", event.id);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
  const closeSelectedEvent = useCallback(() => {
    setSelectedOverrideId(null);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("event");
    const nextSearch = params.toString();

    router.replace(nextSearch ? `${pathname}?${nextSearch}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
  const markReviewing = async (event: AdminModerationEventDetail) => {
    try {
      await review.mutateAsync(event.id);
      toast.success("Evento marcado em revisão.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="space-y-6">
      <Header
        description={
          isTextualPage
            ? "Posts e comentários potencialmente sensíveis identificados automaticamente para moderação."
            : undefined
        }
        eyebrow={isTextualPage ? "Moderação" : undefined}
        pendingCount={isTextualPage ? summary.data?.pending_total : undefined}
        pendingCountLoading={isTextualPage && summary.isFetching}
        title={isTextualPage ? "Conteúdo sensível" : undefined}
      />
      {firstError ? (
        <ErrorState
          error={firstError}
          onRetry={() => {
            void summary.refetch();
            void events.refetch();
            if (isTextualPage) void communities.refetch();
          }}
        />
      ) : null}
      {!isTextualPage && summary.isLoading ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {["reports", "compliance", "operational", "textual"].map((key) => (
              <Card className="h-36 animate-pulse bg-surface-muted" key={key} />
            ))}
          </div>
          <Card className="h-80 animate-pulse bg-surface-muted" />
        </>
      ) : !isTextualPage && summary.data ? (
        <ModerationOverviewCharts summary={summary.data} />
      ) : null}
      {isTextualPage ? (
        <section className={cn(cardClass, "overflow-hidden")}>
          <FiltersBar
            communitiesLoading={communities.isLoading}
            communityOptions={communityOptions}
            disabled={events.isLoading}
            form={filtersForm}
            isFetching={events.isFetching}
            onDateBlur={handleTextualDateBlur}
            resultCount={events.data?.count ?? 0}
          />
          <ContentSensitiveEventsTable
            events={events.data?.data ?? []}
            loading={events.isLoading}
            onNext={() => setPage((current) => current + 1)}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onSelect={selectEvent}
            page={events.data?.page ?? page}
            pages={events.data?.pages ?? 1}
            selectedId={selectedId}
          />
        </section>
      ) : null}
      {isTextualPage && selectedId ? (
        <DetailDialog
          error={detail.error}
          event={detail.data}
          loading={detail.isLoading}
          onClose={closeSelectedEvent}
          onRemove={setRemoveTarget}
          onResolve={setResolveTarget}
          onReview={markReviewing}
          reviewPending={review.isPending}
        />
      ) : null}
      {resolveTarget ? (
        <ResolveModal event={resolveTarget} onClose={() => setResolveTarget(null)} />
      ) : null}
      {removeTarget ? (
        <RemoveModal event={removeTarget} onClose={() => setRemoveTarget(null)} />
      ) : null}
    </div>
  );
};
