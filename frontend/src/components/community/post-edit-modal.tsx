"use client";

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
import { toast } from "sonner";
import { useUploadCommunityPostMedia } from "@/api/callers/community";
import { useUpdatePost } from "@/api/callers/posts";
import { getSafeApiErrorMessage } from "@/api/errors";
import { CommunityVideoUploadProgress } from "@/components/community/community-video-upload-progress";
import { components } from "@/components/controllers";
import { useFormList } from "@/hooks/form";
import { useAppSelector } from "@/hooks/redux";
import { useCommunityVideoUpload } from "@/hooks/use-community-video-upload";
import { cn } from "@/lib/utils";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import { normalizeLectumShareProfessionalRole } from "@/utils/lectum-share-target";
import { mapWithConcurrency } from "@/utils/map-with-concurrency";
import { isUploadPreparationCanceled, resolvePublicMediaKind } from "@/utils/media-preparation";
import {
  getCommunityMediaFileSelectionSizeError,
  resolveMediaUploadError,
} from "@/utils/media-upload-error";
import { throwIfMediaUploadCanceled } from "@/utils/upload-lifecycle";
import {
  createVideoThumbnailFile,
  type LectumVideoThumbnailFrameOptions,
} from "@/utils/video-thumbnail";
import { PostEditMediaPreview } from "./post-edit-media-preview";
import { PostEditAnonymousControls, PostEditMediaButton } from "./post-edit-modal-controls";
import {
  buildFields,
  COMMUNITY_SELECTOR_ICON_SRC,
  createSelectedMediaId,
  EDITOR_FIELD_IDS,
  type EditablePostMediaPreviewItem,
  MAX_POST_CAROUSEL_IMAGES,
  normalizeMediaType,
  type PostEditForm,
  type PostEditModalProps,
  type PostMediaPreviewItem,
  postEditSchema,
  type SelectedPostMedia,
} from "./post-edit-modal-support";
import { PostEditModalView } from "./post-edit-modal-view";

