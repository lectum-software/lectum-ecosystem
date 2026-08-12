"use client";

import { Camera, Loader2, X } from "lucide-react";
import Image from "next/image";
import { type ChangeEvent, type RefObject, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export const REPLY_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

export type ReplyMediaType = "image" | "video";
export type ReplyMediaOrientation = "landscape" | "portrait" | "square";

export type SelectedReplyMedia = {
  file: File;
  isPreparingPreview?: boolean;
  orientation?: ReplyMediaOrientation;
  previewUrl: string;
  thumbnailUrl?: string | null;
  type: ReplyMediaType;
};

type ReplyMediaPermissionLike = {
  canAttach: boolean;
  reason: string;
};

type CurrentReplyMedia = {
  mediaType?: string | null;
  thumbnailUrl?: string | null;
  mediaUrl?: string | null;
};

type ReplyMediaAttachmentControlProps = {
  className?: string;
  currentMedia?: CurrentReplyMedia;
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploading?: boolean;
  mediaPermission: ReplyMediaPermissionLike;
  onAfterAction?: () => void;
  onOpenDialog?: () => void;
  onMediaChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCurrent?: () => void;
  onRemoveSelected: () => void;
  onUndoRemove?: () => void;
  removeCurrent?: boolean;
  selectedMedia: SelectedReplyMedia | null;
  composerMode?: "combined" | "preview" | "trigger";
  variant?: "composer" | "editor";
};

const normalizeMediaType = (value?: string | null): ReplyMediaType | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

const mediaOrientationFromDimensions = (
  width?: number | null,
  height?: number | null,
): ReplyMediaOrientation => {
  if (!width || !height) return "landscape";

  const ratio = width / height;
  if (ratio > 1.12) return "landscape";
  if (ratio < 0.88) return "portrait";

  return "square";
};

export const detectReplyMediaOrientation = (
  previewUrl: string,
  type: ReplyMediaType,
): Promise<ReplyMediaOrientation> => {
  if (typeof window === "undefined") {
    return Promise.resolve("landscape");
  }

  return new Promise((resolve) => {
    if (type === "image") {
      const image = new window.Image();
      image.onload = () =>
        resolve(mediaOrientationFromDimensions(image.naturalWidth, image.naturalHeight));
      image.onerror = () => resolve("landscape");
      image.src = previewUrl;
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      resolve(mediaOrientationFromDimensions(video.videoWidth, video.videoHeight));
      video.removeAttribute("src");
      video.load();
    };
    video.onerror = () => resolve("landscape");
    video.src = previewUrl;
    video.load();
  });
};

export const createReplyVideoThumbnail = (previewUrl: string): Promise<string | null> => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const video = document.createElement("video");
    let isSettled = false;
    let seekRequested = false;
    const timeout = { id: undefined as number | undefined };

    const finish = (thumbnailUrl: string | null) => {
      if (isSettled) return;

      isSettled = true;
      if (timeout.id !== undefined) {
        window.clearTimeout(timeout.id);
      }
      video.onloadeddata = null;
      video.onloadedmetadata = null;
      video.onseeked = null;
      video.onerror = null;
      video.removeAttribute("src");
      video.load();
      resolve(thumbnailUrl);
    };

    const captureFrame = () => {
      if (!video.videoWidth || !video.videoHeight) {
        finish(null);
        return;
      }

      try {
        const maxDimension = 480;
        const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL("image/jpeg", 0.82));
      } catch {
        finish(null);
      }
    };

    timeout.id = window.setTimeout(() => finish(null), 4000);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      if (!seekRequested) {
        captureFrame();
      }
    };
    video.onloadedmetadata = () => {
      const targetTime = Number.isFinite(video.duration) && video.duration > 0.2 ? 0.1 : 0;

      if (targetTime <= 0) {
        return;
      }

      try {
        seekRequested = true;
        video.currentTime = targetTime;
      } catch {
        seekRequested = false;
        captureFrame();
      }
    };
    video.onseeked = captureFrame;
    video.onerror = () => finish(null);
    video.src = previewUrl;
    video.load();
  });
};

export const mediaTypeFromFile = (file: File): ReplyMediaType =>
  file.type.startsWith("image/") ? "image" : "video";

const composerPreviewSizeClassName = (orientation?: ReplyMediaOrientation) => {
  if (orientation === "portrait") return "h-20 w-14 rounded-[1.15rem]";
  if (orientation === "square") return "h-16 w-16 rounded-[1.15rem]";

  return "h-14 w-24 rounded-[1.15rem]";
};

