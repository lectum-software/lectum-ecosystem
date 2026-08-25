"use client";

import { Download, X } from "lucide-react";
import { useEffect } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

type LectumShareDownloadDialogProps = {
  disabled?: boolean;
  onClose: () => void;
  onDownload: () => void;
  open: boolean;
  target: LectumShareSocialTarget | null;
};

const SOURCE_TEXT_FALLBACK = "Conteúdo na Lectum";

export const LectumShareDownloadDialog = ({
  disabled = false,
  onClose,
  onDownload,
  open,
  target,
}: LectumShareDownloadDialogProps) => {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || disabled || typeof window === "undefined") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onClose, open]);

  if (!open || !target) return null;

  const resolvedMediaUrl = resolvePublicMediaUrl(target.mediaUrl);
  const sourceText = target.sourceText.trim() || SOURCE_TEXT_FALLBACK;

  return (
    <div className="fixed inset-0 z-[120] grid items-end bg-foreground/40 px-3 pb-3 backdrop-blur-[3px] sm:items-center sm:px-4 sm:pb-0">
      <button
        aria-label="Fechar prévia do vídeo"
        className="absolute inset-0 cursor-default"
        disabled={disabled}
        onClick={disabled ? undefined : onClose}
        type="button"
      />

      <section
        aria-labelledby="lectum-share-download-title"
        aria-modal="true"
        className="relative mx-auto grid max-h-[calc(100dvh-1.5rem)] w-full max-w-[430px] gap-4 overflow-y-auto rounded-t-[34px] border border-border bg-surface px-5 pt-5 pb-[calc(var(--lectum-bottom-fixed-padding)+1rem)] text-foreground shadow-[var(--lectum-shadow)] sm:max-h-[min(760px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-[34px] sm:pb-5"
        data-post-card-ignore-click="true"
        role="dialog"
      >
        <div className="flex justify-end">
          <button
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            disabled={disabled}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <h2 className="sr-only" id="lectum-share-download-title">
          Baixar vídeo
        </h2>

        <div className="mx-auto w-[min(76vw,320px)] min-w-[220px]">
          {resolvedMediaUrl ? (
            <div className="relative overflow-hidden rounded-[28px] border border-border bg-media-background">
              <VerticalVideoPlayer
                className="border-0 shadow-none"
                controlsVariant="minimal"
                fit="cover"
                fullscreenVariant="content"
                preload="metadata"
                src={resolvedMediaUrl}
                title={target.shareTitle}
              />

              <div className="pointer-events-none absolute inset-x-5 top-5 z-[4] overflow-hidden rounded-[18px] border border-border/40 bg-surface/95 text-center shadow-[var(--lectum-shadow-soft)] backdrop-blur-sm">
                <p className="bg-primary px-3 py-2 text-primary-foreground text-xs font-black">
                  {target.cardLabel}
                </p>
                <p className="line-clamp-2 px-3 py-2 text-sm font-black leading-5 text-foreground">
                  {sourceText}
                </p>
              </div>

              <div className="pointer-events-none absolute inset-x-4 bottom-[4.5rem] z-[4] grid justify-center text-center">
                <div className="inline-grid max-w-full gap-1 rounded-2xl bg-media-background/35 px-3 py-2 text-media-foreground backdrop-blur-sm">
                  <span className="inline-flex max-w-full items-center justify-center gap-1.5 text-sm font-black">
                    <span className="truncate">{target.professional.name}</span>
                    {target.professional.verified ? (
                      <VerifiedBadgeIcon
                        aria-label="Perfil verificado"
                        className="h-3.5 w-3.5 shrink-0"
                      />
                    ) : null}
                  </span>
                  <span className="text-xs font-semibold opacity-90">
                    {target.professional.roleLabel}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid aspect-[9/16] place-items-center rounded-[28px] border border-border bg-surface-muted px-5 text-center text-muted text-sm">
              Vídeo indisponível para prévia.
            </div>
          )}
        </div>

        <button
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-primary-foreground text-sm font-black transition",
            "hover:translate-y-[-1px] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:pointer-events-none disabled:opacity-65",
          )}
          disabled={disabled}
          onClick={onDownload}
          type="button"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {disabled ? "Preparando..." : "Baixar vídeo"}
        </button>
      </section>
    </div>
  );
};
