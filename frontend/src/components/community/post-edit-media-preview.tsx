import { X } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  type EditablePostMediaPreviewItem,
  resolveEditableMediaPreviewUrls,
  type SelectedPostMedia,
} from "./post-edit-modal-support";

type PostEditMediaPreviewProps = {
  canManageMedia: boolean;
  disabled: boolean;
  items: EditablePostMediaPreviewItem[];
  onFocusEditor: () => void;
  onRemoveSelected: (index: number) => void;
  onRemoveStored: (id: string) => void;
  onUpdateSelectedOrientation: (id: string, orientation: SelectedPostMedia["orientation"]) => void;
  onUpdateStoredOrientation: (id: string, orientation: SelectedPostMedia["orientation"]) => void;
};

export function PostEditMediaPreview({
  canManageMedia,
  disabled,
  items,
  onFocusEditor,
  onRemoveSelected,
  onRemoveStored,
  onUpdateSelectedOrientation,
  onUpdateStoredOrientation,
}: PostEditMediaPreviewProps) {
  if (items.length === 0) return null;

  return (
    <ul
      aria-label="Mídias anexadas ao post"
      className="mt-2 flex max-h-28 shrink-0 gap-2 overflow-x-auto overflow-y-hidden pb-1"
    >
      {items.map((mediaItem, index) => {
        const { imagePreviewSrc, mediaSrc, shouldRenderImagePreview } =
          resolveEditableMediaPreviewUrls(mediaItem);
        const frameClassName =
          mediaItem.orientation === "landscape"
            ? "h-20 w-32 sm:h-[5.5rem] sm:w-[9.75rem]"
            : mediaItem.orientation === "portrait"
              ? "h-24 w-[4.4rem] sm:h-28 sm:w-20"
              : "h-20 w-20 sm:h-[5.5rem] sm:w-[5.5rem]";

        const updateOrientation = (orientation: SelectedPostMedia["orientation"]) => {
          if (mediaItem.source === "selected") {
            onUpdateSelectedOrientation(mediaItem.id, orientation);
            return;
          }

          onUpdateStoredOrientation(mediaItem.id, orientation);
        };

        return (
          <li
            className={cn(
              "relative shrink-0 overflow-hidden rounded-[1.05rem] border border-border bg-surface-muted shadow-none",
              frameClassName,
            )}
            key={`${mediaItem.source}-${mediaItem.id}`}
          >
            {shouldRenderImagePreview && imagePreviewSrc ? (
              <Image
                alt={
                  mediaItem.type === "video"
                    ? `Miniatura do vídeo anexado ${index + 1}`
                    : `Miniatura da imagem anexada ${index + 1}`
                }
                className="object-cover"
                fill
                onLoad={(event) => {
                  const { naturalHeight, naturalWidth } = event.currentTarget;
                  updateOrientation(
                    naturalWidth && naturalHeight && naturalWidth / naturalHeight >= 1.12
                      ? "landscape"
                      : "portrait",
                  );
                }}
                sizes="160px"
                src={imagePreviewSrc}
                unoptimized
              />
            ) : (
              <video
                aria-label="Miniatura do vídeo anexado"
                className="h-full w-full object-cover"
                muted
                onLoadedMetadata={(event) => {
                  const { videoHeight, videoWidth } = event.currentTarget;
                  updateOrientation(
                    videoWidth && videoHeight && videoWidth / videoHeight >= 1.12
                      ? "landscape"
                      : "portrait",
                  );
                }}
                playsInline
                preload="metadata"
                src={mediaSrc}
              />
            )}

            {canManageMedia ? (
              <button
                aria-label={`Remover mídia anexada ${index + 1}`}
                className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-surface/92 text-muted shadow-none ring-1 ring-border/70 transition hover:bg-surface hover:text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                disabled={disabled}
                onClick={() => {
                  if (mediaItem.source === "selected") {
                    onRemoveSelected(mediaItem.selectedIndex ?? 0);
                  } else {
                    onRemoveStored(mediaItem.id);
                  }
                  onFocusEditor();
                }}
                onMouseDown={(event) => event.preventDefault()}
                tabIndex={-1}
                type="button"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
