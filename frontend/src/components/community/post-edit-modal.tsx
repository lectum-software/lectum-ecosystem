"use client";

import { ChevronLeft, ChevronRight, Info, Loader2, Video, X } from "lucide-react";
import Image from "next/image";
import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useUploadCommunityPostMedia } from "@/api/callers/community";
import { useUpdatePost } from "@/api/callers/posts";
import type { PostDetail } from "@/api/generator/types/posts";
import { components } from "@/components/controllers";
import { type Field, useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";

const COMMUNITY_SELECTOR_ICON_SRC = "/svg/public_24dp_64748B_FILL0_wght400_GRAD0_opsz24.svg";
const COMMUNITY_POST_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";
const MAX_POST_CAROUSEL_IMAGES = 10;
const EDITOR_FIELD_IDS = new Set(["edit-post-title", "edit-post-content"]);
const guidanceText =
  "Lembre-se de ser respeitoso com os outros membros. Conteúdos ofensivos ou que violem as diretrizes serão removidos pela moderação.";

const postEditSchema = z.object({
  community_slug: z.string().min(1),
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
  anonymous: z.boolean().optional(),
});

type PostEditForm = z.infer<typeof postEditSchema>;

type EditablePost = Pick<
  PostDetail,
  | "anonymous"
  | "author"
  | "community"
  | "content"
  | "id"
  | "media_items"
  | "media_type"
  | "media_url"
  | "replies_count"
  | "title"
>;

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

type SelectedPostMedia = {
  file: File;
  id: string;
  orientation?: "landscape" | "portrait";
  previewUrl: string;
  type: "image" | "video";
};

type PostMediaPreviewItem = {
  caption: string;
  id: string;
  orientation?: "landscape" | "portrait";
  src: string;
  type: "image" | "video";
};

const createSelectedMediaId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

type PostEditModalProps = {
  onClose: () => void;
  onUpdated?: (post: PostDetail) => void;
  open: boolean;
  post: EditablePost;
};

const contentGuidancePlaceholder =
  "Conte aos psicólogos o que aconteceu, como você está se sentindo e o que já tentou fazer até agora.";
const psychologistTitlePlaceholder = "Dê um título ao seu conteúdo";
const psychologistContentPlaceholder =
  "Compartilhe com a comunidade uma orientação, reflexão ou conteúdo baseado na sua experiência profissional.";

const buildFields = ({
  communityName,
  communitySlug,
  isPsychologist,
}: {
  communityName: string;
  communitySlug: string;
  isPsychologist: boolean;
}) =>
  [
    {
      name: "community_slug",
      field: "select",
      className:
        "relative w-fit max-w-full gap-0 pb-5 [&>span:last-child]:absolute [&>span:last-child]:top-11 [&>span:last-child]:left-0 [&>span:last-child]:w-max [&>span:last-child]:max-w-[calc(100vw-2.5rem)] [&>span:last-child]:pl-0",
      placeholder: "Comunidade",
      emptyLabel: "Comunidade",
      hideEmptyOption: true,
      options: [{ label: communityName, value: communitySlug }],
      required: true,
      disabled: true,
      readOnly: true,
      inputClassName:
        "h-10 w-fit max-w-[calc(100vw-40px)] min-w-[188px] cursor-not-allowed overflow-visible rounded-full border-transparent bg-surface-muted px-4 py-0 text-sm font-bold leading-[1.35] text-muted opacity-75 shadow-none focus:border-transparent focus:ring-0 [&>span]:leading-[1.35]",
    },
    {
      name: "title",
      field: "textarea",
      id: "edit-post-title",
      label: "Título do post",
      placeholder: isPsychologist
        ? psychologistTitlePlaceholder
        : "Título (Diga o assunto ou faça uma pergunta)",
      required: true,
      max: 140,
      autoFocus: true,
      rows: 1,
      autoGrow: true,
      className:
        "gap-0 [&>span:first-child]:sr-only [&>span:last-child]:min-h-3 [&>span:last-child]:leading-3",
      inputClassName:
        "create-post-title-input min-h-9 resize-none overflow-hidden rounded-none border-0 border-transparent bg-transparent px-0 pt-1 pb-0 shadow-none focus:border-transparent focus:ring-0",
    },
    {
      name: "content",
      field: "textarea",
      id: "edit-post-content",
      label: "Conteúdo do post",
      placeholder: isPsychologist ? psychologistContentPlaceholder : contentGuidancePlaceholder,
      required: true,
      rows: 5,
      max: 2000,
      autoGrow: false,
      className:
        "min-h-0 flex h-full flex-1 flex-col gap-0 [&>span:first-child]:sr-only [&>span:last-child]:shrink-0",
      inputClassName:
        "create-post-content-input h-full min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-0 border-transparent bg-transparent px-0 pt-0 pb-2 shadow-none focus:border-transparent focus:ring-0",
    },
    {
      name: "anonymous",
      field: "switch",
      label: "Publicar anonimamente",
      className: "hidden",
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

const normalizeMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

export function PostEditModal({ onClose, onUpdated, open, post }: PostEditModalProps) {
  const storedUser = useAppSelector((state) => state.user);
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedEditorIdRef = useRef("edit-post-title");
  const selectedMediaPreviewUrlsRef = useRef<string[]>([]);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [selectedMediaItems, setSelectedMediaItems] = useState<SelectedPostMedia[]>([]);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [removeMedia, setRemoveMedia] = useState(false);
  const isPsychologistPost = post.author.role === "psicologo";
  const fields = useMemo(
    () =>
      buildFields({
        communityName: post.community.name,
        communitySlug: post.community.slug,
        isPsychologist: isPsychologistPost,
      }),
    [isPsychologistPost, post.community.name, post.community.slug],
  );
  const form = useFormList<PostEditForm>({
    fields,
    schema: postEditSchema,
    defaultValues: {
      anonymous: post.anonymous,
      community_slug: post.community.slug,
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
      toast.error(errorMessageFromUnknown(error));
    },
  });
  const canManageMedia = mediaPermission.canAttach && isPsychologistPost;
  const canShowMediaControls = isPsychologistPost || Boolean(post.media_url);
  const isSubmitting = uploadMutation.isPending || updateMutation.isPending;
  const normalizedPostMediaType = normalizeMediaType(post.media_type);
  const storedMediaItems = useMemo<PostMediaPreviewItem[]>(() => {
    const mediaItems = (post.media_items ?? [])
      .filter(
        (item) =>
          Boolean(item.media_url) && (item.media_type === "image" || item.media_type === "video"),
      )
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({
        caption:
          item.media_type === "video" ? "Vídeo atual anexado" : `Imagem atual anexada ${index + 1}`,
        id: item.id ?? `${item.media_url}-${item.position}`,
        src: item.media_url,
        type: item.media_type,
      }));

    if (mediaItems.length > 0) return mediaItems;

    if (!post.media_url || !normalizedPostMediaType) return [];

    return [
      {
        caption:
          normalizedPostMediaType === "video" ? "Vídeo atual anexado" : "Imagem atual anexada",
        id: "legacy-media",
        src: post.media_url,
        type: normalizedPostMediaType,
      },
    ];
  }, [normalizedPostMediaType, post.media_items, post.media_url]);
  const activeMediaItems: PostMediaPreviewItem[] =
    selectedMediaItems.length > 0
      ? selectedMediaItems.map((item) => ({
          caption: item.file.name,
          id: item.id,
          orientation: item.orientation,
          src: item.previewUrl,
          type: item.type,
        }))
      : removeMedia
        ? []
        : storedMediaItems;
  const activeMediaSafeIndex = Math.min(activeMediaIndex, Math.max(0, activeMediaItems.length - 1));
  const activeMedia = activeMediaItems[activeMediaSafeIndex] ?? null;
  const focusLastEditor = () => {
    window.setTimeout(() => {
      const target = document.getElementById(lastFocusedEditorIdRef.current) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      target?.focus({ preventScroll: true });
    }, 0);
  };

  const preserveEditorFocusFromBlankTap = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    focusLastEditor();
  };

  const revokeSelectedMediaPreview = useCallback(() => {
    selectedMediaPreviewUrlsRef.current.forEach((previewUrl) => {
      URL.revokeObjectURL(previewUrl);
    });
    selectedMediaPreviewUrlsRef.current = [];
  }, []);

  const clearSelectedMedia = useCallback(() => {
    revokeSelectedMediaPreview();
    setSelectedMediaItems([]);
    setActiveMediaIndex(0);
  }, [revokeSelectedMediaPreview]);

  const removeSelectedMediaAt = useCallback((index: number) => {
    setSelectedMediaItems((currentItems) => {
      const removedItem = currentItems[index];
      if (!removedItem) return currentItems;

      URL.revokeObjectURL(removedItem.previewUrl);
      selectedMediaPreviewUrlsRef.current = selectedMediaPreviewUrlsRef.current.filter(
        (previewUrl) => previewUrl !== removedItem.previewUrl,
      );

      const nextItems = currentItems.filter((_, currentIndex) => currentIndex !== index);
      setActiveMediaIndex((currentIndex) =>
        nextItems.length === 0 ? 0 : Math.min(currentIndex, nextItems.length - 1),
      );

      return nextItems;
    });
  }, []);

  const updateSelectedMediaOrientation = useCallback(
    (id: string, orientation: SelectedPostMedia["orientation"]) => {
      setSelectedMediaItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? { ...item, orientation } : item)),
      );
    },
    [],
  );

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      document.getElementById("edit-post-title")?.focus({ preventScroll: true });
    }, 180);
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
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) return;

    if (!canManageMedia) {
      toast.error(mediaPermission.reason || "Mídia disponível apenas para psicólogos verificados.");
      focusLastEditor();
      return;
    }

    const videoFiles = files.filter((file) => file.type.startsWith("video/"));
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (videoFiles.length > 0) {
      if (files.length > 1 || imageFiles.length > 0) {
        toast.error(
          "Vídeos devem ser anexados individualmente. Para carrossel, selecione apenas imagens.",
        );
        focusLastEditor();
        return;
      }

      clearSelectedMedia();
      const previewUrl = URL.createObjectURL(videoFiles[0]);
      selectedMediaPreviewUrlsRef.current = [previewUrl];
      setSelectedMediaItems([
        {
          file: videoFiles[0],
          id: createSelectedMediaId(),
          previewUrl,
          type: "video",
        },
      ]);
      setActiveMediaIndex(0);
      setRemoveMedia(false);
      focusLastEditor();
      return;
    }

    if (imageFiles.length === 0) {
      toast.error("Envie uma imagem ou vídeo em formato permitido.");
      focusLastEditor();
      return;
    }

    const replacingExistingMedia = selectedMediaItems.length === 0 && storedMediaItems.length > 0;
    const replacingVideo =
      replacingExistingMedia || selectedMediaItems.some((item) => item.type === "video");
    const baseItems = replacingVideo
      ? []
      : selectedMediaItems.filter((item) => item.type === "image");
    const availableSlots = MAX_POST_CAROUSEL_IMAGES - baseItems.length;

    if (availableSlots <= 0) {
      toast.error(`Você pode anexar até ${MAX_POST_CAROUSEL_IMAGES} imagens por post.`);
      focusLastEditor();
      return;
    }

    if (replacingVideo) {
      clearSelectedMedia();
    }

    const filesToAttach = imageFiles.slice(0, availableSlots);
    if (imageFiles.length > availableSlots) {
      toast.error(
        `Só foi possível anexar ${availableSlots} imagem(ns). O limite é ${MAX_POST_CAROUSEL_IMAGES}.`,
      );
    }

    const nextItems = filesToAttach.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      selectedMediaPreviewUrlsRef.current.push(previewUrl);

      return {
        file,
        id: createSelectedMediaId(),
        previewUrl,
        type: "image" as const,
      };
    });

    setSelectedMediaItems([...baseItems, ...nextItems]);
    setActiveMediaIndex(baseItems.length);
    setRemoveMedia(false);
    focusLastEditor();
  };

  const handleSubmit = hook.handleSubmit(async (values) => {
    try {
      const uploadedMedia =
        selectedMediaItems.length > 0
          ? await Promise.all(
              selectedMediaItems.map((mediaItem) =>
                uploadMutation.mutateAsync({
                  file: mediaItem.file,
                  slug: post.community.slug,
                }),
              ),
            )
          : [];
      const firstMedia = uploadedMedia[0] ?? null;
      const imageMediaItems = uploadedMedia
        .filter((media) => media.media_type === "image")
        .map((media, index) => ({
          mediaType: "image" as const,
          mediaUrl: media.media_url,
          position: index,
        }));

      await updateMutation.mutateAsync({
        id: post.id,
        body: {
          content: values.content.trim(),
          title: values.title.trim(),
          ...(firstMedia
            ? {
                mediaType: firstMedia.media_type,
                mediaUrl: firstMedia.media_url,
                ...(imageMediaItems.length > 0 ? { mediaItems: imageMediaItems } : {}),
              }
            : removeMedia
              ? {
                  mediaItems: null,
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
  const clearCorrectedFormErrorsSoon = () => {
    window.setTimeout(() => {
      const values = hook.getValues();
      const hasValidTitle = String(values.title ?? "").trim().length >= 3;
      const hasValidContent = String(values.content ?? "").trim().length >= 10;

      if (hasValidTitle) {
        hook.clearErrors("title");
      }

      if (hasValidContent) {
        hook.clearErrors("content");
      }

      if (hasValidTitle && hasValidContent) {
        hook.clearErrors();
      }
    }, 0);
  };

  const renderFormField = (field: (typeof formProps.fields)[number]) => {
    const Component = components[field.field];

    if (!Component) return null;

    if (field.name === "community_slug") {
      return (
        <div className="relative inline-block w-fit max-w-full align-top" key="edit-post-community">
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute top-5 left-4 z-10 h-4 w-4 -translate-y-1/2 text-muted"
            height={16}
            src={COMMUNITY_SELECTOR_ICON_SRC}
            width={16}
          />
          <Component
            control={hook.control}
            {...field}
            inputClassName={cn(
              field.inputClassName,
              "pl-11 pr-10 leading-[1.35] [&>span]:leading-[1.35]",
            )}
          />
        </div>
      );
    }

    if (field.name === "title") {
      return (
        <Component
          control={hook.control}
          key={`edit-post-${String(field.name)}`}
          {...field}
          onChangeCallback={(value) => {
            field.onChangeCallback?.(value);
            if (String(value ?? "").trim().length >= 3) {
              hook.clearErrors("title");
            }
            clearCorrectedFormErrorsSoon();
          }}
        />
      );
    }

    if (field.name === "content") {
      return (
        <Component
          control={hook.control}
          key={`edit-post-${String(field.name)}`}
          {...field}
          onChangeCallback={(value) => {
            field.onChangeCallback?.(value);
            if (String(value ?? "").trim().length >= 10) {
              hook.clearErrors("content");
            }
            clearCorrectedFormErrorsSoon();
          }}
        />
      );
    }

    return <Component control={hook.control} key={`edit-post-${String(field.name)}`} {...field} />;
  };

  const renderAnonymousControls = () => (
    <Controller
      control={hook.control}
      name="anonymous"
      render={({ field }) => {
        const checked = Boolean(field.value);

        return (
          <div className="relative min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2.5 opacity-65">
              <span className="min-w-0 text-[0.78rem] font-bold leading-4 text-muted sm:text-sm">
                Publicar anonimamente
              </span>
              <button
                aria-checked={checked}
                aria-label="Publicar anonimamente"
                className={cn(
                  "relative h-7 w-12 shrink-0 cursor-not-allowed rounded-full bg-surface-muted ring-1 ring-border transition",
                  checked && "bg-primary ring-primary/20",
                )}
                disabled
                role="switch"
                title="O anonimato não pode ser alterado após a publicação."
                type="button"
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 h-5 w-5 rounded-full bg-surface shadow-[var(--lectum-shadow-soft)] transition",
                    checked && "translate-x-5",
                  )}
                />
              </button>
            </div>
          </div>
        );
      }}
    />
  );

  const renderSelectedMediaPreview = () => {
    if (!activeMedia) {
      if (!removeMedia) return null;

      return (
        <div className="mt-3 flex shrink-0 justify-start">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-muted text-xs font-bold">
            Mídia atual será removida
            <button
              className="text-muted transition hover:text-foreground"
              disabled={isSubmitting}
              onClick={() => {
                setRemoveMedia(false);
                focusLastEditor();
              }}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              Desfazer
            </button>
          </span>
        </div>
      );
    }

    const hasMultipleImages =
      activeMediaItems.length > 1 && activeMediaItems.every((item) => item.type === "image");
    const activePreviewRatio =
      activeMedia.orientation === "landscape" || hasMultipleImages
        ? "aspect-video"
        : "aspect-[9/14]";
    const previewWidth =
      activeMedia.orientation === "landscape" || hasMultipleImages
        ? "w-[min(18rem,72vw)] sm:w-64"
        : "w-[min(9.5rem,48vw)] sm:w-28";

    return (
      <div className="mt-3 flex shrink-0 justify-start">
        <figure
          className={cn(
            "relative overflow-hidden rounded-[1.4rem] border border-border bg-surface-muted shadow-[var(--lectum-shadow-soft)]",
            previewWidth,
          )}
        >
          <div
            className={cn("relative w-full overflow-hidden bg-surface-muted", activePreviewRatio)}
          >
            {activeMedia.type === "image" ? (
              <Image
                alt="Miniatura da mídia do post"
                className="object-cover"
                fill
                onLoad={(event) => {
                  if (selectedMediaItems.length === 0) return;
                  const { naturalHeight, naturalWidth } = event.currentTarget;
                  updateSelectedMediaOrientation(
                    activeMedia.id,
                    naturalWidth && naturalHeight && naturalWidth / naturalHeight >= 1.12
                      ? "landscape"
                      : "portrait",
                  );
                }}
                sizes="(min-width: 640px) 256px, 288px"
                src={activeMedia.src}
                unoptimized
              />
            ) : (
              <video
                aria-label="Miniatura do vídeo do post"
                className="h-full w-full object-cover"
                muted
                onLoadedMetadata={(event) => {
                  if (selectedMediaItems.length === 0) return;
                  const { videoHeight, videoWidth } = event.currentTarget;
                  updateSelectedMediaOrientation(
                    activeMedia.id,
                    videoWidth && videoHeight && videoWidth / videoHeight >= 1.12
                      ? "landscape"
                      : "portrait",
                  );
                }}
                playsInline
                preload="metadata"
                src={activeMedia.src}
              />
            )}

            {canManageMedia ? (
              <button
                aria-label="Remover mídia anexada"
                className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-muted shadow-[var(--lectum-shadow-soft)] transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                disabled={isSubmitting}
                onClick={() => {
                  if (selectedMediaItems.length > 0) {
                    removeSelectedMediaAt(activeMediaSafeIndex);
                    setRemoveMedia(false);
                  } else {
                    setRemoveMedia(true);
                    setActiveMediaIndex(0);
                  }
                  focusLastEditor();
                }}
                onMouseDown={(event) => event.preventDefault()}
                tabIndex={-1}
                type="button"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}

            {hasMultipleImages ? (
              <>
                <button
                  aria-label="Imagem anterior"
                  className="absolute top-1/2 left-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-950/45 text-white backdrop-blur transition hover:bg-slate-950/65 focus:outline-none focus:ring-2 focus:ring-white/70"
                  disabled={isSubmitting}
                  onClick={() => {
                    setActiveMediaIndex((current) =>
                      current <= 0 ? activeMediaItems.length - 1 : current - 1,
                    );
                    focusLastEditor();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  tabIndex={-1}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  aria-label="Próxima imagem"
                  className="absolute top-1/2 right-12 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-slate-950/45 text-white backdrop-blur transition hover:bg-slate-950/65 focus:outline-none focus:ring-2 focus:ring-white/70"
                  disabled={isSubmitting}
                  onClick={() => {
                    setActiveMediaIndex((current) =>
                      current >= activeMediaItems.length - 1 ? 0 : current + 1,
                    );
                    focusLastEditor();
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  tabIndex={-1}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1">
                  {activeMediaItems.map((item, index) => (
                    <button
                      aria-label={`Mostrar imagem ${index + 1}`}
                      className={cn(
                        "h-1.5 rounded-full bg-white/65 transition-all",
                        index === activeMediaSafeIndex ? "w-4 bg-white" : "w-1.5",
                      )}
                      disabled={isSubmitting}
                      key={item.id}
                      onClick={() => {
                        setActiveMediaIndex(index);
                        focusLastEditor();
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      tabIndex={-1}
                      type="button"
                    />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </figure>
      </div>
    );
  };
  const renderPsychologistMediaButton = () => (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <input
        accept={COMMUNITY_POST_MEDIA_ACCEPT}
        className="hidden"
        multiple
        onChange={handleMediaChange}
        ref={fileInputRef}
        type="file"
      />
      <button
        aria-label="Adicionar mídia ao post"
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15",
          canManageMedia
            ? "border-border bg-surface-muted text-muted hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
            : "cursor-not-allowed border-[#E5EAF0] bg-[#F8FAFC] text-[#94A3B8] hover:border-[#E5EAF0] hover:bg-[#F8FAFC] hover:text-[#94A3B8]",
        )}
        disabled={!canManageMedia || isSubmitting}
        onClick={() => {
          fileInputRef.current?.click();
          focusLastEditor();
        }}
        onMouseDown={(event) => event.preventDefault()}
        tabIndex={-1}
        title={canManageMedia ? "Adicionar mídia" : mediaPermission.reason}
        type="button"
      >
        {uploadMutation.isPending ? (
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        ) : (
          <Video className="h-5 w-5" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Mídia</span>
      </button>

      {!canManageMedia && mediaPermission.reason ? (
        <span className="min-w-0 flex-1 basis-52 whitespace-normal text-[#64748B] text-xs font-semibold leading-4">
          {mediaPermission.reason}
        </span>
      ) : null}
    </div>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/35 opacity-100 backdrop-blur-[8px] transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-slate-950/35">
      <section
        aria-labelledby="edit-post-title-heading"
        aria-modal="true"
        className="flex h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[min(100vw,44rem)] translate-y-0 flex-col overflow-hidden rounded-t-[2rem] border border-border bg-surface text-foreground shadow-[var(--lectum-shadow)] transition-transform duration-300 ease-out sm:mb-6 sm:h-[min(86dvh,760px)] sm:rounded-[2rem]"
        role="dialog"
      >
        <header className="relative flex h-16 shrink-0 items-center justify-center border-border/70 border-b px-4">
          <button
            aria-label="Fechar edição de post"
            className="absolute left-3 grid h-10 w-10 place-items-center rounded-full text-foreground transition hover:bg-surface-muted focus:outline-none focus:ring-4 focus:ring-primary/15"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <h2 className="text-[1.2rem] font-black tracking-[-0.03em]" id="edit-post-title-heading">
            Editar Post
          </h2>
          <div className="absolute right-3">
            <button
              aria-expanded={isGuidanceOpen}
              aria-label="Ver diretrizes do post"
              className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
              onClick={() => {
                setIsGuidanceOpen((current) => !current);
                focusLastEditor();
              }}
              onMouseDown={(event) => event.preventDefault()}
              tabIndex={-1}
              type="button"
            >
              <Info className="h-5 w-5" aria-hidden="true" />
            </button>
            {isGuidanceOpen ? (
              <div className="absolute top-12 right-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted shadow-[var(--lectum-shadow-soft)]">
                {guidanceText}
              </div>
            ) : null}
          </div>
        </header>

        <form
          className="flex min-h-0 flex-1 flex-col"
          noValidate
          onFocusCapture={(event) => {
            const target = event.target as HTMLElement;
            if (EDITOR_FIELD_IDS.has(target.id)) {
              lastFocusedEditorIdRef.current = target.id;
            }
          }}
          onSubmit={handleSubmit}
        >
          <div
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-5 pt-4 pb-4"
            onPointerDown={preserveEditorFocusFromBlankTap}
          >
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                {formProps.fields
                  .filter((field) => field.name === "community_slug")
                  .map(renderFormField)}
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-0">
                <div onPointerDown={preserveEditorFocusFromBlankTap}>
                  {formProps.fields.filter((field) => field.name === "title").map(renderFormField)}
                </div>

                <div
                  className="flex min-h-0 flex-1 flex-col"
                  onPointerDown={preserveEditorFocusFromBlankTap}
                >
                  {formProps.fields
                    .filter((field) => field.name === "content")
                    .map(renderFormField)}
                  {renderSelectedMediaPreview()}
                </div>
              </div>
            </div>
          </div>

          <footer className="relative shrink-0 border-border/70 border-t bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-surface/90">
            <div className="flex min-h-12 items-center justify-between gap-3">
              {canShowMediaControls ? renderPsychologistMediaButton() : renderAnonymousControls()}

              <Button
                className="h-12 min-w-[6.5rem] shrink-0 rounded-full px-6 text-base font-black shadow-[var(--lectum-shadow-soft)] disabled:bg-surface-muted disabled:text-muted disabled:opacity-100 disabled:shadow-none"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                ) : null}
                Salvar
              </Button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
