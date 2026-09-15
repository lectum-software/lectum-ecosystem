"use client";

import { CheckCircle2, Clock3, ExternalLink, Loader2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { resolveApiError } from "@/api/handle";
import type { AdminModerationEventDetail } from "@/api/req/moderation";
import { useAdminDialogLifecycle } from "@/hooks/use-admin-dialog-lifecycle";
import {
  moderationReasonLabel,
  moderationRoleLabel,
  moderationTargetLabel,
} from "@/lib/moderation-copy";
import { toPublicFrontendHref } from "@/lib/public-frontend-url";
import { formatDateTime } from "../modules/moderation-support";
import { Info } from "./events-table";
import { Card, Categories, Decision, Severity, Status } from "./header-filters";

export const Detail = ({
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
          Selecione um evento para ver o conteúdo protegido, as proteções acionadas e as ações.
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
          {event.title_snapshot || moderationTargetLabel(event.target_type)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Conteúdo completo visível apenas nesta área administrativa autenticada.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Decision value={event.decision} />
          <Severity value={event.severity} />
          <Status value={event.status} />
        </div>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="Autor" value={event.author.name || event.author.admin_label || "—"} />
          <Info label="Autor público" value={event.author.public_label} />
          <Info
            label="Papel"
            value={event.author.role_label || moderationRoleLabel(event.author.role)}
          />
          <Info label="Comunidade" value={event.community?.name ?? "—"} />
          <Info label="Alvo" value={moderationTargetLabel(event.target_type)} />
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
            Conteúdo completo
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
            {event.content_snapshot || "Conteúdo completo indisponível."}
          </pre>
        </div>
        <Info label="Motivo" value={moderationReasonLabel(event.reason_code)} />
        <div className="rounded-2xl border border-border bg-surface-muted p-3">
          <p className="text-xs font-black text-muted">Proteções acionadas</p>
          <p className="mt-2 text-sm font-bold text-foreground">
            {event.matched_rules.length === 0
              ? "Nenhuma proteção automática informada."
              : `${event.matched_rules.length} ${event.matched_rules.length === 1 ? "proteção automática acionada" : "proteções automáticas acionadas"}.`}
          </p>
        </div>
        {event.admin_note ? <Info label="Nota administrativa" value={event.admin_note} /> : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {event.admin_content_url ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
              href={event.admin_content_url}
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir detalhes do conteúdo
            </Link>
          ) : null}
          {event.public_url ? (
            <Link
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-border bg-surface px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"
              href={toPublicFrontendHref(event.public_url)}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink aria-hidden className="h-4 w-4" />
              Abrir post publicado
            </Link>
          ) : !event.admin_content_url ? (
            <span className="inline-flex min-h-11 items-center rounded-control border border-border bg-surface-muted px-4 text-sm font-black text-muted">
              Bloqueado antes da publicação
            </span>
          ) : null}
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
            className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={reviewPending}
            onClick={() => onResolve(event)}
            type="button"
          >
            <CheckCircle2 aria-hidden className="h-4 w-4" />
            Resolver
          </button>
          {canRemove ? (
            <button
              className="inline-flex h-11 items-center justify-center gap-2 rounded-control border border-danger/30 bg-danger-soft px-4 text-sm font-black text-danger transition hover:border-danger disabled:cursor-not-allowed disabled:opacity-60"
              disabled={reviewPending}
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

export const DetailDialog = ({
  error,
  event,
  loading,
  onClose,
  onRemove,
  onResolve,
  onReview,
  reviewPending,
}: {
  error: unknown;
  event?: AdminModerationEventDetail;
  loading: boolean;
  onClose: () => void;
  onRemove: (event: AdminModerationEventDetail) => void;
  onResolve: (event: AdminModerationEventDetail) => void;
  onReview: (event: AdminModerationEventDetail) => void;
  reviewPending: boolean;
}) => {
  const dialogRef = useAdminDialogLifecycle(onClose, {
    closeEnabled: !reviewPending,
  });

  return (
    <div
      aria-label="Detalhe protegido de moderação"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-overlay p-3 sm:items-center"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="max-h-[92dvh] w-full max-w-5xl overflow-y-auto rounded-card bg-background shadow-admin-soft">
        <div className="sticky top-0 z-10 flex justify-end border-b border-border bg-surface/95 p-3 backdrop-blur">
          <button
            aria-label="Fechar detalhe protegido"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-border bg-surface px-3 text-sm font-black text-foreground transition hover:border-border-strong hover:text-primary"
            disabled={reviewPending}
            onClick={onClose}
            type="button"
          >
            <X aria-hidden className="h-4 w-4" />
            Fechar
          </button>
        </div>
        <div className="p-3 sm:p-4">
          <Detail
            error={error}
            event={event}
            loading={loading}
            onRemove={onRemove}
            onResolve={onResolve}
            onReview={onReview}
            reviewPending={reviewPending}
          />
        </div>
      </div>
    </div>
  );
};
