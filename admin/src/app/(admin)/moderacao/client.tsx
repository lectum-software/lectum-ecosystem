"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, type UseFormReturn, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { adminCommunitiesKeys, adminModerationKeys } from "@/api/cache/keys";
import {
  useAdminModerationEvent,
  useAdminModerationEvents,
  useAdminModerationResolve,
  useAdminModerationReview,
  useAdminModerationSummary,
} from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import { removeAdminCommunityContent } from "@/api/req/communities";
import type {
  AdminModerationDecision,
  AdminModerationEvent,
  AdminModerationEventDetail,
  AdminModerationEventsQuery,
  AdminModerationSeverity,
  AdminModerationStatus,
} from "@/api/req/moderation";
import { InputController, SelectController, TextareaController } from "@/components/controllers";
import { cn } from "@/lib/utils";
import { ModerationOverviewCharts } from "./overview-charts";

const EVENT_LIMIT = 10;
const REMOVE_CONFIRMATION = "REMOVER CONTEUDO";
const cardClass =
  "rounded-card border border-border/80 bg-surface/95 shadow-admin-soft backdrop-blur";
const numberFormatter = new Intl.NumberFormat("pt-BR");
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});
const pad = (value: number) => String(value).padStart(2, "0");
const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const getQuickRange = (days: number) => {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  return { from: toInputDate(from), to: toInputDate(today) };
};
const initialRange = getQuickRange(30);

const decisionCopy: Record<AdminModerationDecision, { label: string; className: string }> = {
  allow_sensitive: { className: "bg-orange-50 text-orange-700", label: "Sensível publicado" },
  block: { className: "bg-red-50 text-danger", label: "Bloqueado" },
  safety_hold: { className: "bg-red-600 text-white", label: "Segurança urgente" },
};
const statusCopy: Record<AdminModerationStatus, { label: string; className: string }> = {
  pending: { className: "bg-yellow-50 text-yellow-700", label: "Pendente" },
  resolved: { className: "bg-emerald-50 text-success", label: "Resolvido" },
  reviewing: { className: "bg-blue-50 text-blue-700", label: "Em revisão" },
};
const severityCopy: Record<AdminModerationSeverity, { label: string; className: string }> = {
  high: { className: "bg-red-50 text-danger", label: "Alta" },
  low: { className: "bg-surface-muted text-muted", label: "Baixa" },
  medium: { className: "bg-orange-50 text-orange-700", label: "Média" },
  urgent: { className: "bg-red-600 text-white", label: "Urgente" },
};
const categoryLabels: Record<string, string> = {
  abuse_violence: "Abuso/violência",
  explicit_sexual: "Sexual explícito",
  external_link: "Link externo",
  minor_sexual_risk: "Menor/risco sexual",
  other: "Outro",
  self_harm_suicide: "Autolesão/suicídio",
  sexual_health: "Saúde sexual",
  spam_scam: "Spam/golpe",
};
const reasonLabels: Record<string, string> = {
  external_contact_invitation_blocked: "Convite para contato externo",
  minor_sexual_risk_blocked: "Contexto sexual com menor",
  patient_external_link_blocked: "URL ou domínio externo",
  self_harm_immediate_safety_hold: "Risco imediato/autolesão",
  sensitive_term_requires_admin_awareness: "Termo sensível em relato",
  sensitive_therapeutic_context: "Relato terapêutico sensível",
  sexual_solicitation_blocked: "Solicitação/divulgação sexual",
  spam_or_scam_blocked: "Spam ou golpe",
};
const targetLabels: Record<string, string> = {
  community_post: "Post publicado",
  post_reply: "Resposta publicada",
  submitted_post: "Post bloqueado antes da publicação",
  submitted_reply: "Resposta bloqueada antes da publicação",
};
const statusFilterOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendente", value: "pending" },
  { label: "Em revisão", value: "reviewing" },
  { label: "Resolvido", value: "resolved" },
] satisfies Array<{ label: string; value: "all" | AdminModerationStatus }>;

const decisionFilterOptions = [
  { label: "Todas", value: "all" },
  { label: "Sensível publicado", value: "allow_sensitive" },
  { label: "Bloqueado", value: "block" },
  { label: "Segurança urgente", value: "safety_hold" },
] satisfies Array<{ label: string; value: "all" | AdminModerationDecision }>;

