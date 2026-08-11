"use client";

import { Loader2, Send, X } from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
  const form = useReplyComposerForm(replyTarget?.name ?? replyToName);
  const { formProps, hook } = form;
  const [composerActive, setComposerActive] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [draggingToCancel, setDraggingToCancel] = useState(false);
  const [mediaPickerActive, setMediaPickerActive] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<SelectedReplyMedia | null>(null);
  const localFormRef = useRef<HTMLFormElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedMediaPreviewUrlRef = useRef<string | null>(null);
  const mediaPickerActiveRef = useRef(false);
  const cancelDragRef = useRef<{
    dragging: boolean;
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const resolvedFormRef = formRef ?? localFormRef;
  const visibleError = useMemo(() => {
    if (apiError) return apiError;
    if (!hook.formState.isSubmitted) return null;

    return Object.values(hook.formState.errors)[0]?.message?.toString() ?? null;
  }, [apiError, hook.formState.errors, hook.formState.isSubmitted]);
  const content = hook.watch("content");
  const draft = String(content ?? "").trim();
  const hasDraft = draft.length > 0;
  const hasDiscardableDraft = hasDraft || Boolean(selectedMedia);
  const ready = hasDraft || Boolean(selectedMedia);
  const FieldComponent = components[formProps.fields[0].field];
  const isInline = variant === "inline";
  const shouldShowMediaControlInRow =
    Boolean(selectedMedia) || mediaPickerActive || mediaPermission.showControl;
  const shouldShowGuidance =
    composerActive || hasDraft || Boolean(selectedMedia) || mediaPickerActive;
  const autoFocusTargetId = replyTarget?.id ?? "main";

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
    setComposerActive(true);
  }, []);

  const endMediaPickerInteraction = useCallback(() => {
    mediaPickerActiveRef.current = false;
    setMediaPickerActive(false);
  }, []);

  const focusComposerInput = useCallback(() => {
    window.setTimeout(() => {
      const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      inputNode?.focus({ preventScroll: true });
    }, 0);
  }, [resolvedFormRef]);

  const resetCancelDrag = () => {
    cancelDragRef.current = null;
    setDragOffset(0);
    setDraggingToCancel(false);
  };

  const cancelComposer = () => {
    if (hasDiscardableDraft && !confirmDiscardReplyDraft()) return;

    const activeElement = document.activeElement;
    const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");

    inputNode?.blur();
    if (activeElement instanceof HTMLElement && resolvedFormRef.current?.contains(activeElement)) {
      activeElement.blur();
    }

    hook.reset({ content: "" });
    clearSelectedMedia();
    endMediaPickerInteraction();
    setComposerActive(false);
    resetCancelDrag();
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
      const inputNode = resolvedFormRef.current?.querySelector<HTMLTextAreaElement>("textarea");
      inputNode?.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [autoFocus, autoFocusTargetId, resolvedFormRef]);

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
        focusComposerInput();
      }, 250);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => window.removeEventListener("focus", handleWindowFocus);
  }, [endMediaPickerInteraction, focusComposerInput, mediaPickerActive]);

  const handleMediaChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !mediaPermission.canAttach) {
      endMediaPickerInteraction();
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
    hook.clearErrors("content");
    endMediaPickerInteraction();
    setComposerActive(true);
    focusComposerInput();
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
        composerActive && "max-sm:touch-none",
        draggingToCancel ? "transition-none" : "transition-transform duration-200 ease-out",
        isInline
          ? "mt-3 rounded-[20px] border shadow-none"
          : cn(
              "fixed inset-x-0 bottom-0 z-[80] rounded-t-[24px] border-t bg-surface shadow-lectum-soft sm:static sm:rounded-[22px] sm:border sm:bg-surface sm:pb-3 sm:shadow-lectum-soft dark:sm:bg-surface",
              composerActive ? "pb-2" : "pb-[var(--lectum-bottom-fixed-padding)]",
            ),
      )}
      noValidate
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
        if (mediaPickerActiveRef.current) return;
        setComposerActive(false);
        resetCancelDrag();
      }}
      onFocusCapture={() => setComposerActive(true)}
      onPointerCancel={handleCancelPointerEnd}
      onPointerDown={handleCancelPointerDown}
      onPointerMove={handleCancelPointerMove}
      onPointerUp={handleCancelPointerEnd}
      onSubmit={handleComposerSubmit}
      ref={resolvedFormRef}
      style={dragOffset > 0 ? { transform: `translate3d(0, ${dragOffset}px, 0)` } : undefined}
    >
      {shouldShowGuidance ? (
        <p className="rounded-[14px] bg-surface-muted px-3 py-2 text-xs font-semibold leading-5 text-muted dark:bg-surface-muted dark:text-muted">
          {COMMENT_GUIDANCE_MESSAGE}
        </p>
      ) : null}

      <div className="flex items-end gap-2">
        {shouldShowMediaControlInRow ? (
          <ReplyMediaAttachmentControl
            className="pb-0"
            composerMode="trigger"
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
        <div className="min-w-0 flex-1">
          <FieldComponent control={hook.control} {...formProps.fields[0]} />
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

      {selectedMedia ? (
        <ReplyMediaAttachmentControl
          className="pl-[3.25rem] pr-[3.25rem]"
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
