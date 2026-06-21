"use client";

import { Loader2, Save, Video, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { useUploadCommunityPostMedia } from "@/api/callers/community";
import { useUpdatePost } from "@/api/callers/posts";
import type { PostDetail } from "@/api/generator/types/posts";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { type Field, useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";

const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

const postEditSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Escreva um título com pelo menos 3 caracteres")
    .max(140, "Use no máximo 140 caracteres no título"),
  content: z
    .string()
    .trim()
    .min(10, "Escreva uma descrição com pelo menos 10 caracteres")
    .max(2000, "Use no máximo 2000 caracteres no texto"),
});

type PostEditForm = z.infer<typeof postEditSchema>;

type EditablePost = Pick<
  PostDetail,
  "author" | "community" | "content" | "id" | "media_type" | "media_url" | "replies_count" | "title"
>;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type PostEditModalProps = {
  onClose: () => void;
  onUpdated?: (post: PostDetail) => void;
  open: boolean;
  post: EditablePost;
};

const fields = [
  {
    name: "title",
    field: "textarea",
    id: "edit-post-title",
    label: "Título do post",
    placeholder: "Dê um título ao seu conteúdo",
    required: true,
    max: 140,
    rows: 2,
    autoGrow: true,
    className: "[&>span:last-child]:min-h-4",
    inputClassName:
      "min-h-16 resize-none rounded-2xl border-border bg-surface px-4 py-3 text-base font-black tracking-[-0.02em]",
  },
  {
    name: "content",
    field: "textarea",
    id: "edit-post-content",
    label: "Conteúdo do post",
    placeholder: "Atualize o conteúdo mantendo o contexto da conversa",
    required: true,
    max: 2000,
    rows: 8,
    autoGrow: false,
    className: "[&>span:last-child]:min-h-4",
    inputClassName: "min-h-44 resize-y rounded-2xl border-border bg-surface px-4 py-3",
  },
] satisfies Field<PostEditForm>[];

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