const categoryFilterOptions = [
  { label: "Todas", value: "all" },
  { label: "Links externos", value: "external_link" },
  { label: "Saúde sexual", value: "sexual_health" },
  { label: "Sexual explícito", value: "explicit_sexual" },
  { label: "Menor/risco sexual", value: "minor_sexual_risk" },
  { label: "Autolesão/suicídio", value: "self_harm_suicide" },
  { label: "Abuso/violência", value: "abuse_violence" },
  { label: "Spam/golpe", value: "spam_scam" },
  { label: "Outro", value: "other" },
] satisfies Array<{ label: string; value: string }>;

const severityFilterOptions = [
  { label: "Todas", value: "all" },
  { label: "Baixa", value: "low" },
  { label: "Média", value: "medium" },
  { label: "Alta", value: "high" },
  { label: "Urgente", value: "urgent" },
] satisfies Array<{ label: string; value: "all" | AdminModerationSeverity }>;

type Filters = {
  category: string;
  community: string;
  decision: "all" | AdminModerationDecision;
  from: string;
  q: string;
  severity: "all" | AdminModerationSeverity;
  status: "all" | AdminModerationStatus;
  to: string;
};
const initialFilters: Filters = {
  category: "all",
  community: "",
  decision: "all",
  from: initialRange.from,
  q: "",
  severity: "all",
  status: "pending",
  to: initialRange.to,
};

const textualFiltersSchema = z
  .object({
    category: z.string().max(60, "Use no máximo 60 caracteres."),
    community: z.string().max(120, "Use no máximo 120 caracteres."),
    decision: z.enum(["all", "allow_sensitive", "block", "safety_hold"]),
    from: z.string().max(10, "Use uma data válida."),
    q: z.string().max(120, "Use no máximo 120 caracteres."),
    severity: z.enum(["all", "high", "low", "medium", "urgent"]),
    status: z.enum(["all", "pending", "reviewing", "resolved"]),
    to: z.string().max(10, "Use uma data válida."),
  })
  .refine((values) => !values.from || !values.to || values.from <= values.to, {
    message: "A data inicial deve ser menor ou igual à final.",
    path: ["to"],
  });

const resolveSchema = z.object({
  note: z
    .string()
    .trim()
    .min(3, "Informe a nota administrativa.")
    .max(1000, "Use até 1000 caracteres."),
});
const removeSchema = z.object({
  confirmation: z
    .string()
    .trim()
    .refine(
      (value) => value.toUpperCase() === REMOVE_CONFIRMATION,
      `Digite ${REMOVE_CONFIRMATION} para confirmar.`,
    ),
  reason: z.string().trim().min(3, "Informe o motivo.").max(500, "Use até 500 caracteres."),
});
type ResolveValues = z.infer<typeof resolveSchema>;
type RemoveValues = z.infer<typeof removeSchema>;

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : dateTimeFormatter.format(date);
};
const normalizeTextualFilters = (values: Filters): Filters => ({
  category: values.category,
  community: values.community,
  decision: values.decision,
  from: values.from,
  q: values.q,
  severity: values.severity,
  status: values.status,
  to: values.to,
});

const areTextualFiltersEqual = (left: Filters, right: Filters) =>
  left.category === right.category &&
  left.community === right.community &&
  left.decision === right.decision &&
  left.from === right.from &&
  left.q === right.q &&
  left.severity === right.severity &&
  left.status === right.status &&
  left.to === right.to;
const Card = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <section className={cn(cardClass, className)}>{children}</section>
);

const HeaderPendingCount = ({ count, loading }: { count?: number | null; loading?: boolean }) => {
  const hasCount = typeof count === "number";

  return (
    <div aria-live="polite" className="min-w-[9rem] px-4 py-2 text-center">
      <p className="inline-flex items-center justify-center gap-1.5 text-3xl font-black tracking-tight text-foreground">
        {hasCount ? numberFormatter.format(count) : "—"}
        {loading ? (
          <Loader2
            aria-label="Atualizando pendências"
            className="h-4 w-4 animate-spin text-muted"
          />
        ) : null}
      </p>
      <p className="text-xs font-bold text-muted">
        {hasCount && count === 1 ? "pendência" : "pendências"}
      </p>
    </div>
  );
};

