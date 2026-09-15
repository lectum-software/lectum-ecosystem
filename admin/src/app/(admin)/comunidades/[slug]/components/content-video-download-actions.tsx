"use client";

import { Download, ImageDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type ContentVideoDownloadTarget,
  useContentVideoDownloads,
} from "../modules/video-downloads";

type ContentVideoDownloadActionsProps = ContentVideoDownloadTarget & {
  allowArtDownload: boolean;
  className?: string;
  compact?: boolean;
};

export const ContentVideoDownloadActions = ({
  allowArtDownload,
  className,
  compact = false,
  communityId,
  targetId,
  targetType,
}: ContentVideoDownloadActionsProps) => {
  const { downloadOriginal, downloadWithArt, isPending } = useContentVideoDownloads();
  const target: ContentVideoDownloadTarget = { communityId, targetId, targetType };
  const originalPending = isPending(target, "original");
  const artPending = isPending(target, "art");
  const disabled = originalPending || artPending;
  const iconClass = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonClass = cn(
    "inline-flex items-center justify-center gap-1.5 rounded-control border px-2.5 font-black transition disabled:pointer-events-none disabled:opacity-60",
    compact ? "min-h-8 text-[11px]" : "min-h-9 text-xs",
  );

  return (
    <div className={cn("grid gap-1.5", compact ? "text-[11px]" : "sm:grid-cols-2", className)}>
      <button
        aria-label="Baixar vídeo original"
        className={cn(
          buttonClass,
          "border-border bg-surface text-foreground hover:border-primary hover:text-primary",
        )}
        disabled={disabled}
        onClick={() => void downloadOriginal(target)}
        title="Baixar vídeo original"
        type="button"
      >
        {originalPending ? (
          <Loader2 aria-hidden className={cn(iconClass, "animate-spin")} />
        ) : (
          <Download aria-hidden className={iconClass} />
        )}
        <span>{compact ? "Original" : "Baixar original"}</span>
      </button>
      {allowArtDownload ? (
        <button
          aria-label="Baixar vídeo com arte Lectum"
          className={cn(
            buttonClass,
            "border-primary/25 bg-primary-soft text-primary hover:border-primary hover:bg-primary/10",
          )}
          disabled={disabled}
          onClick={() => void downloadWithArt(target)}
          title="Baixar vídeo com arte Lectum"
          type="button"
        >
          {artPending ? (
            <Loader2 aria-hidden className={cn(iconClass, "animate-spin")} />
          ) : (
            <ImageDown aria-hidden className={iconClass} />
          )}
          <span>{compact ? "Com arte" : "Baixar com arte"}</span>
        </button>
      ) : null}
    </div>
  );
};