export function PostEditModal({ onClose, onUpdated, open, post }: PostEditModalProps) {
  const storedUser = useAppSelector((state) => state.user);
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedEditorIdRef = useRef("edit-post-title");
  const selectedMediaPreviewUrlsRef = useRef<string[]>([]);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [selectedMediaItems, setSelectedMediaItems] = useState<SelectedPostMedia[]>([]);
  const [removedStoredMediaIds, setRemovedStoredMediaIds] = useState<string[]>([]);
  const [storedMediaOrientations, setStoredMediaOrientations] = useState<
    Record<string, SelectedPostMedia["orientation"]>
  >({});
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
  const { abortActiveVideoUpload, beginVideoUpload, cancelActiveVideoUpload, videoUploadProgress } =
    useCommunityVideoUpload();
  const handleClose = useCallback(() => {
    abortActiveVideoUpload();
    onClose();
  }, [abortActiveVideoUpload, onClose]);
  const uploadMutation = useUploadCommunityPostMedia({
    onError: (error) => {
      if (isUploadPreparationCanceled(error)) return;
      toast.error(resolveMediaUploadError(error));
    },
  });
  const updateMutation = useUpdatePost({
    onSuccess: (updatedPost) => {
      toast.success("Post atualizado!");
      onUpdated?.(updatedPost);
      handleClose();
    },
    onError: (error) => {
      toast.error(getSafeApiErrorMessage(error, "Não foi possível atualizar o post."));
    },
  });
  const canManageMedia = mediaPermission.canAttach && isPsychologistPost;
  const isSubmitting =
    hook.formState.isSubmitting || uploadMutation.isPending || updateMutation.isPending;
  const isUploadingMedia =
    uploadMutation.isPending ||
    (hook.formState.isSubmitting && selectedMediaItems.length > 0 && !updateMutation.isPending);
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
        thumbnailUrl: item.thumbnail_url,
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
        thumbnailUrl: post.thumbnail_url,
        type: normalizedPostMediaType,
      },
    ];
  }, [normalizedPostMediaType, post.media_items, post.media_url, post.thumbnail_url]);
  const canShowMediaControls = isPsychologistPost || storedMediaItems.length > 0;
  const visibleStoredMediaItems = useMemo<EditablePostMediaPreviewItem[]>(
    () =>
      storedMediaItems
        .filter((item) => !removedStoredMediaIds.includes(item.id))
        .map((item) => ({
          ...item,
          orientation: storedMediaOrientations[item.id] ?? item.orientation,
          source: "stored" as const,
        })),
    [removedStoredMediaIds, storedMediaItems, storedMediaOrientations],
  );
  const selectedMediaPreviewItems = useMemo<EditablePostMediaPreviewItem[]>(
    () =>
      selectedMediaItems.map((item, index) => ({
        caption: item.file.name,
        id: item.id,
        orientation: item.orientation,
        selectedIndex: index,
        source: "selected" as const,
        src: item.previewUrl,
        type: item.type,
      })),
    [selectedMediaItems],
  );
  const editableMediaItems = useMemo<EditablePostMediaPreviewItem[]>(
    () => [...visibleStoredMediaItems, ...selectedMediaPreviewItems],
    [selectedMediaPreviewItems, visibleStoredMediaItems],
  );
  const focusLastEditor = useCallback(() => {
    window.setTimeout(() => {
      const target = document.getElementById(lastFocusedEditorIdRef.current) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      target?.focus({ preventScroll: true });
    }, 0);
  }, []);

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

  const removeSelectedMediaAt = useCallback((index: number) => {
    setSelectedMediaItems((currentItems) => {
      const removedItem = currentItems[index];
      if (!removedItem) return currentItems;

      URL.revokeObjectURL(removedItem.previewUrl);
      selectedMediaPreviewUrlsRef.current = selectedMediaPreviewUrlsRef.current.filter(
        (previewUrl) => previewUrl !== removedItem.previewUrl,
      );

      return currentItems.filter((_, currentIndex) => currentIndex !== index);
    });
  }, []);

  const removeStoredMedia = useCallback((id: string) => {
    setRemovedStoredMediaIds((currentIds) =>
      currentIds.includes(id) ? currentIds : [...currentIds, id],
    );
  }, []);

  const updateSelectedMediaOrientation = useCallback(
    (id: string, orientation: SelectedPostMedia["orientation"]) => {
      setSelectedMediaItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? { ...item, orientation } : item)),
      );
    },
    [],
  );

  const updateStoredMediaOrientation = useCallback(
    (id: string, orientation: SelectedPostMedia["orientation"]) => {
      setStoredMediaOrientations((currentOrientations) =>
        currentOrientations[id] === orientation
          ? currentOrientations
          : { ...currentOrientations, [id]: orientation },
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
      if (event.key === "Escape") handleClose();
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
  }, [handleClose, open]);

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

    if (files.some((file) => resolvePublicMediaKind(file) === null)) {
      toast.error("Envie uma imagem ou vídeo em formato permitido.");
      focusLastEditor();
      return;
    }

    const sizeError = files.map(getCommunityMediaFileSelectionSizeError).find(Boolean);
    if (sizeError) {
      toast.error(resolveMediaUploadError(sizeError));
      focusLastEditor();
      return;
    }

    const videoFiles = files.filter((file) => resolvePublicMediaKind(file) === "video");
    const imageFiles = files.filter((file) => resolvePublicMediaKind(file) === "image");
    const hasAttachedMedia = editableMediaItems.length > 0;
    const hasAttachedVideo = editableMediaItems.some((item) => item.type === "video");

    if (videoFiles.length > 0) {
      if (files.length > 1 || imageFiles.length > 0) {
        toast.error(
          "Vídeos devem ser anexados individualmente. Para carrossel, selecione apenas imagens.",
        );
        focusLastEditor();
        return;
      }

      if (hasAttachedMedia) {
        toast.error(
          hasAttachedVideo
            ? "Remova o vídeo atual antes de anexar outro vídeo."
            : "Remova as imagens atuais antes de anexar um vídeo.",
        );
        focusLastEditor();
        return;
      }

      const previewUrl = URL.createObjectURL(videoFiles[0]);
      selectedMediaPreviewUrlsRef.current.push(previewUrl);
      setSelectedMediaItems([
        {
          file: videoFiles[0],
          id: createSelectedMediaId(),
          previewUrl,
          type: "video",
        },
      ]);
      focusLastEditor();
      return;
    }

    if (hasAttachedVideo) {
      toast.error("Remova o vídeo atual antes de anexar imagens.");
      focusLastEditor();
      return;
    }

    const currentImageCount = editableMediaItems.filter((item) => item.type === "image").length;
    const availableSlots = MAX_POST_CAROUSEL_IMAGES - currentImageCount;

    if (availableSlots <= 0) {
      toast.error(`Você pode anexar até ${MAX_POST_CAROUSEL_IMAGES} imagens por post.`);
      focusLastEditor();
      return;
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

    setSelectedMediaItems((currentItems) => [...currentItems, ...nextItems]);
    focusLastEditor();
  };

  const handleSubmit = hook.handleSubmit(async (values) => {
    try {
      const selectedVideo =
        selectedMediaItems.find((mediaItem) => mediaItem.type === "video") ?? null;
      const { uploadedMedia, uploadedThumbnail } = await (async () => {
        const operation = selectedVideo ? beginVideoUpload() : null;

        try {
          const uploadedMedia = selectedVideo
            ? [
                await uploadMutation.mutateAsync({
                  file: selectedVideo.file,
                  onProgress: operation?.onProgress,
                  signal: operation?.signal,
                  slug: post.community.slug,
                }),
              ]
            : selectedMediaItems.length > 0
              ? await mapWithConcurrency(selectedMediaItems, 2, (mediaItem) =>
                  uploadMutation.mutateAsync({
                    file: mediaItem.file,
                    slug: post.community.slug,
                  }),
                )
              : [];
          const thumbnailFrame =
            selectedVideo && post.author.role === "psicologo"
              ? ({
                  cardLabel: "Postado na Lectum",
                  professional: {
                    avatar: post.author.avatar,
                    name: post.author.name,
                    roleLabel: normalizeLectumShareProfessionalRole(post.author.type_label),
                    verified: post.author.verified,
                  },
                  sourceText: values.title,
                } satisfies LectumVideoThumbnailFrameOptions)
              : null;
          const thumbnailFile = selectedVideo
            ? await createVideoThumbnailFile(selectedVideo.file, {
                lectumShareFrame: thumbnailFrame,
                signal: operation?.signal,
              })
            : null;
          throwIfMediaUploadCanceled(operation?.signal);
          const uploadedThumbnail = thumbnailFile
            ? await uploadMutation.mutateAsync({
                file: thumbnailFile,
                purpose: "generated-video-thumbnail",
                signal: operation?.signal,
                slug: post.community.slug,
              })
            : null;
          throwIfMediaUploadCanceled(operation?.signal);

          return { uploadedMedia, uploadedThumbnail };
        } finally {
          operation?.complete();
        }
      })();
      const uploadedVideo = uploadedMedia.find((media) => media.media_type === "video") ?? null;
      const uploadedImageMediaItems = uploadedMedia
        .filter((media) => media.media_type === "image")
        .map((media, index) => ({
          mediaType: "image" as const,
          mediaUrl: media.media_url,
          position: index,
        }));
      const retainedImageMediaItems = visibleStoredMediaItems
        .filter((media) => media.type === "image")
        .map((media, index) => ({
          mediaType: "image" as const,
          mediaUrl: media.src,
          position: index,
        }));
      const retainedVideoMedia = visibleStoredMediaItems.find((media) => media.type === "video");
      const mediaChangeRequested =
        removedStoredMediaIds.length > 0 || selectedMediaItems.length > 0;
      const nextImageMediaItems = [...retainedImageMediaItems, ...uploadedImageMediaItems].map(
        (media, index) => ({
          ...media,
          position: index,
        }),
      );
      const mediaPayload = mediaChangeRequested
        ? uploadedVideo
          ? {
              mediaType: "video" as const,
              mediaUrl: uploadedVideo.media_url,
              thumbnailUrl: uploadedThumbnail?.media_url ?? null,
            }
          : retainedVideoMedia
            ? {
                mediaType: "video" as const,
                mediaUrl: retainedVideoMedia.src,
                thumbnailUrl: retainedVideoMedia.thumbnailUrl ?? null,
              }
            : nextImageMediaItems.length > 0
              ? {
                  mediaItems: nextImageMediaItems,
                  mediaType: "image" as const,
                  mediaUrl: nextImageMediaItems[0]?.mediaUrl ?? "",
                }
              : {
                  mediaItems: null,
                  mediaType: null,
                  mediaUrl: null,
                }
        : {};

      await updateMutation.mutateAsync({
        id: post.id,
        body: {
          content: values.content.trim(),
          title: values.title.trim(),
          ...mediaPayload,
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

  if (!open) return null;

  return (
    <PostEditModalView
      communityFields={formProps.fields
        .filter((field) => field.name === "community_slug")
        .map(renderFormField)}
      contentFields={formProps.fields
        .filter((field) => field.name === "content")
        .map(renderFormField)}
      footerControls={
        canShowMediaControls ? (
          <PostEditMediaButton
            canManageMedia={canManageMedia}
            fileInputRef={fileInputRef}
            isSubmitting={isSubmitting}
            isUploading={isUploadingMedia}
            mediaPermissionReason={mediaPermission.reason}
            onFocusEditor={focusLastEditor}
            onMediaChange={handleMediaChange}
          />
        ) : (
          <PostEditAnonymousControls control={hook.control} />
        )
      }
      isGuidanceOpen={isGuidanceOpen}
      isSubmitting={isSubmitting}
      mediaPreview={
        <PostEditMediaPreview
          canManageMedia={canManageMedia}
          disabled={isSubmitting}
          items={editableMediaItems}
          onFocusEditor={focusLastEditor}
          onRemoveSelected={removeSelectedMediaAt}
          onRemoveStored={removeStoredMedia}
          onUpdateSelectedOrientation={updateSelectedMediaOrientation}
          onUpdateStoredOrientation={updateStoredMediaOrientation}
        />
      }
      onClose={handleClose}
      onFocusCapture={(event) => {
        const target = event.target as HTMLElement;
        if (EDITOR_FIELD_IDS.has(target.id)) {
          lastFocusedEditorIdRef.current = target.id;
        }
      }}
      onPointerDown={preserveEditorFocusFromBlankTap}
      onSubmit={handleSubmit}
      onToggleGuidance={() => {
        setIsGuidanceOpen((current) => !current);
        focusLastEditor();
      }}
      titleFields={formProps.fields.filter((field) => field.name === "title").map(renderFormField)}
      uploadStatus={
        videoUploadProgress ? (
          <CommunityVideoUploadProgress
            onCancel={cancelActiveVideoUpload}
            progress={videoUploadProgress}
          />
        ) : null
      }
    />
  );
}
