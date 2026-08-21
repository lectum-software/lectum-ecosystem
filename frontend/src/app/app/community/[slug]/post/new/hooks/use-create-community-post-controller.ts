"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
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
import {
  useCommunities,
  useCreateCommunityPost,
  useUploadCommunityPostMedia,
} from "@/api/callers/community";
import { useAppSelector } from "@/hooks/redux";
import { COMMUNITY_FEED_SLUG, DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getCommunityMediaPermission } from "@/utils/community-media-permission";
import { mapWithConcurrency } from "@/utils/map-with-concurrency";
import { resolvePublicMediaKind } from "@/utils/media-preparation";
import {
  COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE,
  isCommunityMediaFileTooLarge,
  resolveMediaUploadError,
} from "@/utils/media-upload-error";
import { navigateBackWithFallback } from "@/utils/navigation-history";
import {
  createVideoThumbnailFile,
  type LectumVideoThumbnailFrameOptions,
} from "@/utils/video-thumbnail";
import {
  communityNameCollator,
  createSelectedMediaId,
  EDITOR_FIELD_IDS,
  getCreatePostInitialEditorFocusDelays,
  LAST_CREATED_POST_HREF_KEY,
  MAX_POST_CAROUSEL_IMAGES,
  normalizeParam,
  resolveCreatePostError,
  resolveKeyboardViewportOffset,
  type SelectedPostMedia,
  SHEET_CLOSE_DELAY_MS,
} from "../modules/create-post-support";
import { toCreateCommunityPostPayload, useCreateCommunityPostForm } from "../use-form";
import { useCreatePostDiscardConfirmation } from "./use-create-post-discard-confirmation";

export type UseCreateCommunityPostControllerOptions = {
  onCloseComplete?: () => void;
};

const moveContenteditableCaretToEnd = (element: HTMLElement) => {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
};

