"use client";

import { Loader2, Send, X } from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  createReplyVideoThumbnail,
  detectReplyMediaOrientation,
  mediaTypeFromFile,
  ReplyMediaAttachmentControl,
  type SelectedReplyMedia,
} from "@/components/community/reply-media-attachment-control";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import {
  COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE,
  isCommunityMediaFileTooLarge,
} from "@/utils/media-upload-error";
import {
  COMMENT_GUIDANCE_MESSAGE,
  confirmDiscardReplyDraft,
  POST_DETAIL_MOBILE_QUERY,
  POST_REPLY_CANCEL_DRAG_THRESHOLD,
  type ReplyMediaPermission,
  type ReplyTarget,
} from "../modules/reply-support";
import {
  type PostReportForm,
  type ReplyComposerForm,
  usePostReportForm,
  useReplyComposerForm,
} from "../use-form";
import { findReplyComposerInput } from "./reply-composer-dom";

export const ReplyComposer = ({
  apiError,
  autoFocus = false,
  disabled,
  formRef,
  mediaPermission,
  onCancelContext,
  onDraftStateChange,
  onSubmit,
  replyToName,
  replyTarget,
  variant = "main",
}: {
  apiError?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
  formRef?: RefObject<HTMLFormElement | null>;
  mediaPermission: ReplyMediaPermission;
  onCancelContext?: () => void;
  onDraftStateChange?: (hasDraft: boolean) => void;
  onSubmit: (values: ReplyComposerForm, mediaFile?: File | null) => Promise<void> | void;
  replyToName?: string | null;
  replyTarget: ReplyTarget;
  variant?: "inline" | "main";
}) => {
  const form = useReplyComposerForm();
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggingToCancel, setDraggingToCancel] = useState(false);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [mediaPickerActive, setMediaPickerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedReplyMedia | null>(null);
  const composerFormNodeRef = useRef<HTMLFormElement | null>(null);
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
    if (!isInline && keyboardOffset > 0) {
      style.bottom = `${keyboardOffset}px`;
    }

    if (dragOffset > 0) {
      style.transform = `translate3d(0, ${dragOffset}px, 0)`;
    }

    return Object.keys(style).length > 0 ? style : undefined;
  }, [dragOffset, isInline, keyboardOffset]);

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

  const assignComposerFormRef = useCallback((node: HTMLFormElement | null) => {
    composerFormNodeRef.current = node;
  }, []);

  const markComposerInternalPointer = useCallback(() => {
    composerInternalPointerAtRef.current = Date.now();
  }, []);

  useImperativeHandle<HTMLFormElement | null, HTMLFormElement | null>(
    formRef,
    () => composerFormNodeRef.current,
    [],
  );

  const endMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = false;
    setMediaPickerActive(false);
  }, []);

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

    setComposerActive(false);
    resetCancelDrag();
  }, [resetCancelDrag]);

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
    if (isInline || typeof window === "undefined") return;

    const viewport = window.visualViewport;
    const updateKeyboardOffset = () => {
      if (!composerActive || !window.matchMedia(POST_DETAIL_MOBILE_QUERY).matches || !viewport) {
        setKeyboardOffset(0);
        return;
      }

      const nextKeyboardOffset = Math.max(
        0,
        Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
      );
      setKeyboardOffset(nextKeyboardOffset > 24 ? nextKeyboardOffset : 0);
    };

    updateKeyboardOffset();
    viewport?.addEventListener("resize", updateKeyboardOffset);
    viewport?.addEventListener("scroll", updateKeyboardOffset);
    window.addEventListener("orientationchange", updateKeyboardOffset);
    window.addEventListener("resize", updateKeyboardOffset);

    return () => {
      viewport?.removeEventListener("resize", updateKeyboardOffset);
      viewport?.removeEventListener("scroll", updateKeyboardOffset);
      window.removeEventListener("orientationchange", updateKeyboardOffset);
      window.removeEventListener("resize", updateKeyboardOffset);
    };
  }, [composerActive, isInline]);

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

    if (isCommunityMediaFileTooLarge(file)) {
      hook.setError("content", {
        message: COMMUNITY_MEDIA_SIZE_ERROR_MESSAGE,
        type: "manual",
      });
      endMediaPickerInteraction();
      focusComposerInput();
      return;
    }

    revokeSelectedMediaPreview();
    const previewUrl = URL.createObjectURL(file);
    const type = mediaTypeFromFile(file);
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
    setComposerActive(true);
    focusComposerInput();
    scheduleSelectedMediaPreviewPreparation(previewUrl, type);
  };

  const handleCancelPointerDown = (event: ReactPointerEvent<HTMLFormElement>) => {
    if (event.pointerType !== "touch" || !canUseMobileCancelGesture()) return;

    cancelDragRef.current = {
      dragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCancelPointerMove = (event: ReactPointerEvent<HTMLFormElement>) => {
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

  const handleCancelPointerEnd = (event: ReactPointerEvent<HTMLFormElement>) => {
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

  const handleComposerSubmit = (event: FormEvent<HTMLFormElement>) => {
    void hook.handleSubmit(async (values) => {
      if (!String(values.content ?? "").trim() && !selectedMedia) {
        hook.setError("content", {
          message: "Escreva um comentário ou anexe uma mídia.",
          type: "manual",
        });
        return;
      }

      try {
        await onSubmit(values, selectedMedia?.file ?? null);
        hook.reset({ content: "" });
        clearSelectedMedia();
        endMediaPickerInteraction();
        setComposerActive(false);
        onDraftStateChange?.(false);
      } catch {
        // O estado de erro é tratado pela mutation para manter o campo preenchido.
      }
    })(event);
  };

  return (
    <form
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
      noValidate
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (mediaPickerActiveRef.current) return;
        if (Date.now() - composerInternalPointerAtRef.current < 600) return;
        setComposerActive(false);
        resetCancelDrag();
      }}
      onFocusCapture={(event) => {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("[data-reply-media-trigger='true']")) {
          return;
        }
        composerActivatedAtRef.current = Date.now();
        setComposerActive(true);
      }}
      onMouseDownCapture={markComposerInternalPointer}
      onPointerCancel={handleCancelPointerEnd}
      onPointerDownCapture={markComposerInternalPointer}
      onPointerDown={handleCancelPointerDown}
      onPointerMove={handleCancelPointerMove}
      onPointerUp={handleCancelPointerEnd}
      onSubmit={handleComposerSubmit}
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
              onAfterAction={() => setComposerActive(true)}
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
          type="submit"
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

      {visibleError ? (
        <InlineAlert title="Não foi possível responder" variant="error">
          {visibleError}
        </InlineAlert>
      ) : null}
    </form>
  );
};

