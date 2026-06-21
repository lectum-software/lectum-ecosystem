"use client";

import { Loader2, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdatePostReply } from "@/api/callers/posts";
import type { PostReply, UserPostReply } from "@/api/generator/types/posts";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { type Field, useFormList } from "@/hooks/form";
import { Button } from "@/registry/new-york-v4/ui/button";

const replyEditSchema = z.object({
  content: z
    .string()
    .trim()
    .min(3, "Escreva um texto com pelo menos 3 caracteres")
    .max(2000, "Use no máximo 2000 caracteres no texto"),
});

type ReplyEditForm = z.infer<typeof replyEditSchema>;

type EditableReply = Pick<
  UserPostReply,
  "content" | "id" | "parent_reply_id" | "replies_received_count"
>;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type ReplyEditModalProps = {
  onClose: () => void;
  onUpdated?: (reply: PostReply) => void;
  open: boolean;
  postId: string;
  reply: EditableReply;
};

const fields = [
  {
    name: "content",
    field: "textarea",
    id: "edit-reply-content",
    label: "Texto",
    placeholder: "Atualize o texto mantendo o contexto da conversa",
    required: true,
    max: 2000,
    rows: 8,
    autoGrow: false,
    className: "[&>span:last-child]:min-h-4",
    inputClassName: "min-h-44 resize-y rounded-2xl border-border bg-surface px-4 py-3",
  },
] satisfies Field<ReplyEditForm>[];

const errorMessageFromUnknown = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");

  return rawMessage || "Não foi possível salvar as alterações agora. Tente novamente.";
};

export function ReplyEditModal({ onClose, onUpdated, open, postId, reply }: ReplyEditModalProps) {
  const [actionError, setActionError] = useState<string | null>(null);
  const replyKind = useMemo(
    () => (reply.parent_reply_id ? "resposta" : "comentário"),
    [reply.parent_reply_id],
  );
  const replyKindLabel = replyKind === "resposta" ? "Resposta" : "Comentário";
  const form = useFormList<ReplyEditForm>({
    fields,
    schema: replyEditSchema,
    defaultValues: {
      content: reply.content,
    },
  });
  const { formProps, hook } = form;
  const updateMutation = useUpdatePostReply({
    onSuccess: (updatedReply) => {
      toast.success(`${replyKindLabel} atualizado!`);
      onUpdated?.(updatedReply);
      onClose();
    },
    onError: (error) => {
      setActionError(errorMessageFromUnknown(error));
    },
  });
  const isSubmitting = updateMutation.isPending;

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      document.getElementById("edit-reply-content")?.focus({ preventScroll: true });
    }, 80);
    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  const handleSubmit = hook.handleSubmit(async (values) => {
    setActionError(null);

    try {
      await updateMutation.mutateAsync({
        body: {
          content: values.content.trim(),
        },
        postId,
        replyId: reply.id,
      });
    } catch {
      // Feedback fica na mutation para preservar o texto editado.
    }
  });

  if (!open) return null;

  return (
    <div
      aria-labelledby="edit-reply-title-heading"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/45 px-0 pt-8 text-foreground backdrop-blur-md sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[min(100vw,38rem)] flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface shadow-[var(--lectum-shadow)] sm:max-h-[min(90dvh,680px)] sm:rounded-[2rem]">
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label={`Fechar edição de ${replyKind}`}
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2
            className="text-[1.15rem] font-black tracking-[-0.03em]"
            id="edit-reply-title-heading"
          >
            Editar {replyKind}
          </h2>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {reply.replies_received_count > 0 ? (
              <InlineAlert title={`Este ${replyKind} já tem respostas`} variant="warning">
                Edite com cuidado para preservar o contexto da conversa já publicada.
              </InlineAlert>
            ) : null}

            {actionError ? (
              <InlineAlert title="Não foi possível salvar" variant="error">
                {actionError}
              </InlineAlert>
            ) : null}

            <div className="grid gap-4">
              {formProps.fields.map((field) => {
                const Component = components[field.field];
                if (!Component) return null;

                return (
                  <Component
                    control={hook.control}
                    key={`edit-reply-${String(field.name)}`}
                    {...field}
                  />
                );
              })}
            </div>
          </div>

          <footer className="shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
            <div className="flex justify-end gap-2">
              <Button
                className="h-12 rounded-full px-5"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                className="h-12 rounded-full px-5 font-black"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-5 w-5" aria-hidden="true" />
                )}
                Salvar alterações
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
