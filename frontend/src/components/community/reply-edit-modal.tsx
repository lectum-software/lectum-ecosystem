"use client";

import { Loader2, Save, X } from "lucide-react";
import { type ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { z } from "zod";
import { useUpdatePostReply, useUploadPostReplyMedia } from "@/api/callers/posts";
import { getSafeApiErrorMessage } from "@/api/errors";
import type { PostReply, UserPostReply } from "@/api/generator/types/posts";
import {
  detectReplyMediaOrientation,
  mediaTypeFromFile,
  ReplyMediaAttachmentControl,
  type SelectedReplyMedia,
} from "@/components/community/reply-media-attachment-control";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { type Field, useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import { normalizeLectumShareProfessionalRole } from "@/utils/lectum-share-target";
import { resolveMediaUploadError } from "@/utils/media-upload-error";
import {
  createVideoThumbnailFile,
  type LectumVideoThumbnailFrameOptions,
} from "@/utils/video-thumbnail";

const replyEditSchema = z.object({
  content: z.string().trim().max(2000, "Use no máximo 2000 caracteres no texto"),
});

type ReplyEditForm = z.infer<typeof replyEditSchema>;

type EditableReply = Pick<
  UserPostReply,
  "author" | "content" | "id" | "media_type" | "media_url" | "parent_reply_id" | "thumbnail_url"
> & {
  replies_count?: number;
  replies_received_count?: number;
};

type ReplyEditModalProps = {
  onClose: () => void;
  onUpdated?: (reply: PostReply) => void;
  open: boolean;
  postId: string;
  reply: EditableReply;
  sourceText?: string | null;
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
      "min-h-[5rem] resize-none rounded-[1.35rem] border-border bg-surface px-4 py-3.5 text-[0.95rem] leading-6 shadow-none",
  },
] satisfies Field<ReplyEditForm>[];

export function ReplyEditModal({
  onClose,
  onUpdated,
  open,
  postId,
  reply,
  sourceText,
}: ReplyEditModalProps) {
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
      setActionError(getSafeApiErrorMessage(error, "Não foi possível atualizar o comentário."));
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
    const type = mediaTypeFromFile(file);
    selectedMediaPreviewUrlRef.current = previewUrl;
    setSelectedMedia({
      file,
      orientation: undefined,
      previewUrl,
      type,
    });
    void detectReplyMediaOrientation(previewUrl, type).then((orientation) => {
      setSelectedMedia((current) =>
        current?.previewUrl === previewUrl ? { ...current, orientation } : current,
      );
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
      const thumbnailFrame =
        selectedMedia && reply.author.role === "psicologo"
          ? ({
              cardLabel: "Respondido na Lectum",
              professional: {
                avatar: reply.author.avatar,
                name: reply.author.name,
                roleLabel: normalizeLectumShareProfessionalRole(reply.author.type_label),
                verified: reply.author.verified,
              },
              sourceText: sourceText ?? reply.content,
            } satisfies LectumVideoThumbnailFrameOptions)
          : null;
      const thumbnailFile =
        selectedMedia && uploadedMedia?.media_type === "video"
          ? await createVideoThumbnailFile(selectedMedia.file, {
              lectumShareFrame: thumbnailFrame,
            })
          : null;
      const uploadedThumbnail = thumbnailFile
        ? await uploadMutation.mutateAsync({
            file: thumbnailFile,
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
                ...(uploadedMedia.media_type === "video" && uploadedThumbnail
                  ? { thumbnailUrl: uploadedThumbnail.media_url }
                  : {}),
              }
            : removeMedia
              ? {
                  mediaType: null,
                  mediaUrl: null,
                  thumbnailUrl: null,
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
  const contentField = {
    ...formProps.fields[0],
    inputClassName: cn(
      formProps.fields[0].inputClassName,
      hasEffectiveMedia
        ? "max-h-[min(8.5rem,24dvh)] sm:max-h-[min(10rem,28dvh)]"
        : "max-h-[min(16rem,40dvh)] sm:max-h-[min(18rem,46dvh)]",
    ),
  };

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
          <div className="min-h-0 flex-1 overflow-hidden px-5 py-5 sm:px-6">
            <div className="grid gap-4">
              {FieldComponent ? <FieldComponent control={hook.control} {...contentField} /> : null}

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