export const useCreateCommunityPostController = ({
  onCloseComplete,
}: UseCreateCommunityPostControllerOptions = {}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams<{ slug?: string | string[] }>();
  const routeSlug = normalizeParam(params?.slug);
  const communitySlugFromQuery = searchParams.get("community")?.trim() || null;
  const storedUser = useAppSelector((state) => state.user);
  const isPsychologist = storedUser?.role === "psicologo";
  const mediaPermission = getCommunityMediaPermission(storedUser);
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  const [isAnonymousTipDismissed, setIsAnonymousTipDismissed] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasSheetOpened, setHasSheetOpened] = useState(false);
  const [keyboardViewportOffset, setKeyboardViewportOffset] = useState(0);
  const [selectedMediaItems, setSelectedMediaItems] = useState<SelectedPostMedia[]>([]);
  const closeTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastFocusedEditorIdRef = useRef("create-post-title");
  const selectedMediaPreviewUrlsRef = useRef<string[]>([]);
  const titleAutoFocusCancelledRef = useRef(false);

  const communitiesQuery = useCommunities({ limit: 50 });
  const communityOptions = useMemo(
    () =>
      (communitiesQuery.data?.data ?? [])
        .map((community) => ({
          label: community.name,
          value: community.slug,
        }))
        .sort((a, b) => communityNameCollator.compare(a.label, b.label)),
    [communitiesQuery.data?.data],
  );
  const defaultCommunitySlug =
    routeSlug && routeSlug !== COMMUNITY_FEED_SLUG ? routeSlug : communitySlugFromQuery;

  const form = useCreateCommunityPostForm({
    communityOptions,
    defaultCommunitySlug,
    isPsychologist,
    loadingCommunities: communitiesQuery.isLoading,
  });
  const { formProps, hook } = form;

  const mutation = useCreateCommunityPost({
    onSuccess: (post) => {
      const publicationHref = `/comunidades/${encodeURIComponent(post.community.slug)}/publicacao/${encodeURIComponent(post.id)}`;

      try {
        window.sessionStorage.setItem(LAST_CREATED_POST_HREF_KEY, publicationHref);
      } catch {
        // A rota de sucesso também recebe o destino por URL e não depende do storage.
      }
      setIsSheetOpen(false);
      toast.success("Post publicado!");
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = window.setTimeout(() => {
        router.replace(publicationHref);
      }, SHEET_CLOSE_DELAY_MS);
    },
    onError: (error) => {
      const resolution = resolveCreatePostError(error);

      if (resolution.field) {
        hook.setError(
          resolution.field,
          {
            message: resolution.message,
            type: "server",
          },
          { shouldFocus: true },
        );
        return;
      }

      toast.error(resolution.message);
    },
  });
  const uploadMutation = useUploadCommunityPostMedia({
    onError: (error) => {
      toast.error(resolveMediaUploadError(error));
    },
  });

  useEffect(() => {
    if (!defaultCommunitySlug || communityOptions.length === 0) return;

    const selected = hook.getValues("community_slug");
    const hasOption = communityOptions.some((option) => option.value === defaultCommunitySlug);

    if (!selected && hasOption) {
      hook.setValue("community_slug", defaultCommunitySlug, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    } else if (selected === defaultCommunitySlug && !hasOption) {
      hook.setValue("community_slug", "", {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [communityOptions, defaultCommunitySlug, hook]);

  const watchedCommunitySlug = hook.watch("community_slug");
  const watchedTitle = hook.watch("title");
  const watchedContent = hook.watch("content");
  const selectedCommunityIsValid = communityOptions.some(
    (option) => option.value === watchedCommunitySlug,
  );
  const titleMeetsMinimum = String(watchedTitle ?? "").trim().length >= 3;
  const contentMeetsMinimum = String(watchedContent ?? "").trim().length >= 10;
  const hasDraftContent = Boolean(
    String(watchedTitle ?? "").trim().length > 0 ||
      String(watchedContent ?? "").trim().length > 0 ||
      selectedMediaItems.length > 0,
  );
  const requiredFieldsReady = Boolean(
    selectedCommunityIsValid && titleMeetsMinimum && contentMeetsMinimum,
  );
  const hasNoCommunities = communitiesQuery.isSuccess && communityOptions.length === 0;
  const isSubmitting =
    hook.formState.isSubmitting || mutation.isPending || uploadMutation.isPending;
  const isSubmitDisabled = isSubmitting || communitiesQuery.isLoading || hasNoCommunities;
  const sheetMotionState = isSheetOpen ? "enter" : hasSheetOpened ? "exit" : "initial";

  useEffect(() => {
    if (selectedCommunityIsValid && hook.formState.errors.community_slug) {
      hook.clearErrors("community_slug");
    }
  }, [hook, hook.formState.errors.community_slug, selectedCommunityIsValid]);

  useEffect(() => {
    if (titleMeetsMinimum && hook.formState.errors.title) {
      hook.clearErrors("title");
    }
  }, [hook, hook.formState.errors.title, titleMeetsMinimum]);

  useEffect(() => {
    if (contentMeetsMinimum && hook.formState.errors.content) {
      hook.clearErrors("content");
    }
  }, [contentMeetsMinimum, hook, hook.formState.errors.content]);

  const registerEditorInteraction = useCallback((targetId = lastFocusedEditorIdRef.current) => {
    lastFocusedEditorIdRef.current = targetId;
    if (targetId !== "create-post-title") {
      titleAutoFocusCancelledRef.current = true;
    }
  }, []);

  const focusEditorElement = useCallback(
    (
      targetId = lastFocusedEditorIdRef.current,
      options: { moveCaretToEnd?: boolean; registerInteraction?: boolean } = {},
    ) => {
      const target = document.getElementById(targetId);

      if (!target) return;

      if (options.registerInteraction) {
        registerEditorInteraction(targetId);
      }

      target.focus({ preventScroll: true });

      if (target instanceof HTMLElement && target.isContentEditable) {
        if (options.moveCaretToEnd !== false) {
          moveContenteditableCaretToEnd(target);
        }
        return;
      }

      try {
        if (
          options.moveCaretToEnd !== false &&
          (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
          typeof target.setSelectionRange === "function"
        ) {
          const cursorPosition = target.value.length;
          target.setSelectionRange(cursorPosition, cursorPosition);
        }
      } catch {
        // Alguns inputs mobile podem nao suportar selecao programatica; o foco ainda abre o teclado.
      }
    },
    [registerEditorInteraction],
  );

  const focusEditorFromUserGesture = useCallback(
    (targetId: string) => {
      registerEditorInteraction(targetId);
      const target = document.getElementById(targetId);

      if (!target || document.activeElement === target) return;

      target.focus({ preventScroll: true });
    },
    [registerEditorInteraction],
  );

  const focusLastEditor = useCallback(() => {
    window.setTimeout(() => {
      focusEditorElement();
    }, 0);
  }, [focusEditorElement]);

  const preserveEditorFocusFromBlankTap = (
    event: ReactPointerEvent<HTMLElement>,
    targetEditorId = lastFocusedEditorIdRef.current,
  ) => {
    if (event.target !== event.currentTarget) return;

    event.preventDefault();
    registerEditorInteraction(targetEditorId);
    focusEditorElement(targetEditorId);
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
  }, [revokeSelectedMediaPreview]);

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

  const updateSelectedMediaOrientation = useCallback(
    (id: string, orientation: SelectedPostMedia["orientation"]) => {
      setSelectedMediaItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? { ...item, orientation } : item)),
      );
    },
    [],
  );

  const performClose = useCallback(() => {
    setIsSheetOpen(false);
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);

    closeTimerRef.current = window.setTimeout(() => {
      if (onCloseComplete) {
        onCloseComplete();
        return;
      }

      const fallbackHref =
        routeSlug && routeSlug !== COMMUNITY_FEED_SLUG
          ? `/comunidades/${routeSlug}`
          : communitySlugFromQuery
            ? `${DEFAULT_COMMUNITY_FEED_HREF}?community=${encodeURIComponent(communitySlugFromQuery)}`
            : DEFAULT_COMMUNITY_FEED_HREF;

      navigateBackWithFallback(router, fallbackHref);
    }, SHEET_CLOSE_DELAY_MS);
  }, [communitySlugFromQuery, onCloseComplete, routeSlug, router]);

  const {
    cancelDiscardConfirmation,
    confirmDiscardAndClose,
    discardConfirmationOpen,
    requestClose: handleClose,
  } = useCreatePostDiscardConfirmation({
    hasDraftContent,
    onCancel: focusLastEditor,
    onClose: performClose,
  });

  useEffect(() => {
    const visualViewport = window.visualViewport;

    if (!visualViewport) return;

    let frame: number | null = null;
    const updateKeyboardOffset = () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }

      frame = window.requestAnimationFrame(() => {
        frame = null;
        setKeyboardViewportOffset(resolveKeyboardViewportOffset());
      });
    };

    updateKeyboardOffset();
    visualViewport.addEventListener("resize", updateKeyboardOffset);
    visualViewport.addEventListener("scroll", updateKeyboardOffset);
    window.addEventListener("orientationchange", updateKeyboardOffset);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      visualViewport.removeEventListener("resize", updateKeyboardOffset);
      visualViewport.removeEventListener("scroll", updateKeyboardOffset);
      window.removeEventListener("orientationchange", updateKeyboardOffset);
    };
  }, []);

  useEffect(() => {
    let openFrame: number | null = null;
    const frame = window.requestAnimationFrame(() => {
      openFrame = window.requestAnimationFrame(() => {
        setHasSheetOpened(true);
        setIsSheetOpen(true);
      });
    });
    const focusTitle = () => {
      const activeElement = document.activeElement;

      if (
        titleAutoFocusCancelledRef.current ||
        (activeElement instanceof HTMLElement &&
          EDITOR_FIELD_IDS.has(activeElement.id) &&
          activeElement.id !== "create-post-title") ||
        lastFocusedEditorIdRef.current !== "create-post-title"
      ) {
        return;
      }

      focusEditorElement("create-post-title");
    };
    const focusTimers = getCreatePostInitialEditorFocusDelays().map((delay) =>
      window.setTimeout(focusTitle, delay),
    );
    const lockedScrollX = window.scrollX;
    const lockedScrollY = window.scrollY;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyRight = document.body.style.right;
    const previousBodyLeft = document.body.style.left;
    const previousBodyWidth = document.body.style.width;
    const previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousDocumentOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
      }
    };

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.right = "0";
    document.body.style.left = "0";
    document.body.style.width = "100%";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.cancelAnimationFrame(frame);
      if (openFrame !== null) window.cancelAnimationFrame(openFrame);
      focusTimers.forEach((timer) => {
        window.clearTimeout(timer);
      });
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.right = previousBodyRight;
      document.body.style.left = previousBodyLeft;
      document.body.style.width = previousBodyWidth;
      document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.documentElement.style.overscrollBehavior = previousDocumentOverscrollBehavior;
      window.removeEventListener("keydown", handleEscape);
      window.scrollTo(lockedScrollX, lockedScrollY);
    };
  }, [focusEditorElement, handleClose]);

  useEffect(() => {
    return () => revokeSelectedMediaPreview();
  }, [revokeSelectedMediaPreview]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.currentTarget.value = "";

    if (files.length === 0) return;

    if (!mediaPermission.canAttach) {
      toast.error(mediaPermission.reason || "Mídia disponível apenas para psicólogos verificados.");
      focusLastEditor();
      return;
    }

    if (files.some(isCommunityMediaFileTooLarge)) {
      toast.error(COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE);
      focusLastEditor();
      return;
    }

    if (files.some((file) => resolvePublicMediaKind(file) === null)) {
      toast.error("Envie uma imagem ou vídeo em formato permitido.");
      focusLastEditor();
      return;
    }

    const videoFiles = files.filter((file) => resolvePublicMediaKind(file) === "video");
    const imageFiles = files.filter((file) => resolvePublicMediaKind(file) === "image");

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
      focusLastEditor();
      return;
    }

    const replacingVideo = selectedMediaItems.some((item) => item.type === "video");
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
    focusLastEditor();
  };

  const onSubmit = hook.handleSubmit(async (values) => {
    try {
      const mediaFiles = mediaPermission.canAttach ? selectedMediaItems : [];
      const selectedVideo = mediaFiles.find((mediaItem) => mediaItem.type === "video") ?? null;
      const uploadedMedia = selectedVideo
        ? [
            await uploadMutation.mutateAsync({
              file: selectedVideo.file,
              slug: values.community_slug,
            }),
          ]
        : mediaFiles.length > 0
          ? await mapWithConcurrency(mediaFiles, 2, (mediaItem) =>
              uploadMutation.mutateAsync({
                file: mediaItem.file,
                slug: values.community_slug,
              }),
            )
          : [];
      const thumbnailFrame = isPsychologist
        ? ({
            cardLabel: "Postado na Lectum",
            professional: {
              avatar: storedUser?.avatar ?? null,
              name: storedUser?.name || "Profissional Lectum",
              roleLabel: "Psicólogo",
              verified: Boolean(
                storedUser?.psychologist_profile?.cfp_verified_at ||
                  storedUser?.psychologist_profile?.crp_status === "aprovado",
              ),
            },
            sourceText: values.title,
          } satisfies LectumVideoThumbnailFrameOptions)
        : null;
      const thumbnailFile = selectedVideo
        ? await createVideoThumbnailFile(selectedVideo.file, {
            lectumShareFrame: thumbnailFrame,
          })
        : null;
      const uploadedThumbnail = thumbnailFile
        ? await uploadMutation.mutateAsync({
            file: thumbnailFile,
            purpose: "generated-video-thumbnail",
            slug: values.community_slug,
          })
        : null;
      const firstMedia = uploadedMedia[0] ?? null;
      const imageMediaItems = uploadedMedia
        .filter((media) => media.media_type === "image")
        .map((media, index) => ({
          mediaType: "image" as const,
          mediaUrl: media.media_url,
          position: index,
        }));

      await mutation.mutateAsync({
        slug: values.community_slug,
        body: {
          ...toCreateCommunityPostPayload(values, isPsychologist),
          ...(firstMedia
            ? {
                mediaType: firstMedia.media_type,
                mediaUrl: firstMedia.media_url,
                ...(firstMedia.media_type === "video" && uploadedThumbnail
                  ? { thumbnailUrl: uploadedThumbnail.media_url }
                  : {}),
              }
            : {}),
          ...(imageMediaItems.length > 0 ? { mediaItems: imageMediaItems } : {}),
        },
      });
    } catch {
      // O feedback fica centralizado nas mutations para preservar o rascunho do post.
    }
  });

  const clearCorrectedFormErrorsSoon = () => {
    window.setTimeout(() => {
      const values = hook.getValues();
      const hasValidCommunity = communityOptions.some(
        (option) => option.value === values.community_slug,
      );
      const hasValidTitle = String(values.title ?? "").trim().length >= 3;
      const hasValidContent = String(values.content ?? "").trim().length >= 10;

      if (hasValidCommunity) {
        hook.clearErrors("community_slug");
      }

      if (hasValidTitle) {
        hook.clearErrors("title");
      }

      if (hasValidContent) {
        hook.clearErrors("content");
      }

      if (hasValidCommunity && hasValidTitle && hasValidContent) {
        hook.clearErrors();
      }
    }, 0);
  };

  return {
    clearCorrectedFormErrorsSoon,
    cancelDiscardConfirmation,
    communitiesQuery,
    confirmDiscardAndClose,
    discardConfirmationOpen,
    fileInputRef,
    focusEditorFromUserGesture,
    focusLastEditor,
    formProps,
    handleClose,
    handleMediaChange,
    hasNoCommunities,
    hook,
    isAnonymousTipDismissed,
    isGuidanceOpen,
    isPsychologist,
    isSheetOpen,
    isSubmitDisabled,
    isSubmitting,
    keyboardViewportOffset,
    lastFocusedEditorIdRef,
    mediaPermission,
    onSubmit,
    preserveEditorFocusFromBlankTap,
    registerEditorInteraction,
    removeSelectedMediaAt,
    requiredFieldsReady,
    selectedMediaItems,
    setIsAnonymousTipDismissed,
    setIsGuidanceOpen,
    sheetMotionState,
    updateSelectedMediaOrientation,
    uploadMutation,
  };
};

export type CreateCommunityPostController = ReturnType<typeof useCreateCommunityPostController>;