const editorPreviewClassNames = (orientation?: ReplyMediaOrientation) => {
  const resolvedOrientation = orientation ?? "landscape";

  if (resolvedOrientation === "landscape") {
    return {
      figure: "w-[min(15.5rem,76vw)] rounded-[1.35rem] sm:w-56",
      frame: "aspect-video",
      sizes: "(min-width: 640px) 224px, 248px",
    };
  }

  if (resolvedOrientation === "square") {
    return {
      figure: "w-[min(9rem,48vw)] rounded-[1.35rem] sm:w-32",
      frame: "aspect-square",
      sizes: "(min-width: 640px) 128px, 144px",
    };
  }

  return {
    figure: "w-[min(9.5rem,48vw)] rounded-[1.4rem] sm:w-32",
    frame: "aspect-[9/14]",
    sizes: "(min-width: 640px) 128px, 152px",
  };
};

export function ReplyMediaAttachmentControl({
  className,
  currentMedia,
  disabled,
  fileInputRef,
  isUploading,
  mediaPermission,
  onAfterAction,
  onOpenDialog,
  onMediaChange,
  onRemoveCurrent,
  onRemoveSelected,
  onUndoRemove,
  removeCurrent = false,
  selectedMedia,
  composerMode = "combined",
  variant = "composer",
}: ReplyMediaAttachmentControlProps) {
  const currentType = normalizeMediaType(currentMedia?.mediaType);
  const currentSrc =
    currentMedia?.mediaUrl && currentType ? resolvePublicMediaUrl(currentMedia.mediaUrl) : null;
  const [currentMediaOrientation, setCurrentMediaOrientation] = useState<{
    src: string;
    type: ReplyMediaType;
    value: ReplyMediaOrientation;
  } | null>(null);

  useEffect(() => {
    if (!currentSrc || !currentType || removeCurrent) {
      return;
    }

    let isMounted = true;

    detectReplyMediaOrientation(currentSrc, currentType).then((orientation) => {
      if (isMounted) {
        setCurrentMediaOrientation({ src: currentSrc, type: currentType, value: orientation });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentSrc, currentType, removeCurrent]);

  const resolvedCurrentMediaOrientation =
    currentMediaOrientation?.src === currentSrc && currentMediaOrientation.type === currentType
      ? currentMediaOrientation.value
      : undefined;

  const activeMedia = selectedMedia
    ? {
        alt: "Miniatura da mídia selecionada",
        isPreparingPreview: selectedMedia.isPreparingPreview,
        orientation: selectedMedia.orientation,
        src: selectedMedia.previewUrl,
        thumbnailSrc: selectedMedia.thumbnailUrl ?? null,
        type: selectedMedia.type,
        unoptimized: true,
      }
    : !removeCurrent && currentSrc && currentType
      ? {
          alt: currentType === "video" ? "Vídeo atual anexado" : "Imagem atual anexada",
          isPreparingPreview: false,
          orientation: resolvedCurrentMediaOrientation,
          src: currentSrc,
          thumbnailSrc:
            currentType !== "video" && currentMedia?.thumbnailUrl
              ? resolvePublicMediaUrl(currentMedia.thumbnailUrl)
              : null,
          type: currentType,
          unoptimized:
            isPublicMediaUrl(currentMedia?.mediaUrl) ||
            isPublicMediaUrl(currentMedia?.thumbnailUrl),
        }
      : null;
  const isEditor = variant === "editor";
  const editorPreview = editorPreviewClassNames(activeMedia?.orientation);

  const openFileDialog = () => {
    if (!mediaPermission.canAttach || disabled || selectedMedia) return;

    onOpenDialog?.();
    fileInputRef.current?.click();
    onAfterAction?.();
  };

  const mediaInput = (
    <input
      accept={REPLY_MEDIA_ACCEPT}
      className="hidden"
      onChange={onMediaChange}
      ref={fileInputRef}
      type="file"
    />
  );

  if (!isEditor) {
    const renderComposerPreview = () =>
      activeMedia ? (
        <div
          className={cn(
            "relative shrink-0 overflow-visible",
            composerPreviewSizeClassName(activeMedia.orientation),
          )}
        >
          <div
            aria-label={activeMedia.alt}
            className="relative h-full w-full overflow-hidden rounded-[inherit] border border-primary/20 bg-surface-muted shadow-lectum-soft"
            role="img"
          >
            {activeMedia.type === "image" || activeMedia.thumbnailSrc ? (
              <Image
                alt={activeMedia.alt}
                className="object-cover"
                fill
                sizes="136px"
                src={activeMedia.thumbnailSrc ?? activeMedia.src}
                unoptimized={activeMedia.unoptimized}
              />
            ) : (
              <video
                aria-label={activeMedia.alt}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                src={activeMedia.src}
              />
            )}
            {activeMedia.isPreparingPreview ? (
              <span className="absolute inset-0 grid place-items-center bg-foreground/20 text-surface">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">Preparando video</span>
              </span>
            ) : null}
          </div>
          <button
            aria-label="Remover mídia anexada"
            className="absolute -top-1 -right-1 z-10 grid h-5 w-5 place-items-center rounded-full border border-border bg-surface text-muted shadow-[var(--lectum-shadow-soft)] transition hover:bg-surface-muted hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
            onClick={() => {
              onRemoveSelected();
              onAfterAction?.();
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ) : null;

    const renderComposerTrigger = () => {
      const hasSelectedMedia = Boolean(selectedMedia);
      const triggerDisabled = !mediaPermission.canAttach || disabled || hasSelectedMedia;

      if (hasSelectedMedia) return null;

      return (
        <button
          aria-label={
            hasSelectedMedia
              ? "Mídia já anexada"
              : mediaPermission.canAttach
                ? "Anexar mídia"
                : "Mídia indisponível"
          }
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-full border p-0 transition focus:outline-none focus:ring-4 focus:ring-primary/15 active:scale-[0.98] disabled:active:scale-100",
            !mediaPermission.canAttach || hasSelectedMedia
              ? "cursor-not-allowed border-border bg-surface-muted text-subtle opacity-75"
              : "border-primary bg-primary text-primary-foreground shadow-lectum-soft hover:border-primary-hover hover:bg-primary-hover",
            disabled && "opacity-60",
          )}
          data-reply-media-trigger="true"
          disabled={triggerDisabled}
          onClick={openFileDialog}
          onMouseDown={(event) => event.preventDefault()}
          title={
            hasSelectedMedia
              ? "Remova a mídia anexada para escolher outra"
              : mediaPermission.canAttach
                ? "Anexar mídia"
                : mediaPermission.reason
          }
          type="button"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Camera className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="sr-only">Anexar mídia</span>
        </button>
      );
    };

    return (
      <div className={cn("flex shrink-0 items-center text-xs text-muted", className)}>
        {composerMode !== "preview" ? mediaInput : null}
        {composerMode === "preview"
          ? renderComposerPreview()
          : composerMode === "trigger"
            ? renderComposerTrigger()
            : activeMedia
              ? renderComposerPreview()
              : renderComposerTrigger()}

        {!mediaPermission.canAttach && mediaPermission.reason ? (
          <span className="sr-only">{mediaPermission.reason}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {activeMedia ? (
        <figure
          className={cn(
            "relative overflow-hidden border border-border bg-surface-muted shadow-[var(--lectum-shadow-soft)]",
            editorPreview.figure,
          )}
        >
          <div
            className={cn("relative w-full overflow-hidden bg-surface-muted", editorPreview.frame)}
          >
            {activeMedia.type === "image" || activeMedia.thumbnailSrc ? (
              <Image
                alt={activeMedia.alt}
                className="object-cover"
                fill
                sizes={editorPreview.sizes}
                src={activeMedia.thumbnailSrc ?? activeMedia.src}
                unoptimized={activeMedia.unoptimized}
              />
            ) : (
              <video
                aria-label={activeMedia.alt}
                className="h-full w-full object-cover"
                muted
                playsInline
                preload="metadata"
                src={activeMedia.src}
              />
            )}
            {activeMedia.isPreparingPreview ? (
              <span className="absolute inset-0 grid place-items-center bg-foreground/20 text-surface">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Preparando video</span>
              </span>
            ) : null}

            <button
              aria-label="Remover mídia anexada"
              className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-surface/90 text-muted shadow-[var(--lectum-shadow-soft)] transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              onClick={() => {
                if (selectedMedia) {
                  onRemoveSelected();
                } else {
                  onRemoveCurrent?.();
                }
                onAfterAction?.();
              }}
              onMouseDown={(event) => event.preventDefault()}
              type="button"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </figure>
      ) : removeCurrent ? (
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-surface-muted px-3 py-1.5 text-muted text-xs font-bold">
          Mídia atual será removida
          <button
            className="text-muted transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-border"
            disabled={disabled}
            onClick={() => {
              onUndoRemove?.();
              onAfterAction?.();
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            Desfazer
          </button>
        </span>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {mediaInput}
        {activeMedia ? null : (
          <button
            aria-label="Adicionar mídia"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-gradient-to-b from-surface to-surface-muted px-4 text-sm font-extrabold text-muted shadow-none transition hover:border-primary/35 hover:bg-primary-soft/70 hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:bg-none disabled:text-muted disabled:opacity-60 dark:border-border dark:from-surface dark:to-surface-muted/40 dark:text-muted"
            disabled={!mediaPermission.canAttach || disabled}
            onClick={openFileDialog}
            onMouseDown={(event) => event.preventDefault()}
            title={mediaPermission.canAttach ? "Adicionar mídia" : mediaPermission.reason}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Mídia
          </button>
        )}
      </div>
    </div>
  );
}
