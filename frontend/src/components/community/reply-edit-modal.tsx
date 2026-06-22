"use client";

import { Loader2, Save, X } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdatePostReply, useUploadPostReplyMedia } from "@/api/callers/posts";
import type { PostReply, UserPostReply } from "@/api/generator/types/posts";
import {
  mediaTypeFromFile,
  ReplyMediaAttachmentControl,
  type SelectedReplyMedia,
} from "@/components/community/reply-media-attachment-control";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { type Field, useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";

const replyEditSchema = z.object({
  content: z.string().trim().max(2000, "Use no máximo 2000 caracteres no texto"),
});

type ReplyEditForm = z.infer<typeof replyEditSchema>;

type EditableReply = Pick<
  UserPostReply,
  "author" | "content" | "id" | "media_type" | "media_url" | "parent_reply_id"
> & {
  replies_count?: number;
  replies_received_count?: number;
};

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
    placeholder: "Edite seu comentário",
    max: 2000,
    rows: 2,
    autoGrow: true,
    className: "[&>span:last-child]:min-h-4",
    inputClassName:
      "max-h-[16rem] min-h-[5rem] resize-none rounded-[1.35rem] border-border bg-surface px-4 py-3.5 text-[0.95rem] leading-6 shadow-none sm:max-h-[18rem]",
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

const resolveMediaUploadError = (error: unknown) => {
  const rawMessage = errorMessageFromUnknown(error);
  const normalized = rawMessage.toLowerCase();

  if (
    normalized.includes("tamanho") ||
    normalized.includes("limite") ||
    normalized.includes("50")
  ) {
    return "A mídia precisa ter até 50MB.";
  }

  if (normalized.includes("tipo") || normalized.includes("permit")) {
    return "Envie uma imagem ou vídeo em formato permitido.";
  }

  if (normalized.includes("plano") || normalized.includes("verific")) {
    return "Mídia disponível apenas para psicólogos verificados.";
  }

  return rawMessage || "Não foi possível anexar a mídia agora. Tente novamente.";
};

export function ReplyEditModal({ onClose, onUpdated, open, postId, reply }: ReplyEditModalProps) {
  const storedUser = useAppSelector((state) => state.user);
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const canManageMedia = mediaPermission.canAttach && reply.author.role === "psicologo";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMediaPreviewUrlRef = useRef<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedReplyMedia | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const form = useFormList<ReplyEditForm>({
    fields,
    schema: replyEditSchema,
    defaultValues: {
      content: reply.content,
    },
  });
  const { formProps, hook } = form;
  const uploadMutation = useUploadPostReplyMedia({
    onError: (error) => {
      setActionError(resolveMediaUploadError(error));
    },
  });
  const updateMutation = useUpdatePostReply({
    onSuccess: (updatedReply) => {
      toast.success("Comentário atualizado!");
      onUpdated?.(updatedReply);
      onClose();
    },
    onError: (error) => {
      setActionError(errorMessageFromUnknown(error));
    },
  });
  const isSubmitting = uploadMutation.isPending || updateMutation.isPending;
  const contentDraft = String(hook.watch("content") ?? "").trim();
  const hasEffectiveMedia = Boolean(selectedMedia || (!removeMedia && reply.media_url));
  const canSubmit = Boolean(contentDraft || hasEffectiveMedia);

  const focusEditor = useCallback(() => {
    window.setTimeout(() => {
      document.getElementById("edit-reply-content")?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const revokeSelectedMediaPreview = useCallback(() => {
    if (!selectedMediaPreviewUrlRef.current) return;

    URL.revokeObjectURL(selectedMediaPreviewUrlRef.current);
    selectedMediaPreviewUrlRef.current = null;
  }, []);

  const clearSelectedMedia = useCallback(() => {
    revokeSelectedMediaPreview();
    setSelectedMedia(null);
  }, [revokeSelectedMediaPreview]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      if (window.matchMedia("(min-width: 640px)").matches) {
        document.getElementById("edit-reply-content")?.focus({ preventScroll: true });
      }
    }, 120);
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

  useEffect(() => {
    return () => revokeSelectedMediaPreview();
  }, [revokeSelectedMediaPreview]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) return;

    if (!canManageMedia) {
      setActionError(
        mediaPermission.reason || "Mídia disponível apenas para psicólogos verificados.",
      );
      focusEditor();
      return;
    }

    revokeSelectedMediaPreview();
    const previewUrl = URL.createObjectURL(file);
    selectedMediaPreviewUrlRef.current = previewUrl;
    setSelectedMedia({
      file,
      previewUrl,
      type: mediaTypeFromFile(file),
    });
    setRemoveMedia(false);
    setActionError(null);
    hook.clearErrors("content");
    focusEditor();
  };

  const handleSubmit = hook.handleSubmit(async (values) => {
    setActionError(null);

    if (!String(values.content ?? "").trim() && !hasEffectiveMedia) {
      hook.setError("content", {
        message: "Escreva um comentario ou mantenha/anexe uma midia.",
        type: "manual",
      });
      return;
    }

    try {
      const uploadedMedia = selectedMedia
        ? await uploadMutation.mutateAsync({
            file: selectedMedia.file,
            id: postId,
          })
        : null;

      await updateMutation.mutateAsync({
        body: {
          content: values.content.trim(),
          ...(uploadedMedia
            ? {
                mediaType: uploadedMedia.media_type,
                mediaUrl: uploadedMedia.media_url,
              }
            : removeMedia
              ? {
                  mediaType: null,
                  mediaUrl: null,
                }
              : {}),
        },
        postId,
        replyId: reply.id,
      });
    } catch {
      // Feedback fica nas mutations para preservar o texto e a mídia escolhida.
    }
  });

  if (!open || typeof document === "undefined") return null;

  const FieldComponent = components[formProps.fields[0].field];

  return createPortal(
    <div
      aria-labelledby="edit-reply-title-heading"
      aria-modal="true"
      className="fixed inset-0 z-[1000] flex pointer-events-auto items-center justify-center overflow-y-auto bg-slate-950/55 px-4 py-[max(1rem,env(safe-area-inset-top))] text-foreground backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="pointer-events-auto flex max-h-[min(88dvh,44rem)] w-full max-w-[38rem] flex-col overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[0_28px_90px_rgba(15,23,42,0.28)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 dark:shadow-[var(--lectum-shadow)]">
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label="Fechar edição de comentário"
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60"
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
            Editar comentário
          </h2>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            <div className="grid gap-4">
              {FieldComponent ? (
                <FieldComponent control={hook.control} {...formProps.fields[0]} />
              ) : null}

              {canManageMedia ? (
                <ReplyMediaAttachmentControl
                  currentMedia={{ mediaType: reply.media_type, mediaUrl: reply.media_url }}
                  disabled={isSubmitting}
                  fileInputRef={fileInputRef}
                  isUploading={uploadMutation.isPending}
                  mediaPermission={mediaPermission}
                  onAfterAction={focusEditor}
                  onMediaChange={handleMediaChange}
                  onRemoveCurrent={() => {
                    clearSelectedMedia();
                    setRemoveMedia(true);
                  }}
                  onRemoveSelected={() => {
                    clearSelectedMedia();
                    setRemoveMedia(false);
                  }}
                  onUndoRemove={() => setRemoveMedia(false)}
                  removeCurrent={removeMedia}
                  selectedMedia={selectedMedia}
                  variant="editor"
                />
              ) : null}

              {actionError ? (
                <InlineAlert title="Não foi possível salvar" variant="error">
                  {actionError}
                </InlineAlert>
              ) : null}
            </div>
          </div>

          <footer className="shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-surface/90 sm:px-5">
            <div className="grid gap-2 sm:flex sm:justify-end">
              <Button
                className="h-12 rounded-full border-border bg-surface px-6 font-bold text-muted shadow-none hover:border-primary/25 hover:bg-primary-soft hover:text-foreground focus-visible:outline-primary active:scale-[0.98] disabled:opacity-60"
                disabled={isSubmitting}
                onClick={onClose}
                type="button"
                variant="outline"
              >
                Cancelar
              </Button>
              <Button
                className="h-12 rounded-full bg-primary px-6 font-black text-white shadow-[0_14px_30px_rgba(48,140,232,0.26)] hover:bg-primary-hover focus-visible:outline-primary active:scale-[0.98] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none"
                disabled={isSubmitting || !canSubmit}
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
    </div>,
    document.body,
  );
}
