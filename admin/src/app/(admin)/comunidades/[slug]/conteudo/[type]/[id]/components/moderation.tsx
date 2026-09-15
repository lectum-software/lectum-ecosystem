"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Flag, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useAdminCommunityRemoveContent } from "@/api/callers/communities";
import { resolveApiError } from "@/api/handle";
import type { AdminCommunityContentAnalyticsDetail } from "@/api/req/communities";
import { InputController, TextareaController } from "@/components/controllers";
import {
  moderationReasonLabel,
  moderationSeverityLabel,
  moderationStatusLabel,
} from "@/lib/moderation-copy";
import { cn } from "@/lib/utils";

import {
  cardClass,
  formatCount,
  formatDateTime,
  type RemovalFormValues,
  removalFormSchema,
} from "../modules/content-support";

type ContentRemovalMutation = ReturnType<typeof useAdminCommunityRemoveContent>;

export const ModerationSection = ({ detail }: { detail: AdminCommunityContentAnalyticsDetail }) => (
  <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-moderation-title">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-foreground" id="content-detail-moderation-title">
          Denúncias e moderação
        </h2>
        <p className="mt-1 text-sm font-bold text-muted">
          Eventos associados diretamente ao conteúdo.
        </p>
      </div>
      <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted">
        <Flag aria-hidden className="h-4 w-4" />
        {formatCount(detail.moderation.reports.length)} denúncias
      </span>
    </div>
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      <div>
        <h3 className="text-sm font-black text-foreground">Denúncias</h3>
        {detail.moderation.reports.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Nenhuma denúncia associada a este conteúdo.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {detail.moderation.reports.map((report) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={report.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-muted">
                    {report.status_label}
                  </span>
                  <span className="text-xs font-bold text-muted">{report.reason_label}</span>
                </div>
                <p className="mt-2 text-sm font-bold text-foreground [overflow-wrap:anywhere]">
                  {report.reported_by.label}
                </p>
                {report.description ? (
                  <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
                    {report.description}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-black text-foreground">Eventos de moderação</h3>
        {detail.moderation.events.length === 0 ? (
          <p className="mt-3 rounded-2xl bg-surface-muted p-4 text-sm font-bold text-muted">
            Nenhum evento de moderação associado ao conteúdo.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {detail.moderation.events.map((event) => (
              <article
                className="rounded-2xl border border-border bg-surface-muted p-4"
                key={event.id}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-muted">
                    {moderationStatusLabel(event.status)}
                  </span>
                  <span className="text-xs font-bold text-muted">
                    {moderationSeverityLabel(event.severity)}
                  </span>
                </div>
                <p className="mt-2 text-sm font-black text-foreground [overflow-wrap:anywhere]">
                  {moderationReasonLabel(event.reason_code)}
                </p>
                <p className="mt-1 line-clamp-3 text-xs leading-5 text-muted [overflow-wrap:anywhere]">
                  {event.content_excerpt}
                </p>
                <p className="mt-2 text-[11px] font-bold text-muted">
                  Criado em {formatDateTime(event.created_at)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>
);

export const ContentRemovalForm = ({
  detail,
  mutation,
  onCancel,
  onRemoved,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  mutation: ContentRemovalMutation;
  onCancel: () => void;
  onRemoved: () => void;
}) => {
  const form = useForm<RemovalFormValues>({
    defaultValues: { confirmation: "", reason: "" },
    mode: "onSubmit",
    resolver: zodResolver(removalFormSchema),
  });

  const onSubmit = async (values: RemovalFormValues) => {
    try {
      await mutation.mutateAsync({
        input: {
          confirmation: values.confirmation,
          reason: values.reason.trim(),
        },
        targetId: detail.content.id,
        targetType: detail.content.type,
      });
      toast.success("Conteúdo removido com sucesso.");
      form.reset();
      onRemoved();
      onCancel();
    } catch (error) {
      toast.error(resolveApiError(error));
    }
  };

  return (
    <FormProvider {...form}>
      <form
        className="grid gap-3 rounded-2xl border border-danger/20 bg-danger/5 p-4"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div>
          <p className="text-sm font-black text-danger">Remoção auditada existente</p>
          <p className="mt-1 text-xs leading-5 text-danger">
            Esta ação usa o fluxo administrativo já auditado da aba Conteúdo.
          </p>
        </div>
        <TextareaController<RemovalFormValues>
          disabled={mutation.isPending}
          label="Motivo interno obrigatório"
          name="reason"
          required
          rows={3}
        />
        <InputController<RemovalFormValues>
          disabled={mutation.isPending}
          label="Confirmação forte"
          name="confirmation"
          placeholder="REMOVER CONTEUDO"
          required
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            className="h-10 rounded-control border border-border bg-surface px-4 text-xs font-black text-foreground"
            disabled={mutation.isPending}
            onClick={onCancel}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-danger px-4 text-xs font-black text-primary-foreground disabled:opacity-70"
            disabled={mutation.isPending}
            type="submit"
          >
            {mutation.isPending ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
            Remover conteúdo
          </button>
        </div>
      </form>
    </FormProvider>
  );
};

export const RemovalSection = ({
  detail,
  onRemoved,
  slug,
}: {
  detail: AdminCommunityContentAnalyticsDetail;
  onRemoved: () => void;
  slug: string;
}) => {
  const [open, setOpen] = useState(false);
  const mutation = useAdminCommunityRemoveContent(slug);
  const unavailableActionLabel =
    detail.content.status === "blocked"
      ? "Conteúdo bloqueado automaticamente"
      : "Conteúdo já removido";
  const actionDescription =
    detail.content.status === "blocked"
      ? "Conteúdo bloqueado segue pela central de moderação e permanece indisponível no público."
      : "A remoção utiliza o fluxo administrativo já auditado.";

  return (
    <section className={cn(cardClass, "p-5")} aria-labelledby="content-detail-removal-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground" id="content-detail-removal-title">
            Ações administrativas
          </h2>
          <p className="mt-1 text-sm font-bold text-muted">{actionDescription}</p>
        </div>
        {detail.content.status === "published" ? (
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-danger/20 px-4 text-xs font-black text-danger transition hover:bg-danger/10"
            disabled={mutation.isPending}
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <Trash2 aria-hidden className="h-4 w-4" />
            {open ? "Fechar remoção" : "Remover conteúdo"}
          </button>
        ) : (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-black text-muted">
            {unavailableActionLabel}
          </span>
        )}
      </div>
      {open ? (
        <div className="mt-4">
          <ContentRemovalForm
            detail={detail}
            mutation={mutation}
            onCancel={() => setOpen(false)}
            onRemoved={onRemoved}
          />
        </div>
      ) : null}
    </section>
  );
};