const Header = ({
  backHref,
  description = "Análise global de denúncias, compliance e alertas operacionais da plataforma.",
  eyebrow = "Moderação",
  pendingCount,
  pendingCountLoading = false,
  title = "Dashboard da moderação",
}: {
  backHref?: string;
  description?: string;
  eyebrow?: string;
  pendingCount?: number | null;
  pendingCountLoading?: boolean;
  title?: string;
}) => (
  <Card className="p-5 md:p-6">
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-muted md:text-base">
          {description}
        </p>
      </div>
      {backHref || pendingCount !== undefined || pendingCountLoading ? (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:items-start xl:justify-end">
          {pendingCount !== undefined || pendingCountLoading ? (
            <HeaderPendingCount count={pendingCount} loading={pendingCountLoading} />
          ) : null}
          {backHref ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-control transition hover:border-border-strong hover:text-primary"
              href={backHref}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Voltar
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  </Card>
);
const Pill = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-black", className)}>
    {children}
  </span>
);
const Decision = ({ value }: { value: AdminModerationDecision }) => (
  <Pill className={decisionCopy[value]?.className}>{decisionCopy[value]?.label ?? value}</Pill>
);
const Status = ({ value }: { value: AdminModerationStatus }) => (
  <Pill className={statusCopy[value]?.className}>{statusCopy[value]?.label ?? value}</Pill>
);
const Severity = ({ value }: { value: AdminModerationSeverity }) => (
  <Pill className={severityCopy[value]?.className}>{severityCopy[value]?.label ?? value}</Pill>
);
const Categories = ({ items }: { items: string[] }) => (
  <div className="flex flex-wrap gap-2">
    {(items.length ? items : ["other"]).map((item) => (
      <span
        className="rounded-full bg-primary-soft px-2.5 py-1 text-[0.68rem] font-black text-primary"
        key={item}
      >
        {categoryLabels[item] ?? item}
      </span>
    ))}
  </div>
);

const FiltersBar = ({
  disabled,
  form,
  isFetching,
  onDateBlur,
  resultCount,
}: {
  disabled: boolean;
  form: UseFormReturn<Filters>;
  isFetching: boolean;
  onDateBlur: () => void;
  resultCount: number;
}) => (
  <div className="border-b border-border bg-surface/80 p-4">
    <FormProvider {...form}>
      <form
        className="grid min-w-0 gap-3 md:grid-cols-2 2xl:grid-cols-[minmax(180px,0.85fr)_minmax(150px,0.7fr)_minmax(150px,0.7fr)_repeat(3,minmax(145px,0.8fr))_repeat(2,minmax(190px,1fr))]"
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="md:col-span-2 2xl:col-span-1">
          <SelectController<Filters>
            disabled={disabled}
            label="Status"
            name="status"
            options={statusFilterOptions}
          />
          <p className="-mt-1 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold text-muted">
            <span>{numberFormatter.format(resultCount)} registro(s) encontrado(s)</span>
            {isFetching ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
                Atualizando
              </span>
            ) : null}
          </p>
        </div>
        <InputController<Filters>
          disabled={disabled}
          label="De"
          name="from"
          onBlur={onDateBlur}
          type="date"
        />
        <InputController<Filters>
          disabled={disabled}
          label="Até"
          name="to"
          onBlur={onDateBlur}
          type="date"
        />
        <SelectController<Filters>
          disabled={disabled}
          label="Decisão"
          name="decision"
          options={decisionFilterOptions}
        />
        <SelectController<Filters>
          disabled={disabled}
          label="Categoria"
          name="category"
          options={categoryFilterOptions}
        />
        <SelectController<Filters>
          disabled={disabled}
          label="Severidade"
          name="severity"
          options={severityFilterOptions}
        />
        <InputController<Filters>
          disabled={disabled}
          label="Comunidade"
          name="community"
          placeholder="ID, slug ou nome"
        />
        <InputController<Filters>
          disabled={disabled}
          label="Busca"
          name="q"
          placeholder="Trecho, regra, comunidade..."
        />
      </form>
    </FormProvider>
  </div>
);

const EventCard = ({
  event,
  onSelect,
  selected,
}: {
  event: AdminModerationEvent;
  onSelect: (event: AdminModerationEvent) => void;
  selected: boolean;
}) => (
  <button
    className={cn(
      "w-full rounded-2xl border bg-surface p-4 text-left shadow-control transition hover:border-primary",
      selected ? "border-primary ring-4 ring-primary-soft" : "border-border",
    )}
    onClick={() => onSelect(event)}
    type="button"
  >
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Decision value={event.decision} />
          <Severity value={event.severity} />
          <Status value={event.status} />
        </div>
        <h3 className="mt-3 font-black text-foreground">
          {event.title_snapshot || targetLabels[event.target_type] || event.target_type}
        </h3>
        <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted">{event.content_excerpt}</p>
      </div>
      <p className="shrink-0 text-xs font-black text-muted">{formatDateTime(event.created_at)}</p>
    </div>
    <div className="mt-3 grid gap-2 text-xs font-bold text-muted sm:grid-cols-2">
      <p>Comunidade: {event.community?.name ?? "Sem comunidade"}</p>
      <p>Autor: {event.author.public_label}</p>
      <p>Alvo: {targetLabels[event.target_type] ?? event.target_type}</p>
      <p>Regra: {reasonLabels[event.reason_code] ?? event.reason_code}</p>
    </div>
    <div className="mt-3">
      <Categories items={event.categories} />
    </div>
  </button>
);

const EventsList = ({
  events,
  onNext,
  onPrev,
  onSelect,
  page,
  pages,
  selectedId,
}: {
  events: AdminModerationEvent[];
  onNext: () => void;
  onPrev: () => void;
  onSelect: (event: AdminModerationEvent) => void;
  page: number;
  pages: number;
  selectedId: string | null;
}) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-surface/70">
    <div className="grid gap-3 p-4">
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
          Nenhum evento encontrado para os filtros atuais.
        </div>
      ) : (
        events.map((event) => (
          <EventCard
            event={event}
            key={event.id}
            onSelect={onSelect}
            selected={selectedId === event.id}
          />
        ))
      )}
    </div>
    <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold text-muted">
        Página {page} de {pages}
      </p>
      <div className="flex gap-2">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
          disabled={page <= 1}
          onClick={onPrev}
          type="button"
        >
          <ChevronLeft aria-hidden className="h-4 w-4" />
          Anterior
        </button>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border px-3 text-sm font-black text-foreground transition hover:border-primary disabled:opacity-50"
          disabled={page >= pages}
          onClick={onNext}
          type="button"
        >
          Próxima
          <ChevronRight aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