export function PostEditModal({ onClose, onUpdated, open, post }: PostEditModalProps) {
  const storedUser = useAppSelector((state) => state.user);
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const form = useFormList<PostEditForm>({
    fields,
    schema: postEditSchema,
    defaultValues: {
      content: post.content,
      title: post.title,
    },
  });
  const { formProps, hook } = form;
  const uploadMutation = useUploadCommunityPostMedia({
    onError: (error) => {
      toast.error(resolveMediaUploadError(error));
    },
  });
  const updateMutation = useUpdatePost({
    onSuccess: (updatedPost) => {
      toast.success("Post atualizado!");
      onUpdated?.(updatedPost);
      onClose();
    },
    onError: (error) => {
      setActionError(errorMessageFromUnknown(error));
    },
  });
  const canManageMedia = mediaPermission.canAttach && post.author.role === "psicologo";
  const shouldShowMediaControls = post.author.role === "psicologo" || Boolean(post.media_url);
  const isSubmitting = uploadMutation.isPending || updateMutation.isPending;
  const currentMediaLabel = useMemo(() => {
    if (!post.media_url) return null;

    return post.media_type === "video" ? "Vídeo atual anexado" : "Imagem atual anexada";
  }, [post.media_type, post.media_url]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      document.getElementById("edit-post-title")?.focus({ preventScroll: true });
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

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.currentTarget.value = "";

    if (!file) return;

    if (!canManageMedia) {
      toast.error(mediaPermission.reason || "Mídia disponível apenas para psicólogos verificados.");
      return;
    }

    setSelectedMedia(file);
    setRemoveMedia(false);
    setActionError(null);
  };

  const handleSubmit = hook.handleSubmit(async (values) => {
    setActionError(null);

    try {
      const media = selectedMedia
        ? await uploadMutation.mutateAsync({
            file: selectedMedia,
            slug: post.community.slug,
          })
        : null;

      await updateMutation.mutateAsync({
        id: post.id,
        body: {
          content: values.content.trim(),
          title: values.title.trim(),
          ...(media
            ? {
                mediaType: media.media_type,
                mediaUrl: media.media_url,
              }
            : removeMedia
              ? {
                  mediaType: null,
                  mediaUrl: null,
                }
              : {}),
        },
      });
    } catch {
      // Feedback fica nas mutations para preservar o conteúdo editado.
    }
  });

  if (!open) return null;

  return (
    <div
      aria-labelledby="edit-post-title-heading"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-end justify-center bg-slate-950/45 px-0 pt-8 text-foreground backdrop-blur-md sm:items-center sm:px-4 sm:py-8"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
    >
      <section className="flex max-h-[calc(100dvh-1rem)] w-full max-w-[min(100vw,44rem)] flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface shadow-[var(--lectum-shadow)] sm:max-h-[min(90dvh,760px)] sm:rounded-[2rem]">
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label="Fechar edição do post"
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-[1.15rem] font-black tracking-[-0.03em]" id="edit-post-title-heading">
            Editar Post
          </h2>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" noValidate onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <InlineAlert title="Dados fixos" variant="info">
              A comunidade e o anonimato não podem ser alterados após a publicação.
            </InlineAlert>

            {post.replies_count > 0 ? (
              <InlineAlert title="Este post já tem respostas" variant="warning">
                Edite com cuidado para preservar o contexto das respostas já publicadas.
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
                    key={`edit-post-${String(field.name)}`}
                    {...field}
                  />
                );
              })}
            </div>

            {shouldShowMediaControls ? (
              <div className="rounded-3xl border border-border bg-surface-muted/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-foreground text-sm">Mídia do post</p>
                    <p className="mt-1 text-muted text-xs leading-5">
                      Anexe uma imagem ou vídeo curto quando isso ajudar no contexto da publicação.
                    </p>
                  </div>

                  <input
                    accept={COMMUNITY_POST_MEDIA_ACCEPT}
                    className="hidden"
                    onChange={handleMediaChange}
                    ref={fileInputRef}
                    type="file"
                  />

                  <button
                    aria-label="Adicionar mídia ao post"
                    className={cn(
                      "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15",
                      canManageMedia
                        ? "border-border bg-surface text-muted hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                        : "cursor-not-allowed border-[#E5EAF0] bg-[#F8FAFC] text-[#94A3B8]",
                    )}
                    disabled={!canManageMedia || isSubmitting}
                    onClick={() => fileInputRef.current?.click()}
                    title={canManageMedia ? "Adicionar mídia" : mediaPermission.reason}
                    type="button"
                  >
                    {uploadMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Video className="h-5 w-5" aria-hidden="true" />
                    )}
                    Mídia
                  </button>
                </div>

                {!canManageMedia && mediaPermission.reason ? (
                  <p className="mt-3 text-[#64748B] text-xs font-semibold leading-5">
                    {mediaPermission.reason}
                  </p>
                ) : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {selectedMedia ? (
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-primary text-xs font-bold">
                      <span className="truncate">{selectedMedia.name}</span>
                      <button
                        aria-label="Remover mídia selecionada"
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full hover:bg-white/70"
                        disabled={isSubmitting}
                        onClick={() => setSelectedMedia(null)}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </span>
                  ) : null}

                  {!selectedMedia && currentMediaLabel && !removeMedia ? (
                    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-muted text-xs font-bold">
                      <Video className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>{currentMediaLabel}</span>
                      {canManageMedia ? (
                        <button
                          className="text-danger transition hover:text-danger/80"
                          disabled={isSubmitting}
                          onClick={() => setRemoveMedia(true)}
                          type="button"
                        >
                          Remover
                        </button>
                      ) : null}
                    </span>
                  ) : null}

                  {removeMedia ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-danger/10 px-3 py-1.5 text-danger text-xs font-bold">
                      Mídia atual será removida
                      <button
                        className="text-danger transition hover:text-danger/80"
                        disabled={isSubmitting}
                        onClick={() => setRemoveMedia(false)}
                        type="button"
                      >
                        Desfazer
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
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
