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
  const actionTitle = activeMedia ? "Substituir mídia" : "Adicionar mídia";

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
          {activeMedia ? (
            <div className="relative h-8 w-[8.5rem] shrink-0 overflow-visible rounded-full">
              <button
                aria-label="Substituir mídia anexada"
                className={cn(
                  "group relative h-8 w-full overflow-hidden rounded-full border border-primary/20 bg-surface-muted shadow-[0_8px_18px_rgba(47,141,235,0.14)] transition focus:outline-none focus:ring-4 focus:ring-primary/15",
                  mediaPermission.canAttach && !disabled
                    ? "hover:border-primary/35 hover:shadow-[0_10px_24px_rgba(47,141,235,0.2)] active:scale-[0.99]"
                    : "cursor-not-allowed opacity-70",
                )}
                disabled={!mediaPermission.canAttach || disabled}
                onClick={openFileDialog}
                title={
                  mediaPermission.canAttach ? "Substituir mídia anexada" : mediaPermission.reason
                }
                type="button"
              >
                {activeMedia.type === "image" ? (
                  <Image
                    alt={activeMedia.alt}
                    className="object-cover transition duration-200 group-hover:scale-[1.03]"
                    fill
                    sizes="136px"
                    src={activeMedia.src}
                    unoptimized={activeMedia.unoptimized}
                  />
                ) : (
                  <video
                    aria-label={activeMedia.alt}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.03]"
                    muted
                    playsInline
                    preload="metadata"
                    src={activeMedia.src}
                  />
                )}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/35 via-[#0F172A]/10 to-[#0F172A]/35"
                />
                <span className="absolute inset-0 flex items-center justify-center px-3">
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-surface/90 px-2 py-0.5 font-extrabold text-foreground text-[0.68rem] shadow-sm backdrop-blur-sm">
                    {isUploading ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
                    ) : (
                      <Video className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                    )}
                    <span className="truncate">Mídia</span>
                  </span>
                </span>
              </button>
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
          ) : (
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
          )}

          {!mediaPermission.canAttach && mediaPermission.reason ? (
            <span className="min-w-0 flex-1 basis-56 whitespace-normal break-words leading-4 text-muted">
              {mediaPermission.reason}
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
          aria-label={actionTitle}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[#D7E7F7] bg-gradient-to-b from-white to-[#F8FBFF] px-4 text-sm font-extrabold text-[#526B86] shadow-[0_8px_20px_rgba(47,141,235,0.06)] transition hover:border-primary/35 hover:bg-primary-soft/70 hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border disabled:bg-surface-muted disabled:bg-none disabled:text-muted disabled:opacity-60 disabled:shadow-none dark:border-border dark:from-surface dark:to-surface-muted/40 dark:text-muted"
          disabled={!mediaPermission.canAttach || disabled}
          onClick={openFileDialog}
          onMouseDown={(event) => event.preventDefault()}
          title={mediaPermission.canAttach ? actionTitle : mediaPermission.reason}
          type="button"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Video className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Mídia
        </button>
      </div>
    </div>
  );
}