const Info = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-2xl border border-border bg-surface-muted p-3">
    <p className="text-xs font-black text-muted">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-foreground">{value}</p>
  </div>
);

const Detail = ({
  event,
  error,
  loading,
  onRemove,
  onResolve,
  onReview,
  reviewPending,
}: {
  event?: AdminModerationEventDetail;
  error: unknown;
  loading: boolean;
  onRemove: (event: AdminModerationEventDetail) => void;
  onResolve: (event: AdminModerationEventDetail) => void;
  onReview: (event: AdminModerationEventDetail) => void;
  reviewPending: boolean;
}) => {
  if (loading) return <Card className="min-h-96 animate-pulse bg-surface-muted" />;
  if (error) {
    return (
      <Card className="p-5">
        <h2 className="font-black text-foreground">Detalhe indisponível</h2>
        <p className="mt-1 text-sm text-muted">{resolveApiError(error)}</p>
      </Card>
    );
  }
  if (!event) {
    return (
      <Card className="p-5">
        <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
          Selecione um evento para ver snapshot protegido, regras disparadas e ações.
        </div>
      </Card>
    );
  }

  const canRemove =
    event.decision === "allow_sensitive" &&
    Boolean(event.target_id) &&
    Boolean(event.community) &&
    (event.target_type === "community_post" || event.target_type === "post_reply");

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">
          Detalhe protegido
        </p>
        <h2 className="mt-2 text-2xl font-black text-foreground">
          {event.title_snapshot || targetLabels[event.target_type] || "Evento de moderação"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Snapshot completo visível apenas nesta rota Admin autenticada.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Decision value={event.decision} />
          <Severity value={event.severity} />
          <Status value={event.status} />
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Autor público" value={event.author.public_label} />
          <Info label="Autor Admin" value={event.author.admin_label || "—"} />
          <Info label="Papel" value={event.author.role} />
          <Info label="Comunidade" value={event.community?.name ?? "—"} />
          <Info label="Alvo" value={targetLabels[event.target_type] ?? event.target_type} />
          <Info label="Criado em" value={formatDateTime(event.created_at)} />
          <Info label="Revisado em" value={formatDateTime(event.reviewed_at)} />
          <Info label="Resolvido em" value={formatDateTime(event.resolved_at)} />
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-muted">
            Categorias
          </p>
          <Categories items={event.categories} />
        </div>
        <div className="rounded-2xl border border-border bg-surface-muted p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Trecho seguro</p>
          <p className="mt-2 text-sm leading-6 text-foreground">{event.content_excerpt}</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
            Snapshot completo
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
            {event.content_snapshot || "Sem snapshot persistido."}
          </pre>
        </div>
        <Info label="Motivo" value={reasonLabels[event.reason_code] ?? event.reason_code} />
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <p className="text-xs font-black text-muted">Regras disparadas</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(event.matched_rules.length ? event.matched_rules : ["sem regra listada"]).map(
              (rule) => (
                <span
                  className="rounded-full bg-surface px-2.5 py-1 text-xs font-black text-foreground"
                  key={rule}
                >
                  {rule}
                </span>
              ),
            )}
          </div>
        </div>
        {event.admin_note ? <Info label="Nota administrativa" value={event.admin_note} /> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {event.public_url ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
              href={event.public_url}
              target="_blank"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir post publicado
            </Link>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface-muted px-4 text-sm font-black text-muted">
              Bloqueado antes da publicação
            </span>
          )}
          {event.status !== "resolved" ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary disabled:opacity-60"
              disabled={reviewPending}
              onClick={() => onReview(event)}
              type="button"
            >
              {reviewPending ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Clock3 aria-hidden className="h-4 w-4" />
              )}
              Marcar em revisão
            </button>
          ) : null}
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover"
            onClick={() => onResolve(event)}
            type="button"
          >
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            Resolver
          </button>
          {canRemove ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-danger/30 bg-red-50 px-4 text-sm font-black text-danger transition hover:border-danger"
              onClick={() => onRemove(event)}
              type="button"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              Remover conteúdo
            </button>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

const ModalTitle = ({ onClose, title }: { onClose: () => void; title: string }) => (
  <div className="flex items-start justify-between gap-3">
    <div>
      <p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Ação Admin</p>
      <h2 className="mt-2 text-2xl font-black text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        A ação registra auditoria e não envia conteúdo sensível para logs técnicos.
      </p>
    </div>
    <button
      aria-label="Fechar modal"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-surface text-muted transition hover:text-foreground"
      onClick={onClose}
      type="button"
    >
      <X aria-hidden className="h-5 w-5" />
    </button>
  </div>
);

const ModalButtons = ({
  label,
  loading,
  onCancel,
}: {
  label: string;
  loading: boolean;
  onCancel: () => void;
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
    <button
      className="inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
      disabled={loading}
      onClick={onCancel}
      type="button"
    >
      Cancelar
    </button>
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-white shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  </div>
);

const ResolveModal = ({
  event,
  onClose,
}: {
  event: AdminModerationEventDetail;
  onClose: () => void;
}) => {
  const mutation = useAdminModerationResolve();
  const form = useForm<ResolveValues>({
    defaultValues: { note: event.admin_note ?? "" },
    mode: "onSubmit",
    resolver: zodResolver(resolveSchema),
  });
  const submit = async (values: ResolveValues) => {
    try {
      await mutation.mutateAsync({ id: event.id, input: { note: values.note.trim() } });
      toast.success("Evento resolvido com auditoria.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center">
      <Card className="max-h-[92dvh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
        <ModalTitle onClose={onClose} title="Resolver evento" />
        <FormProvider {...form}>
          <form className="mt-5 grid gap-4" noValidate onSubmit={form.handleSubmit(submit)}>
            <TextareaController<ResolveValues>
              disabled={mutation.isPending}
              label="Nota administrativa"
              name="note"
              placeholder="Descreva a decisão tomada e próximos passos."
              required
              rows={5}
            />
            <ModalButtons label="Resolver evento" loading={mutation.isPending} onCancel={onClose} />
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};

const RemoveModal = ({
  event,
  onClose,
}: {
  event: AdminModerationEventDetail;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const resolveMutation = useAdminModerationResolve();
  const removeMutation = useMutation({
    mutationFn: async (values: RemoveValues) => {
      if (!event.community || !event.target_id) throw new Error("Conteúdo publicado indisponível.");
      const targetType = event.target_type === "post_reply" ? "comment" : "post";

      return removeAdminCommunityContent(event.community.id, targetType, event.target_id, {
        confirmation: values.confirmation,
        reason: values.reason.trim(),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminCommunitiesKeys.all }),
        queryClient.invalidateQueries({ queryKey: adminModerationKeys.all }),
      ]);
    },
  });
  const form = useForm<RemoveValues>({
    defaultValues: { confirmation: "", reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(removeSchema),
  });
  const pending = removeMutation.isPending || resolveMutation.isPending;
  const submit = async (values: RemoveValues) => {
    try {
      await removeMutation.mutateAsync(values);
      await resolveMutation.mutateAsync({
        id: event.id,
        input: {
          note: `Conteúdo publicado removido pelo fluxo auditado de comunidade. Motivo: ${values.reason.trim()}`,
        },
      });
      toast.success("Conteúdo removido e evento resolvido.");
      onClose();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center">
      <Card className="max-h-[92dvh] w-full max-w-xl overflow-y-auto p-5 sm:p-6">
        <ModalTitle onClose={onClose} title="Remover conteúdo publicado" />
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm leading-6 text-danger">
          Esta ação usa o fluxo real de remoção auditada de comunidades. Depois, o evento será
          resolvido com nota administrativa.
        </p>
        <FormProvider {...form}>
          <form className="mt-5 grid gap-4" noValidate onSubmit={form.handleSubmit(submit)}>
            <TextareaController<RemoveValues>
              disabled={pending}
              label="Motivo interno obrigatório"
              name="reason"
              placeholder="Explique por que o conteúdo sensível publicado será removido."
              required
              rows={4}
            />
            <InputController<RemoveValues>
              disabled={pending}
              label="Confirmação forte"
              name="confirmation"
              placeholder={REMOVE_CONFIRMATION}
              required
            />
            <ModalButtons label="Remover e resolver" loading={pending} onCancel={onClose} />
          </form>
        </FormProvider>
      </Card>
    </div>
  );
};

const ErrorState = ({ error, onRetry }: { error: unknown; onRetry: () => void }) => (
  <Card className="p-5">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-50 text-danger">
          <AlertTriangle aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black">Não foi possível carregar a moderação</h2>
          <p className="mt-1 text-sm text-muted">{resolveApiError(error)}</p>
        </div>
      </div>
      <button
        className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-border-strong"
        onClick={onRetry}
        type="button"
      >
        <RefreshCw aria-hidden className="h-4 w-4" />
        Tentar novamente
      </button>
    </div>
  </Card>
);

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
  const watchedTextualAutoFilters = useWatch({
    control: filtersForm.control,
    name: ["status", "decision", "category", "severity", "community", "q"],
  });
  const watchedTextualAutoFiltersKey = watchedTextualAutoFilters.join("|");
  const latestAppliedTextualFiltersRef = useRef(appliedTextualFilters);
  const summary = useAdminModerationSummary();
  const eventsInput: AdminModerationEventsQuery = useMemo(
    () => ({
      category: appliedTextualFilters.category,
      community: appliedTextualFilters.community.trim() || "all",
      decision: appliedTextualFilters.decision,
      from: appliedTextualFilters.from,
      limit: EVENT_LIMIT,
      page,
      q: appliedTextualFilters.q.trim() || undefined,
      severity: appliedTextualFilters.severity,
      status: appliedTextualFilters.status,
      to: appliedTextualFilters.to,
    }),
    [appliedTextualFilters, page],
  );
  const events = useAdminModerationEvents(eventsInput);
  const selectedId = isTextualPage
    ? (selectedOverrideId ?? searchParams.get("event") ?? events.data?.data[0]?.id ?? null)
    : null;
  const detail = useAdminModerationEvent(selectedId);
  const review = useAdminModerationReview();
  const firstError = isTextualPage ? events.error : summary.error;

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
            ? "Lista exclusiva de pendências de conteúdo sensível, com filtros, detalhe protegido e ações auditadas."
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
            disabled={events.isLoading}
            form={filtersForm}
            isFetching={events.isFetching}
            onDateBlur={handleTextualDateBlur}
            resultCount={events.data?.count ?? 0}
          />
          <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <EventsList
              events={events.data?.data ?? []}
              onNext={() => setPage((current) => current + 1)}
              onPrev={() => setPage((current) => Math.max(1, current - 1))}
              onSelect={selectEvent}
              page={events.data?.page ?? page}
              pages={events.data?.pages ?? 1}
              selectedId={selectedId}
            />
            <Detail
              error={detail.error}
              event={detail.data}
              loading={detail.isLoading && Boolean(selectedId)}
              onRemove={setRemoveTarget}
              onResolve={setResolveTarget}
              onReview={markReviewing}
              reviewPending={review.isPending}
            />
          </div>
        </section>
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
