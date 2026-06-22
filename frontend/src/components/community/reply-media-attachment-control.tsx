"use client";

import { Loader2, Video, X } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, RefObject } from "react";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";

export const REPLY_MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime";

export type ReplyMediaType = "image" | "video";

export type SelectedReplyMedia = {
  file: File;
  previewUrl: string;
  type: ReplyMediaType;
};

type ReplyMediaPermissionLike = {
  canAttach: boolean;
  reason: string;
};

type CurrentReplyMedia = {
  mediaType?: string | null;
  mediaUrl?: string | null;
};

type ReplyMediaAttachmentControlProps = {
  currentMedia?: CurrentReplyMedia;
  disabled?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploading?: boolean;
  mediaPermission: ReplyMediaPermissionLike;
  onAfterAction?: () => void;
  onMediaChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveCurrent?: () => void;
  onRemoveSelected: () => void;
  onUndoRemove?: () => void;
  removeCurrent?: boolean;
  selectedMedia: SelectedReplyMedia | null;
  variant?: "composer" | "editor";
};

const normalizeMediaType = (value?: string | null): ReplyMediaType | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

export const mediaTypeFromFile = (file: File): ReplyMediaType =>
  file.type.startsWith("image/") ? "image" : "video";

export function ReplyMediaAttachmentControl({
  currentMedia,
  disabled,
  fileInputRef,
  isUploading,
  mediaPermission,
  onAfterAction,
  onMediaChange,
  onRemoveCurrent,
  onRemoveSelected,
  onUndoRemove,
  removeCurrent = false,
  selectedMedia,
  variant = "composer",
}: ReplyMediaAttachmentControlProps) {
  const currentType = normalizeMediaType(currentMedia?.mediaType);
  const currentSrc =
    currentMedia?.mediaUrl && currentType ? resolvePublicMediaUrl(currentMedia.mediaUrl) : null;
  const activeMedia = selectedMedia
    ? {
        alt: "Miniatura da mídia selecionada",
        src: selectedMedia.previewUrl,
        type: selectedMedia.type,
        unoptimized: true,
      }
    : !removeCurrent && currentSrc && currentType
      ? {
          alt: currentType === "video" ? "Vídeo atual anexado" : "Imagem atual anexada",
          src: currentSrc,
          type: currentType,
          unoptimized: isPublicMediaUrl(currentMedia?.mediaUrl),
        }
      : null;
  const isEditor = variant === "editor";
  const actionLabel = activeMedia ? "Substituir mídia" : "Adicionar mídia";

  const openFileDialog = () => {
    if (!mediaPermission.canAttach || disabled) return;

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
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5 text-xs text-muted">
        {mediaInput}
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <button
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 font-bold transition focus:outline-none focus:ring-4 focus:ring-primary/15",
              mediaPermission.canAttach
                ? "border-border bg-surface text-muted hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
                : "cursor-not-allowed border-border bg-surface-muted text-subtle",
            )}
            disabled={!mediaPermission.canAttach || disabled}
            onClick={openFileDialog}
            title={mediaPermission.canAttach ? "Anexar mídia" : mediaPermission.reason}
            type="button"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Video className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Anexar mídia
          </button>

          {!mediaPermission.canAttach && mediaPermission.reason ? (
            <span className="min-w-0 flex-1 basis-56 whitespace-normal break-words leading-4 text-muted">
              {mediaPermission.reason}
            </span>
          ) : null}

          {selectedMedia ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 font-bold text-primary">
              <span className="truncate">{selectedMedia.file.name}</span>
              <button
                aria-label="Remover mídia anexada"
                className="grid h-5 w-5 place-items-center rounded-full transition hover:bg-surface/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
                onClick={() => {
                  onRemoveSelected();
                  onAfterAction?.();
                }}
                type="button"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {activeMedia ? (
        <figure className="relative w-[min(9.5rem,48vw)] overflow-hidden rounded-[1.4rem] border border-border bg-surface-muted shadow-[var(--lectum-shadow-soft)] sm:w-32">
          <div className="relative aspect-[9/14] w-full overflow-hidden bg-surface-muted">
            {activeMedia.type === "image" ? (
              <Image
                alt={activeMedia.alt}
                className="object-cover"
                fill
                sizes="(min-width: 640px) 128px, 152px"
                src={activeMedia.src}
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
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-danger/10 px-3 py-1.5 text-danger text-xs font-bold">
          Mídia atual será removida
          <button
            className="text-danger transition hover:text-danger/80 focus:outline-none focus:ring-2 focus:ring-danger/20"
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
        <button
          aria-label={actionLabel}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-muted px-3.5 text-sm font-bold text-muted transition hover:border-primary/30 hover:bg-primary-soft hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!mediaPermission.canAttach || disabled}
          onClick={openFileDialog}
          onMouseDown={(event) => event.preventDefault()}
          title={mediaPermission.canAttach ? actionLabel : mediaPermission.reason}
          type="button"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Video className="h-4 w-4" aria-hidden="true" />
          )}
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
