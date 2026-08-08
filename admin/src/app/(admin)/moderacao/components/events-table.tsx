"use client";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AdminModerationEvent } from "@/api/req/moderation";
import { cn } from "@/lib/utils";
import {
  formatDateOnly,
  formatDateTime,
  TEXTUAL_TABLE_SKELETON_KEYS,
  targetLabels,
} from "../modules/moderation-support";

import { Decision, Status, VerifiedBadgeIcon } from "./header-filters";

export const ContentSensitiveEventRow = ({
  event,
  onSelect,
  selected,
}: {
  event: AdminModerationEvent;
  onSelect: (event: AdminModerationEvent) => void;
  selected: boolean;
}) => {
  const titlePreview =
    event.title_snapshot?.trim() || targetLabels[event.target_type] || "Conteúdo";
  const descriptionPreview = event.content_excerpt.trim() || "Sem descrição persistida.";
  const communityName = event.community?.name ?? "Sem comunidade";
  const authorName = event.author.name || event.author.admin_label || event.author.public_label;
  const authorRoleLabel = event.author.role_label || event.author.role;

  return (
    <tr
      className={cn(
        "border-t border-border/80 text-sm text-foreground transition hover:bg-primary-soft/30",
        selected ? "bg-primary-soft/45" : null,
      )}
    >
      <td className="px-5 py-4 align-middle text-xs font-medium text-muted">
        <span title={formatDateTime(event.created_at)}>{formatDateOnly(event.created_at)}</span>
      </td>
      <td className="px-5 py-4 align-middle">
        <Status value={event.status} />
      </td>
      <td className="px-5 py-4 align-middle">
        <Decision value={event.decision} />
      </td>
      <td className="px-5 py-4 align-middle">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-foreground" title={authorName}>
              {authorName}
            </span>
            {event.author.show_verified_badge ? (
              <VerifiedBadgeIcon aria-label="Perfil verificado" className="h-[15px] w-[15px]" />
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs font-medium text-muted" title={authorRoleLabel}>
            {authorRoleLabel}
          </p>
        </div>
      </td>
      <td className="px-5 py-4 align-middle">
        <button
          aria-label={`Abrir detalhe protegido de ${titlePreview}`}
          className="block w-full min-w-0 rounded-control text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => onSelect(event)}
          title="Abrir detalhe protegido"
          type="button"
        >
          <p className="truncate text-sm font-semibold text-foreground" title={titlePreview}>
            {titlePreview}
          </p>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted" title={descriptionPreview}>
            {descriptionPreview}
          </p>
          <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted" title={communityName}>
            Comunidade: {communityName}
          </p>
        </button>
      </td>
      <td className="px-5 py-4 align-middle text-center">
        <ContentPageLink event={event} title={titlePreview} />
      </td>
    </tr>
  );
};

export const ContentPageLink = ({
  event,
  title,
}: {
  event: AdminModerationEvent;
  title: string;
}) => {
  const href = event.admin_content_url;

  if (!href) {
    return (
      <span
        aria-label="Detalhe administrativo indisponível para este registro"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-muted text-subtle"
        role="img"
        title="Detalhe administrativo indisponível para este registro"
      >
        <ExternalLink aria-hidden className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link
      aria-label={`Abrir detalhes administrativos do conteúdo: ${title}`}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-control transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      href={href}
      title="Abrir detalhes administrativos do conteúdo"
    >
      <ExternalLink aria-hidden className="h-4 w-4" />
    </Link>
  );
};

export const ContentSensitiveEventsTable = ({
  events,
  loading,
  onNext,
  onPrev,
  onSelect,
  page,
  pages,
  selectedId,
}: {
  events: AdminModerationEvent[];
  loading: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSelect: (event: AdminModerationEvent) => void;
  page: number;
  pages: number;
  selectedId: string | null;
}) => (
  <>
    {loading ? (
      <div className="grid gap-3 p-4">
        {TEXTUAL_TABLE_SKELETON_KEYS.map((key) => (
          <div className="h-20 animate-pulse rounded-2xl bg-surface-muted" key={key} />
        ))}
      </div>
    ) : events.length === 0 ? (
      <div className="p-4">
        <div className="rounded-2xl border border-dashed border-border p-5 text-sm leading-6 text-muted">
          Nenhum evento encontrado para os filtros atuais.
        </div>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] table-fixed border-collapse">
          <thead className="bg-surface-muted/70 text-left text-[0.7rem] font-medium uppercase tracking-[0.1em] text-subtle">
            <tr>
              <th className="w-[12%] px-5 py-4 font-medium">Data</th>
              <th className="w-[14%] px-5 py-4 font-medium">Status</th>
              <th className="w-[17%] px-5 py-4 font-medium">Decisão</th>
              <th className="w-[20%] px-5 py-4 font-medium">Autor</th>
              <th className="w-[29%] px-5 py-4 font-medium">Conteúdo</th>
              <th className="w-[8%] px-5 py-4 text-center font-medium" scope="col">
                <span className="sr-only">Abrir detalhes do conteúdo</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {events.map((event) => (
              <ContentSensitiveEventRow
                event={event}
                key={event.id}
                onSelect={onSelect}
                selected={selectedId === event.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    )}
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
  </>
);

export const Info = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="rounded-2xl border border-border bg-surface-muted p-3">
    <p className="text-xs font-black text-muted">{label}</p>
    <p className="mt-1 break-words text-sm font-black text-foreground">{value}</p>
  </div>
);
