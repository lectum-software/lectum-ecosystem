"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { LucideIcon } from "lucide-react";
import { Archive, Boxes, CheckCircle2, Inbox, Loader2, MoveRight, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { FormProvider, type UseFormReturn, useForm, useWatch } from "react-hook-form";
import type {
  AdminCommunitySuggestionBlockSummary,
  AdminCommunitySuggestionItem,
} from "@/api/req/moderation";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";
import {
  blockStatusLabel,
  blockStatusOptions,
  blockStatusTone,
  type CommunitySuggestionFiltersForm,
  type CreateBlockForm,
  filtersDefaultValues,
  formatDateTime,
  latestSuggestionLabel,
  type MoveSuggestionForm,
  moveSuggestionSchema,
  numberFormatter,
  suggestionStatusLabel,
  suggestionStatusOptions,
  suggestionStatusTone,
  toBlockFilterOptions,
  toMoveBlockOptions,
  type UpdateBlockForm,
  updateBlockSchema,
  userRoleOptions,
} from "../modules/community-suggestions-support";

export const CommunitySuggestionsFilters = ({
  blocks,
  disabled,
  form,
  isFetching,
  onReset,
  onSubmit,
  resultCount,
}: {
  blocks: AdminCommunitySuggestionBlockSummary[];
  disabled: boolean;
  form: UseFormReturn<CommunitySuggestionFiltersForm>;
  isFetching: boolean;
  onReset: () => void;
  onSubmit: () => void;
  resultCount: number;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid min-w-0 gap-3 xl:grid-cols-[minmax(220px,1.1fr)_repeat(5,minmax(145px,0.8fr))_auto]"
        noValidate
        onSubmit={onSubmit}
      >
        <div className="xl:col-span-1">
          <InputController<CommunitySuggestionFiltersForm>
            disabled={disabled}
            label="Busca"
            name="q"
            placeholder="Tema, usuário ou bloco"
          />
          <p className="-mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted">
            <span>{numberFormatter.format(resultCount)} sugestão(ões) encontrada(s)</span>
            {isFetching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </p>
        </div>
        <SelectController<CommunitySuggestionFiltersForm>
          disabled={disabled}
          label="Status"
          name="status"
          options={[...suggestionStatusOptions]}
        />
        <SelectController<CommunitySuggestionFiltersForm>
          disabled={disabled}
          label="Bloco"
          name="blockId"
          options={toBlockFilterOptions(blocks)}
        />
        <SelectController<CommunitySuggestionFiltersForm>
          disabled={disabled}
          label="Usuário"
          name="userRole"
          options={[...userRoleOptions]}
        />
        <InputController<CommunitySuggestionFiltersForm>
          disabled={disabled}
          label="De"
          name="from"
          type="date"
        />
        <InputController<CommunitySuggestionFiltersForm>
          disabled={disabled}
          label="Até"
          name="to"
          type="date"
        />
        <div className="flex items-start gap-2 pt-7">
          <button
            className="inline-flex h-12 min-w-24 items-center justify-center rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-control transition hover:bg-primary-hover disabled:opacity-60"
            disabled={disabled}
            type="submit"
          >
            Filtrar
          </button>
          <button
            className="inline-flex h-12 min-w-24 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary disabled:opacity-60"
            disabled={disabled}
            onClick={() => {
              form.reset(filtersDefaultValues);
              onReset();
            }}
            type="button"
          >
            Limpar
          </button>
        </div>
      </form>
    </FormProvider>
  </div>
);

export const CreateDemandBlockPanel = ({
  disabled,
  form,
  onSubmit,
}: {
  disabled: boolean;
  form: UseFormReturn<CreateBlockForm>;
  onSubmit: () => void;
}) => (
  <section className="rounded-card border border-border bg-surface p-5 shadow-admin-soft">
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Boxes aria-hidden className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-black text-foreground">Novo bloco de demanda</h2>
        <p className="mt-1 text-sm font-medium leading-6 text-muted">
          Crie um agrupador interno para juntar sugestões parecidas antes de abrir uma comunidade.
        </p>
      </div>
    </div>
    <FormProvider {...form}>
      <form className="mt-5 grid gap-4" noValidate onSubmit={onSubmit}>
        <InputController<CreateBlockForm>
          disabled={disabled}
          label="Título do bloco"
          name="title"
          placeholder="Ansiedade no trabalho"
          required
        />
        <TextareaController<CreateBlockForm>
          disabled={disabled}
          label="Notas internas"
          name="description"
          placeholder="Critério de agrupamento, público observado ou hipótese de demanda"
          rows={4}
        />
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-black text-primary-foreground shadow-control transition hover:bg-primary-hover disabled:opacity-60"
          disabled={disabled}
          type="submit"
        >
          {disabled ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          Criar bloco
        </button>
      </form>
    </FormProvider>
  </section>
);

export const DemandBlockCard = ({
  block,
  disabled,
  onFilter,
  onUpdateStatus,
}: {
  block: AdminCommunitySuggestionBlockSummary;
  disabled: boolean;
  onFilter: (blockId: string) => void;
  onUpdateStatus: (blockId: string, status: AdminCommunitySuggestionBlockSummary["status"]) => void;
}) => {
  const form = useForm<UpdateBlockForm>({
    defaultValues: { status: block.status },
    mode: "onChange",
    resolver: zodResolver(updateBlockSchema),
  });
  const selectedStatus = useWatch({ control: form.control, name: "status" });

  useEffect(() => {
    form.reset({ status: block.status });
  }, [block.status, form]);

  return (
    <article className="rounded-card border border-border bg-surface p-4 shadow-control">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-black text-foreground">{block.title}</h3>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-black ring-1",
                blockStatusTone[block.status],
              )}
            >
              {blockStatusLabel[block.status]}
            </span>
          </div>
          {block.description ? (
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-muted">
              {block.description}
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium leading-6 text-muted">
              Sem notas internas cadastradas.
            </p>
          )}
        </div>
        <div className="grid h-12 min-w-16 place-items-center rounded-2xl bg-primary-soft px-3 text-center text-primary">
          <span className="text-lg font-black">
            {numberFormatter.format(block.suggestions_count)}
          </span>
          <span className="sr-only">sugestões</span>
        </div>
      </div>
      <dl className="mt-4 grid gap-2 rounded-2xl bg-surface-muted/70 p-3 text-xs font-bold text-muted sm:grid-cols-2">
        <div>
          <dt className="uppercase tracking-[0.08em]">Última sugestão</dt>
          <dd className="mt-1 text-sm text-foreground">
            {latestSuggestionLabel(block.latest_suggestion_at)}
          </dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em]">Comunidade aberta</dt>
          <dd className="mt-1 text-sm text-foreground">{block.community?.name ?? "Ainda não"}</dd>
        </div>
      </dl>
      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <FormProvider {...form}>
          <form
            className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
            noValidate
            onSubmit={form.handleSubmit((values) => onUpdateStatus(block.id, values.status))}
          >
            <SelectController<UpdateBlockForm>
              disabled={disabled}
              label="Status do bloco"
              name="status"
              options={[...blockStatusOptions]}
            />
            <button
              className="mt-7 inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary disabled:opacity-50"
              disabled={disabled || selectedStatus === block.status}
              type="submit"
            >
              Salvar
            </button>
          </form>
        </FormProvider>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-control bg-primary-soft px-4 text-sm font-black text-primary transition hover:bg-primary/15"
          onClick={() => onFilter(block.id)}
          type="button"
        >
          Ver sugestões
          <MoveRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
};

const MoveSuggestionControl = ({
  blocks,
  disabled,
  onMove,
  suggestion,
}: {
  blocks: AdminCommunitySuggestionBlockSummary[];
  disabled: boolean;
  onMove: (suggestionId: string, blockId: string | null) => void;
  suggestion: AdminCommunitySuggestionItem;
}) => {
  const form = useForm<MoveSuggestionForm>({
    defaultValues: { blockId: suggestion.block?.id ?? "" },
    mode: "onChange",
    resolver: zodResolver(moveSuggestionSchema),
  });
  const selectedBlockId = useWatch({ control: form.control, name: "blockId" });

  useEffect(() => {
    form.reset({ blockId: suggestion.block?.id ?? "" });
  }, [form, suggestion.block?.id]);

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
        noValidate
        onSubmit={form.handleSubmit((values) => onMove(suggestion.id, values.blockId || null))}
      >
        <SelectController<MoveSuggestionForm>
          disabled={disabled}
          label="Mover para bloco"
          name="blockId"
          options={toMoveBlockOptions(blocks)}
        />
        <button
          className="mt-7 inline-flex h-12 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground shadow-control transition hover:border-primary disabled:opacity-50"
          disabled={disabled || selectedBlockId === (suggestion.block?.id ?? "")}
          type="submit"
        >
          Mover
        </button>
      </form>
    </FormProvider>
  );
};

export const CommunitySuggestionsList = ({
  blocks,
  disabled,
  onArchive,
  onMove,
  suggestions,
}: {
  blocks: AdminCommunitySuggestionBlockSummary[];
  disabled: boolean;
  onArchive: (suggestionId: string) => void;
  onMove: (suggestionId: string, blockId: string | null) => void;
  suggestions: AdminCommunitySuggestionItem[];
}) => (
  <div className="grid gap-3 p-4">
    {suggestions.map((suggestion) => (
      <article
        className="rounded-card border border-border bg-surface p-4 shadow-control"
        key={suggestion.id}
      >
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.55fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-black ring-1",
                  suggestionStatusTone[suggestion.status],
                )}
              >
                {suggestionStatusLabel[suggestion.status]}
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">
                {formatDateTime(suggestion.created_at)}
              </span>
            </div>
            <h3 className="mt-3 text-base font-black leading-7 text-foreground md:text-lg">
              {suggestion.theme}
            </h3>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-muted">
              <span>{suggestion.user.name}</span>
              <span aria-hidden>•</span>
              <span>{suggestion.user.role_label}</span>
              {suggestion.user.show_verified_badge ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-xs font-black text-primary">
                  <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
                  Verificado
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-medium text-muted">
              Bloco atual: {suggestion.block?.title ?? "sem bloco"}
            </p>
          </div>
          <div className="grid gap-3">
            <MoveSuggestionControl
              blocks={blocks}
              disabled={disabled || suggestion.status === "arquivada"}
              onMove={onMove}
              suggestion={suggestion}
            />
            <button
              className="inline-flex h-12 items-center justify-center gap-2 rounded-control border border-danger/20 bg-danger-soft px-4 text-sm font-black text-danger transition hover:border-danger/40 disabled:opacity-50"
              disabled={disabled || suggestion.status === "arquivada"}
              onClick={() => onArchive(suggestion.id)}
              type="button"
            >
              <Archive aria-hidden className="h-4 w-4" />
              Arquivar sugestão
            </button>
          </div>
        </div>
      </article>
    ))}
  </div>
);

