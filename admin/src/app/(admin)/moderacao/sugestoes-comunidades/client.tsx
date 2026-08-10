"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Boxes, Clock3, Inbox, Layers3 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useAdminCommunitySuggestionArchive,
  useAdminCommunitySuggestionBlockCreate,
  useAdminCommunitySuggestionBlockUpdate,
  useAdminCommunitySuggestionMove,
  useAdminCommunitySuggestions,
} from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import type {
  AdminCommunitySuggestionBlockStatus,
  AdminCommunitySuggestionsQuery,
} from "@/api/req/moderation";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { cn } from "@/lib/utils";
import {
  BlockListEmptyState,
  CommunitySuggestionsFilters,
  CommunitySuggestionsList,
  CreateDemandBlockPanel,
  DemandBlockCard,
  EmptySuggestionsState,
  LoadingSkeleton,
  SummaryMetricCard,
} from "./components/community-suggestions-panels";
import {
  type CommunitySuggestionFiltersForm,
  type CreateBlockForm,
  cardClass,
  createBlockDefaultValues,
  createBlockSchema,
  filtersDefaultValues,
  filtersSchema,
  latestSuggestionLabel,
  numberFormatter,
  PAGE_LIMIT,
} from "./modules/community-suggestions-support";

const toQueryFilters = (
  values: CommunitySuggestionFiltersForm,
): Omit<AdminCommunitySuggestionsQuery, "limit" | "page"> => ({
  blockId: values.blockId,
  from: values.from,
  q: values.q.trim(),
  status: values.status,
  to: values.to,
  userRole: values.userRole,
});

const cleanBlockPayload = (values: CreateBlockForm) => ({
  description: values.description.trim() || null,
  title: values.title.trim(),
});

