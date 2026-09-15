"use client";

import { Loader2, Send } from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { CommunityVideoUploadProgress } from "@/components/community/community-video-upload-progress";
import {
  createReplyVideoThumbnail,
  detectReplyMediaOrientation,
  mediaTypeFromFile,
  ReplyMediaAttachmentControl,
  type SelectedReplyMedia,
} from "@/components/community/reply-media-attachment-control";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import {
  type CommunityVideoUploadOperation,
  useCommunityVideoUpload,
} from "@/hooks/use-community-video-upload";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  getCommunityMediaSelectionSizeError,
  resolveMediaUploadError,
} from "@/utils/media-upload-error";
import {
  COMMENT_GUIDANCE_MESSAGE,
  confirmDiscardReplyDraft,
  POST_DETAIL_MOBILE_QUERY,
  POST_REPLY_CANCEL_DRAG_THRESHOLD,
  type ReplyMediaPermission,
  type ReplyTarget,
} from "../modules/reply-support";
import { type ReplyComposerForm, useReplyComposerForm } from "../use-form";
import { findReplyComposerInput } from "./reply-composer-dom";
import { useReplyComposerKeyboardOffset } from "./use-reply-composer-keyboard-offset";

export const ReplyComposer = ({
  apiError,
  autoFocus = false,
  disabled,
  formRef,
  mediaPermission,
  onCancelContext,
  onComposerActiveChange,
  onDraftStateChange,
  onSubmit,
  replyToName,
  replyTarget,
  variant = "main",
}: {
  apiError?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
  formRef?: RefObject<HTMLElement | null>;
  mediaPermission: ReplyMediaPermission;
  onCancelContext?: () => void;
  onComposerActiveChange?: (active: boolean) => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
  onSubmit: (
    values: ReplyComposerForm,
    mediaFile?: File | null,
    videoUploadOperation?: CommunityVideoUploadOperation,
  ) => Promise<void> | void;
  replyToName?: string | null;
  replyTarget: ReplyTarget;
  variant?: "inline" | "main";
}) => {
  const form = useReplyComposerForm();
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggingToCancel, setDraggingToCancel] = useState(false);
  const [mediaPickerActive, setMediaPickerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedReplyMedia | null>(null);
  const { beginVideoUpload, cancelActiveVideoUpload, videoUploadProgress } =
    useCommunityVideoUpload();
  const composerFormNodeRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerActivatedAtRef = useRef(0);
  const composerInternalPointerAtRef = useRef(0);
  const lastUserScrollIntentAtRef = useRef(0);
  const selectedMediaPreviewUrlRef = useRef<string | null>(null);
  const mediaPickerActiveRef = useRef(false);
  const cancelDragRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    const firstError = Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
    if (!hook.formState.isSubmitted && !firstError) return null;

    return firstError;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const draft = String(content ?? "").trim();
  const hasDraft = draft.length > 0;
  const hasDiscardableDraft = hasDraft || Boolean(selectedMedia);
  const ready = hasDraft || Boolean(selectedMedia);
  const FieldComponent = components[formProps.fields[0].field];
  const isInline = variant === "inline";
  const keyboardOffset = useReplyComposerKeyboardOffset({
    composerActive,
    composerRef: composerFormNodeRef,
    isInline,
  });
  const shouldShowMediaTriggerInField =
    !selectedMedia && (mediaPickerActive || mediaPermission.showControl);
  const shouldShowGuidance = composerActive || hasDraft || Boolean(selectedMedia);
  const shouldUseKeyboardSafeArea = composerActive && keyboardOffset > 0;
  const autoFocusTargetId = replyTarget?.id ?? "main";
  const replyContextLabel = replyTarget?.name
    ? `Respondendo ${replyTarget.name}`
    : replyToName
      ? `Respondendo ${replyToName}`
      : "Respondendo ao post";
  const composerContentField = useMemo(
    () => ({
      ...formProps.fields[0],
      inputClassName: cn(
        formProps.fields[0].inputClassName,
        "border-0 bg-transparent px-3.5 shadow-none focus:border-transparent focus:ring-0 dark:bg-transparent",
        shouldShowMediaTriggerInField && "pl-12",
      ),
    }),
    [formProps.fields, shouldShowMediaTriggerInField],
  );
  const composerStyle = useMemo(() => {
    const style: CSSProperties = {};
    if (!isInline && shouldUseKeyboardSafeArea) {
      style.bottom = `${keyboardOffset}px`;
    }

    if (dragOffset > 0) {
      style.transform = `translate3d(0, ${dragOffset}px, 0)`;
    }

    return Object.keys(style).length > 0 ? style : undefined;
  }, [dragOffset, isInline, keyboardOffset, shouldUseKeyboardSafeArea]);

  const revokeSelectedMediaPreview = useCallback(() => {
    if (!selectedMediaPreviewUrlRef.current) return;

    URL.revokeObjectURL(selectedMediaPreviewUrlRef.current);
    selectedMediaPreviewUrlRef.current = null;
  }, []);

  const clearSelectedMedia = useCallback(() => {
    revokeSelectedMediaPreview();
    setSelectedMedia(null);
  }, [revokeSelectedMediaPreview]);

  const beginMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = true;
    setMediaPickerActive(true);
    composerActivatedAtRef.current = Date.now();
  }, []);

  const assignComposerFormRef = useCallback((node: HTMLElement | null) => {
    composerFormNodeRef.current = node;
  }, []);

  const markComposerInternalPointer = useCallback(() => {
    composerInternalPointerAtRef.current = Date.now();
  }, []);

  useImperativeHandle<HTMLElement | null, HTMLElement | null>(
    formRef,
    () => composerFormNodeRef.current,
    [],
  );

  const endMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = false;
    setMediaPickerActive(false);
  }, []);

  const updateComposerActive = useCallback(
    (active: boolean) => {
      setComposerActive(active);
      onComposerActiveChange?.(active);
    },
    [onComposerActiveChange],
  );

  const focusComposerInput = useCallback(() => {
    window.setTimeout(() => {
      const inputNode = findReplyComposerInput(composerFormNodeRef.current);
      composerActivatedAtRef.current = Date.now();
      inputNode?.focus({ preventScroll: true });
    }, 0);
  }, []);

  const scheduleSelectedMediaPreviewPreparation = useCallback(
    (previewUrl: string, type: SelectedReplyMedia["type"]) => {
      window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          void detectReplyMediaOrientation(previewUrl, type).then((orientation) => {
            setSelectedMedia((current) =>
              current?.previewUrl === previewUrl ? { ...current, orientation } : current,
            );
          });

          if (type !== "video") return;

          void createReplyVideoThumbnail(previewUrl)
            .then((thumbnailUrl) => {
              setSelectedMedia((current) =>
                current?.previewUrl === previewUrl
                  ? { ...current, isPreparingPreview: false, thumbnailUrl }
                  : current,
              );
            })
            .catch(() => {
              setSelectedMedia((current) =>
                current?.previewUrl === previewUrl
                  ? { ...current, isPreparingPreview: false }
                  : current,
              );
            });
        });
      }, 120);
    },
    [],
  );

  const resetCancelDrag = useCallback(() => {
    cancelDragRef.current = null;
    setDragOffset(0);
    setDraggingToCancel(false);
  }, []);

  const dismissComposerKeyboard = useCallback(() => {
    const activeElement = document.activeElement;
    const inputNode = findReplyComposerInput(composerFormNodeRef.current);

    inputNode?.blur();
    if (
      activeElement instanceof HTMLElement &&
      composerFormNodeRef.current?.contains(activeElement)
    ) {
      activeElement.blur();
    }

    updateComposerActive(false);
    resetCancelDrag();
  }, [resetCancelDrag, updateComposerActive]);

  const cancelComposer = () => {
    if (hasDiscardableDraft && !confirmDiscardReplyDraft()) return;

    dismissComposerKeyboard();

    hook.reset({ content: "" });
    clearSelectedMedia();
    endMediaPickerInteraction();
    onDraftStateChange?.(false);
    onCancelContext?.();
  };

  const canUseMobileCancelGesture = () =>
    composerActive &&
    !disabled &&
    typeof window !== "undefined" &&
    window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches;

  useEffect(() => {
    if (!autoFocus || !autoFocusTargetId) return;

    const timer = window.setTimeout(() => {
      const inputNode = findReplyComposerInput(composerFormNodeRef.current);
      inputNode?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus, autoFocusTargetId]);

  useEffect(() => {
    onDraftStateChange?.(hasDiscardableDraft);
  }, [hasDiscardableDraft, onDraftStateChange]);

  useEffect(() => {
    return () => onComposerActiveChange?.(false);
  }, [onComposerActiveChange]);

  useEffect(() => {
    return () => revokeSelectedMediaPreview();
  }, [revokeSelectedMediaPreview]);

  useEffect(() => {
    if (!mediaPickerActive) return;

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        endMediaPickerInteraction();
      }, 250);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [endMediaPickerInteraction, mediaPickerActive]);

  useEffect(() => {
    if (!composerActive || isInline || typeof window === "undefined") return;
    if (!window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches) return;

    const markUserScrollIntent = () => {
      lastUserScrollIntentAtRef.current = Date.now();
    };

    const handlePageScroll = () => {
      if (Date.now() - composerActivatedAtRef.current < 350) return;
      if (Date.now() - lastUserScrollIntentAtRef.current > 800) return;

      const activeElement = document.activeElement;
      if (
        !(activeElement instanceof HTMLElement) ||
        activeElement !== findReplyComposerInput(composerFormNodeRef.current) ||
        !composerFormNodeRef.current?.contains(activeElement)
      ) {
        return;
      }

      dismissComposerKeyboard();
    };
    const handleWheel = () => {
      markUserScrollIntent();
      handlePageScroll();
    };

    window.addEventListener("scroll", handlePageScroll, { passive: true });
    window.addEventListener("touchmove", markUserScrollIntent, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });

    return () => {
      window.removeEventListener("scroll", handlePageScroll);
      window.removeEventListener("touchmove", markUserScrollIntent);
      window.removeEventListener("wheel", handleWheel);
    };
  }, [composerActive, dismissComposerKeyboard, isInline]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !mediaPermission.canAttach) {
      endMediaPickerInteraction();
      return;
    }

    const type = mediaTypeFromFile(file);
    if (!type) {
      hook.setError("content", {
        message: "Envie uma imagem ou vídeo em formato permitido.",
        type: "manual",
      });
      endMediaPickerInteraction();
      focusComposerInput();
      return;
    }
    const sizeError = getCommunityMediaSelectionSizeError(file, type);
    if (sizeError) {
      hook.setError("content", {
        message: resolveMediaUploadError(sizeError),
        type: "manual",
      });
      endMediaPickerInteraction();
      focusComposerInput();
      return;
    }

    revokeSelectedMediaPreview();
    const previewUrl = URL.createObjectURL(file);
    selectedMediaPreviewUrlRef.current = previewUrl;
    setSelectedMedia({
      file,
      isPreparingPreview: type === "video",
      orientation: undefined,
      previewUrl,
      type,
    });
    hook.clearErrors("content");
    endMediaPickerInteraction();
    updateComposerActive(true);
    focusComposerInput();
    scheduleSelectedMediaPreviewPreparation(previewUrl, type);
  };

  const handleCancelPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "touch" || !canUseMobileCancelGesture()) return;

    cancelDragRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCancelPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;

    if (!gesture.dragging) {
      if (deltaY < 10 || Math.abs(deltaY) < Math.abs(deltaX) * 1.2) return;

      gesture.dragging = true;
      setDraggingToCancel(true);

      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
    }

    if (gesture.dragging) {
      event.preventDefault();
      setDragOffset(Math.min(96, Math.max(0, deltaY * 0.72)));
    }
  };

  const handleCancelPointerEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const gesture = cancelDragRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const shouldCancel =
      gesture.dragging && event.clientY - gesture.startY >= POST_REPLY_CANCEL_DRAG_THRESHOLD;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (shouldCancel) {
      cancelComposer();
      return;
    }

    resetCancelDrag();
  };

  const submitComposer = () => {
    void hook.handleSubmit(async (values) => {
      if (!String(values.content ?? "").trim() && !selectedMedia) {
        hook.setError("content", {
          message: "Escreva um comentário ou anexe uma mídia.",
          type: "manual",
        });
        return;
      }

      const videoUploadOperation = selectedMedia?.type === "video" ? beginVideoUpload() : undefined;

      try {
        await onSubmit(values, selectedMedia?.file ?? null, videoUploadOperation);
        hook.reset({ content: "" });
        clearSelectedMedia();
        endMediaPickerInteraction();
        updateComposerActive(false);
        onDraftStateChange?.(false);
      } catch {
        // O estado de erro é tratado pela mutation para manter o campo preenchido.
      } finally {
        videoUploadOperation?.complete();
      }
    })();
  };

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: wrapper handles focus and pointer state without using a native form element on iOS.
    <div
      className={cn(
        "grid gap-2 border-border bg-surface p-3 dark:border-border dark:bg-surface",
        draggingToCancel ? "transition-none" : "transition-transform duration-200 ease-out",
        isInline
          ? "mt-3 rounded-[20px] border shadow-none"
          : cn(
              "fixed inset-x-0 bottom-0 z-[80] rounded-t-[24px] border-t bg-surface shadow-lectum-soft sm:static sm:rounded-[22px] sm:border sm:bg-surface sm:pb-3 sm:shadow-lectum-soft dark:sm:bg-surface",
              shouldUseKeyboardSafeArea
                ? "pb-[var(--lectum-bottom-nav-padding)]"
                : "pb-[var(--lectum-bottom-fixed-padding)]",
            ),
      )}
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (mediaPickerActiveRef.current) return;
        if (Date.now() - composerInternalPointerAtRef.current < 600) return;
        updateComposerActive(false);
        resetCancelDrag();
      }}
      onFocusCapture={(event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("[data-reply-media-trigger='true']")) {
          return;
        }
        composerActivatedAtRef.current = Date.now();
        updateComposerActive(true);
      }}
      onMouseDownCapture={markComposerInternalPointer}
      onPointerCancel={handleCancelPointerEnd}
      onPointerDownCapture={markComposerInternalPointer}
      onPointerDown={handleCancelPointerDown}
      onPointerMove={handleCancelPointerMove}
      onPointerUp={handleCancelPointerEnd}
      onTouchStartCapture={markComposerInternalPointer}
      ref={assignComposerFormRef}
      style={composerStyle}
    >
      {shouldShowGuidance ? (
        <p className="rounded-[14px] bg-surface-muted px-3 py-2 text-xs font-semibold leading-5 text-muted dark:bg-surface-muted dark:text-muted">
          {replyContextLabel}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="relative grid min-w-0 flex-1 rounded-[24px] border border-border bg-surface shadow-none transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10 dark:bg-surface">
          {shouldShowMediaTriggerInField ? (
            <ReplyMediaAttachmentControl
              className="absolute top-1/2 left-1 z-10 -translate-y-1/2"
              composerMode="trigger"
              disabled={disabled}
              fileInputRef={fileInputRef}
              isUploading={disabled && Boolean(selectedMedia)}
              mediaPermission={mediaPermission}
              onMediaChange={handleMediaChange}
              onOpenDialog={beginMediaPickerInteraction}
              onRemoveSelected={clearSelectedMedia}
              selectedMedia={selectedMedia}
            />
          ) : null}
          <FieldComponent control={hook.control} {...composerContentField} />
          {selectedMedia ? (
            <ReplyMediaAttachmentControl
              className="px-3.5 pb-3 pt-0"
              composerMode="preview"
              disabled={disabled}
              fileInputRef={fileInputRef}
              isUploading={disabled && Boolean(selectedMedia)}
              mediaPermission={mediaPermission}
              onAfterAction={() => updateComposerActive(true)}
              onMediaChange={handleMediaChange}
              onOpenDialog={beginMediaPickerInteraction}
              onRemoveSelected={clearSelectedMedia}
              selectedMedia={selectedMedia}
            />
          ) : null}
        </div>
        <Button
          aria-label="Enviar resposta"
          className="h-11 w-11 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-lectum-soft hover:bg-primary-hover disabled:bg-surface-muted disabled:text-subtle disabled:opacity-100 disabled:shadow-none"
          disabled={disabled || !ready}
          onClick={submitComposer}
          type="button"
        >
          {disabled && ready ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>

      <p className={cn("text-[11px] font-medium leading-4 text-subtle", "pr-[3.25rem]")}>
        {COMMENT_GUIDANCE_MESSAGE}
      </p>

      {videoUploadProgress ? (
        <CommunityVideoUploadProgress
          onCancel={cancelActiveVideoUpload}
          progress={videoUploadProgress}
        />
      ) : null}

      {visibleError ? (
        <InlineAlert title="Não foi possível responder" variant="error">
          {visibleError}
        </InlineAlert>
      ) : null}
    </div>
  );
};

export { PostReportModal } from "./post-report-modal";