export const PostReportModal = ({
  apiError,
  disabled,
  onClose,
  onSubmit,
  open,
  subject,
  title,
}: {
  apiError?: string | null;
  disabled?: boolean;
  onClose: () => void;
  onSubmit: (values: PostReportForm) => Promise<void> | void;
  open: boolean;
  subject: string;
  title: string;
}) => {
  const form = usePostReportForm();
  const { Form: ReportForm, formProps, hook } = form;
  const resetReportForm = hook.reset;

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    resetReportForm({ description: "", reason: "spam" });
  }, [open, resetReportForm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-foreground/55 px-4 py-6 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-report-title"
    >
      <div className="w-full max-w-[430px] rounded-[28px] border border-media-foreground/70 bg-surface p-5 shadow-lectum-soft dark:border-border dark:bg-surface">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-black tracking-[0.12em] text-muted uppercase">
              Moderação Lectum
            </p>
            <h2
              className="text-xl font-black tracking-[-0.03em] text-foreground"
              id="post-report-title"
            >
              {title}
            </h2>
            <p className="line-clamp-2 text-sm leading-5 text-muted">{subject}</p>
          </div>
          <button
            aria-label="Fechar denúncia"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-muted text-muted transition hover:bg-surface-muted hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ReportForm
          className="mt-5 grid gap-3"
          fields={formProps.fields}
          hook={hook}
          onSubmit={hook.handleSubmit(async (values) => {
            try {
              await onSubmit(values);
            } catch {
              // A mutation exibe a mensagem no modal sem fechar o fluxo.
            }
          })}
        >
          {apiError ? (
            <InlineAlert title="Não foi possível enviar" variant="error">
              {apiError}
            </InlineAlert>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              className="h-10 rounded-full px-4"
              onClick={onClose}
              type="button"
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              className="h-10 rounded-full bg-primary px-5 font-black hover:bg-primary-hover"
              disabled={disabled}
              type="submit"
            >
              {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Enviar denúncia
            </Button>
          </div>
        </ReportForm>
      </div>
    </div>
  );
};