export const EmptySuggestionsState = () => (
  <div className="p-4">
    <div className="rounded-card border border-dashed border-border bg-surface-muted p-8 text-center">
      <Inbox aria-hidden className="mx-auto h-10 w-10 text-primary" />
      <h2 className="mt-3 text-lg font-black text-foreground">Nenhuma sugestão encontrada</h2>
      <p className="mt-1 text-sm font-medium leading-6 text-muted">
        Ajuste os filtros ou aguarde novas sugestões enviadas pelo app Lectum.
      </p>
    </div>
  </div>
);

export const SummaryMetricCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <article className="rounded-card border border-border bg-surface p-4 shadow-control">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
        <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      </div>
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <Icon aria-hidden className="h-5 w-5" />
      </div>
    </div>
  </article>
);

export const LoadingSkeleton = () => (
  <div className="grid gap-3 p-4">
    {["one", "two", "three"].map((key) => (
      <div className="h-36 animate-pulse rounded-card bg-surface-muted" key={key} />
    ))}
  </div>
);

export const BlockListEmptyState = () => (
  <div className="rounded-card border border-dashed border-border bg-surface-muted p-6 text-sm font-medium leading-6 text-muted">
    <CheckCircle2 aria-hidden className="mb-3 h-6 w-6 text-primary" />
    Ainda não há blocos. Crie o primeiro agrupador e mova sugestões para acompanhar demanda.
  </div>
);
