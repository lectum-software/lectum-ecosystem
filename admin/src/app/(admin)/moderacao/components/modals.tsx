"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { adminCommunitiesKeys, adminModerationKeys } from "@/api/cache/keys";
import { useAdminModerationResolve } from "@/api/callers/moderation";
import { resolveApiError } from "@/api/handle";
import { removeAdminCommunityContent } from "@/api/req/communities";
import type { AdminModerationEventDetail } from "@/api/req/moderation";
import { AdminQueryErrorState } from "@/components/admin-shell/query-error-state";
import { InputController, TextareaController } from "@/components/controllers";
import {
  REMOVE_CONFIRMATION,
  type RemoveValues,
  type ResolveValues,
  removeSchema,
  resolveSchema,
} from "../modules/moderation-support";

import { Card } from "./header-filters";

export const ModalTitle = ({ onClose, title }: { onClose: () => void; title: string }) => (
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

export const ModalButtons = ({
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
      className="inline-flex h-11 items-center justify-center gap-2 rounded-control bg-primary px-4 text-sm font-black text-primary-foreground shadow-admin-soft transition hover:bg-primary-hover disabled:opacity-60"
      disabled={loading}
      type="submit"
    >
      {loading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  </div>
);

export const ResolveModal = ({
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
      toast.success("Evento resolvido com sucesso.");
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

export const RemoveModal = ({
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
        <p className="mt-4 rounded-2xl border border-danger-border bg-danger-soft p-4 text-sm leading-6 text-danger">
          Esta ação remove a comunidade de forma auditada. Depois, o evento será resolvido com uma
          nota administrativa.
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

export const ErrorState = ({ error, onRetry }: { error: unknown; onRetry: () => void }) => (
  <AdminQueryErrorState
    error={error}
    onRetry={onRetry}
    title="Não foi possível carregar a moderação"
  />
);