export const AdminCommunitySuggestionsClient = () => {
  const [page, setPage] = useState(1);
  const [appliedFilters, setAppliedFilters] =
    useState<CommunitySuggestionFiltersForm>(filtersDefaultValues);
  const filtersForm = useForm<CommunitySuggestionFiltersForm>({
    defaultValues: filtersDefaultValues,
    mode: "onSubmit",
    resolver: zodResolver(filtersSchema),
  });
  const createBlockForm = useForm<CreateBlockForm>({
    defaultValues: createBlockDefaultValues,
    mode: "onSubmit",
    resolver: zodResolver(createBlockSchema),
  });
  const queryInput = useMemo<AdminCommunitySuggestionsQuery>(
    () => ({
      limit: PAGE_LIMIT,
      page,
      ...toQueryFilters(appliedFilters),
    }),
    [appliedFilters, page],
  );
  const suggestionsQuery = useAdminCommunitySuggestions(queryInput);
  const createBlock = useAdminCommunitySuggestionBlockCreate();
  const updateBlock = useAdminCommunitySuggestionBlockUpdate();
  const moveSuggestion = useAdminCommunitySuggestionMove();
  const archiveSuggestion = useAdminCommunitySuggestionArchive();
  const busy =
    createBlock.isPending ||
    updateBlock.isPending ||
    moveSuggestion.isPending ||
    archiveSuggestion.isPending;
  const data = suggestionsQuery.data;
  const blocks = data?.blocks ?? [];
  const suggestions = data?.suggestions ?? [];

  const applyFilters = filtersForm.handleSubmit((values) => {
    setAppliedFilters(values);
    setPage(1);
  });

  const resetFilters = () => {
    setAppliedFilters(filtersDefaultValues);
    setPage(1);
  };

  const filterByBlock = (blockId: string) => {
    const nextFilters: CommunitySuggestionFiltersForm = {
      ...filtersDefaultValues,
      blockId,
      status: "agrupada",
    };

    filtersForm.reset(nextFilters);
    setAppliedFilters(nextFilters);
    setPage(1);
  };

  const handleCreateBlock = createBlockForm.handleSubmit(async (values) => {
    try {
      await createBlock.mutateAsync(cleanBlockPayload(values));
      createBlockForm.reset(createBlockDefaultValues);
      toast.success("Bloco de demanda criado.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  });

  const handleUpdateBlockStatus = async (
    blockId: string,
    status: AdminCommunitySuggestionBlockStatus,
  ) => {
    try {
      await updateBlock.mutateAsync({ blockId, input: { status } });
      toast.success("Status do bloco atualizado.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const handleMoveSuggestion = async (suggestionId: string, blockId: string | null) => {
    try {
      await moveSuggestion.mutateAsync({ input: { blockId }, suggestionId });
      toast.success(blockId ? "Sugestão movida para o bloco." : "Sugestão removida do bloco.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  const handleArchiveSuggestion = async (suggestionId: string) => {
    if (!window.confirm("Arquivar esta sugestão sem apagar dados?")) return;

    try {
      await archiveSuggestion.mutateAsync(suggestionId);
      toast.success("Sugestão arquivada.");
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="min-w-0 max-w-full space-y-7 overflow-x-clip">
      <section className={cn(cardClass, "p-5 md:p-6")}>
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Moderação
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Sugestões de comunidades
            </h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
              Receba as sugestões enviadas pelo app e agrupe temas parecidos em blocos de demanda
              para decidir quando abrir uma nova comunidade.
            </p>
          </div>
          <div className="grid min-w-32 place-items-center rounded-card border border-primary/15 bg-primary-soft px-6 py-5 text-primary">
            <span className="text-3xl font-black">
              {numberFormatter.format(data?.summary.ungrouped_total ?? 0)}
            </span>
            <span className="text-xs font-black uppercase tracking-[0.08em]">sem bloco</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryMetricCard
          icon={Inbox}
          label="Sugestões recebidas"
          value={numberFormatter.format(data?.summary.total_suggestions ?? 0)}
        />
        <SummaryMetricCard
          icon={Layers3}
          label="Agrupadas"
          value={numberFormatter.format(data?.summary.grouped_total ?? 0)}
        />
        <SummaryMetricCard
          icon={Boxes}
          label="Blocos ativos"
          value={numberFormatter.format(data?.summary.total_blocks ?? 0)}
        />
        <SummaryMetricCard
          icon={Clock3}
          label="Última sugestão"
          value={latestSuggestionLabel(data?.summary.latest_suggestion_at)}
        />
      </section>

      {suggestionsQuery.error ? (
        <AdminQueryErrorState
          error={suggestionsQuery.error}
          onRetry={() => void suggestionsQuery.refetch()}
          title="Não foi possível carregar as sugestões"
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className={cn(cardClass, "min-w-0 p-5 md:p-6")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                Blocos de demanda
              </p>
              <h2 className="mt-1 text-xl font-black text-foreground">Temas em análise</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-muted">
                Use os blocos como caixas internas. Quando houver volume suficiente, marque como
                candidata e abra a comunidade no fluxo de Comunidades.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-warning-soft px-3 py-1 text-xs font-black text-warning ring-1 ring-warning-border">
              <AlertTriangle aria-hidden className="h-3.5 w-3.5" />
              {numberFormatter.format(data?.summary.candidate_blocks ?? 0)} candidata(s)
            </span>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {suggestionsQuery.isLoading ? (
              ["block-one", "block-two"].map((key) => (
                <div className="h-52 animate-pulse rounded-card bg-surface-muted" key={key} />
              ))
            ) : blocks.length === 0 ? (
              <div className="lg:col-span-2">
                <BlockListEmptyState />
              </div>
            ) : (
              blocks.map((block) => (
                <DemandBlockCard
                  block={block}
                  disabled={busy}
                  key={block.id}
                  onFilter={filterByBlock}
                  onUpdateStatus={handleUpdateBlockStatus}
                />
              ))
            )}
          </div>
        </div>
        <CreateDemandBlockPanel
          disabled={createBlock.isPending}
          form={createBlockForm}
          onSubmit={handleCreateBlock}
        />
      </section>

      <section className={cn(cardClass, "overflow-hidden")}>
        <CommunitySuggestionsFilters
          blocks={blocks}
          disabled={suggestionsQuery.isLoading}
          form={filtersForm}
          isFetching={suggestionsQuery.isFetching}
          onReset={resetFilters}
          onSubmit={applyFilters}
          resultCount={data?.count ?? 0}
        />
        {suggestionsQuery.isLoading ? <LoadingSkeleton /> : null}
        {!suggestionsQuery.isLoading && suggestions.length === 0 ? <EmptySuggestionsState /> : null}
        {!suggestionsQuery.isLoading && suggestions.length > 0 ? (
          <CommunitySuggestionsList
            blocks={blocks}
            disabled={busy}
            onArchive={handleArchiveSuggestion}
            onMove={handleMoveSuggestion}
            suggestions={suggestions}
          />
        ) : null}
        <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-muted">
            Página {data?.page ?? page} de {data?.pages ?? 1}
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
              disabled={(data?.page ?? page) <= 1 || suggestionsQuery.isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              Anterior
            </button>
            <button
              className="inline-flex h-10 items-center justify-center rounded-control border border-border px-4 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
              disabled={(data?.page ?? page) >= (data?.pages ?? 1) || suggestionsQuery.isLoading}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              Próxima
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
