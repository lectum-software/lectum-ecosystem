"use client";

import { Copy, Download, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LectumSymbolIcon } from "@/components/ui/lectum-symbol-icon";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { playVideoWithSound } from "@/lib/video-playback";
import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

type LectumShareDownloadDialogProps = {
  disabled?: boolean;
  onClose: () => void;
  onDownload: () => void;
  open: boolean;
  preparing?: boolean;
  target: LectumShareSocialTarget | null;
};

export const LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS = 300;
const PREVIEW_SHEET_SELECTOR = "[data-lectum-share-download-sheet]";
const PREVIEW_VIDEO_SELECTOR = '[data-lectum-share-preview-video="true"]';

const pauseBackgroundMedia = () => {
  for (const media of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
    if (media.closest(PREVIEW_SHEET_SELECTOR)) continue;
    if (media.paused || media.ended) continue;

    media.pause();
  }
};

const pausePreviewMediaBeforeDownload = () => {
  for (const media of document.querySelectorAll<HTMLMediaElement>(PREVIEW_VIDEO_SELECTOR)) {
    if (media.paused || media.ended) continue;

    media.pause();
  }
};

const applyPreviewMutedState = (video: HTMLVideoElement, muted: boolean) => {
  video.muted = muted;

  if (!muted && video.volume <= 0) {
    video.volume = 1;
  }
};

const wrapPreviewSourceText = (value: string, maxLineLength: number, maxLines: number) => {
  const words = value.replace(/\s+/gu, " ").trim().split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxLineLength) {
      current = candidate;
      continue;
    }

    if (current) lines.push(current);
    current = word.slice(0, maxLineLength);
    if (lines.length === maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === 0) lines.push("Conteúdo na Lectum");

  const visible = lines.slice(0, maxLines);
  if (visible.length === maxLines && words.join(" ").length > visible.join(" ").length) {
    const lastLine = visible[maxLines - 1];
    if (lastLine) {
      visible[maxLines - 1] = `${lastLine.replace(/[.?!,\s]+$/u, "")}…`;
    }
  }

  return visible;
};

const LectumSharePreviewArt = ({ target }: { target: LectumShareSocialTarget }) => {
  const sourceText = target.sourceText.trim() || "Conteúdo na Lectum";
  const sourceLines = useMemo(() => wrapPreviewSourceText(sourceText, 31, 3), [sourceText]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] text-center text-primary-foreground"
      data-lectum-share-preview-art="true"
    >
      <div className="absolute top-[13%] left-[10.2%] w-[79.7%] overflow-hidden rounded-[2.2cqw] drop-shadow-lg">
        <div className="flex h-[4.6cqh] min-h-[1.05rem] items-center justify-center gap-[1.1cqw] bg-primary px-[3.2cqw] text-[3.9cqw] font-black leading-none text-primary-foreground">
          <LectumSymbolIcon
            className="h-[3.05cqw] w-[3.05cqw] shrink-0 text-primary-foreground"
            title="Lectum"
          />
          <span className="min-w-0 truncate">{target.cardLabel}</span>
        </div>
        <div className="grid h-[13.85cqh] min-h-[3.15rem] place-items-center bg-media-foreground/95 px-[6.8cqw] text-media-background">
          <p
            className="line-clamp-3 whitespace-pre-line text-[5.2cqw] font-black leading-[1.22] tracking-[-0.035em]"
            data-lectum-share-preview-source-text="true"
          >
            {sourceLines.join("\n")}
          </p>
        </div>
      </div>

      <div className="absolute top-[69.7%] left-1/2 max-w-[72%] -translate-x-1/2 drop-shadow-md">
        <div className="inline-grid max-w-full justify-items-start text-left">
          <div className="flex max-w-full items-center justify-start gap-[1cqw]">
            <span className="truncate text-[3.7cqw] font-black leading-none tracking-[-0.02em]">
              {target.professional.name}
            </span>
            {target.professional.verified ? (
              <span className="grid size-[2.85cqw] min-h-2.5 min-w-2.5 place-items-center rounded-full bg-primary text-[1.9cqw] font-black leading-none text-primary-foreground">
                ✓
              </span>
            ) : null}
          </div>
          <div className="mt-[0.55cqw] max-w-full truncate text-[2.35cqw] font-bold leading-none text-primary-foreground/95">
            {target.professional.roleLabel}
          </div>
        </div>
      </div>
    </div>
  );
};

export const LectumShareDownloadDialog = ({
  disabled = false,
  onClose,
  onDownload,
  open,
  preparing = false,
  target,
}: LectumShareDownloadDialogProps) => {
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);

  const handlePreviewVideoReady = useCallback(
    (video: HTMLVideoElement | null) => {
      previewVideoRef.current = video;

      if (!video) return;

      applyPreviewMutedState(video, isPreviewMuted);
    },
    [isPreviewMuted],
  );

  useEffect(() => {
    if (!target || typeof document === "undefined") return;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [target]);

  useLayoutEffect(() => {
    if (!open || !target || typeof document === "undefined") return;

    pauseBackgroundMedia();

    const previewVideo =
      previewVideoRef.current ?? document.querySelector<HTMLVideoElement>(PREVIEW_VIDEO_SELECTOR);
    if (!previewVideo) return;

    const playPreviewVideo = () => {
      if (previewVideo.muted) {
        void previewVideo.play().catch(() => undefined);
        return;
      }

      void playVideoWithSound(previewVideo);
    };

    playPreviewVideo();

    previewVideo.addEventListener("loadedmetadata", playPreviewVideo, { once: true });
    previewVideo.addEventListener("canplay", playPreviewVideo, { once: true });

    return () => {
      previewVideo.removeEventListener("loadedmetadata", playPreviewVideo);
      previewVideo.removeEventListener("canplay", playPreviewVideo);
      previewVideo.pause();
    };
  }, [open, target]);

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

  if (!target) return null;

  const sheetMotionState = open ? "enter" : "exit";
  const resolvedMediaUrl = target.mediaUrl;
  const descriptionText = target.responseText?.trim() ?? "";
  const downloadButtonLabel = preparing ? "Preparando..." : "Baixar v\u00eddeo";

  const copyDescription = async () => {
    if (!descriptionText) return;

    try {
      await navigator.clipboard.writeText(descriptionText);
      toast.success("Descrição copiada.");
    } catch {
      toast.error("Não foi possível copiar a descrição agora.");
    }
  };

  const handleDownload = () => {
    pausePreviewMediaBeforeDownload();
    onDownload();
  };

  const handlePreviewMuteToggle = () => {
    const nextMutedState = !isPreviewMuted;
    setIsPreviewMuted(nextMutedState);

    const previewVideo = previewVideoRef.current;
    if (!previewVideo) return;

    applyPreviewMutedState(previewVideo, nextMutedState);

    if (nextMutedState) {
      void previewVideo.play().catch(() => undefined);
      return;
    }

    void playVideoWithSound(previewVideo);
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[120] flex items-end justify-center overflow-hidden overscroll-none bg-foreground/32 transition-opacity duration-200 ease-out dark:bg-background/72 sm:items-center sm:bg-foreground/45 sm:backdrop-blur-[8px] sm:dark:bg-background/75",
        open ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        aria-label="Fechar prévia do vídeo"
        className="absolute inset-0 cursor-default"
        disabled={disabled || !open}
        onClick={disabled ? undefined : onClose}
        type="button"
      />

      <section
        aria-labelledby="lectum-share-download-title"
        aria-modal="true"
        className={cn(
          "relative z-10 grid max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[min(100vw,44rem)] transform-gpu gap-3 overflow-y-auto overscroll-contain rounded-t-[2rem] border border-border bg-surface px-5 pt-5 pb-[calc(var(--lectum-bottom-fixed-padding)+1rem)] text-foreground shadow-[var(--lectum-shadow)] transition-transform will-change-transform sm:max-h-[min(760px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-[2rem] sm:pb-5",
          sheetMotionState === "enter"
            ? "translate-y-0 duration-[340ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            : "translate-y-[calc(100%+2rem)] duration-[300ms] ease-[cubic-bezier(0.4,0,1,1)]",
        )}
        data-lectum-share-download-sheet="true"
        data-lectum-share-download-sheet-motion={sheetMotionState}
        data-lectum-share-download-sheet-state={open ? "open" : "closed"}
        data-post-card-ignore-click="true"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 pt-1">
            <h2
              className="text-base font-black leading-tight tracking-[-0.01em]"
              id="lectum-share-download-title"
            >
              Publique nas redes sociais
            </h2>
            <p className="mt-1 max-w-[17rem] text-muted-foreground text-sm leading-5 sm:max-w-none">
              Baixe o vídeo personalizado para postar no Instagram e TikTok.
            </p>
          </div>

          <button
            aria-label="Fechar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-border bg-background text-muted-foreground transition hover:text-foreground disabled:opacity-60"
            disabled={disabled || !open}
            onClick={open ? onClose : undefined}
            type="button"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-auto w-[min(58vw,220px)] min-w-[190px]">
          <div className="relative aspect-[9/16] overflow-hidden bg-media-background [container-type:size]">
            <VerticalVideoPlayer
              className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none"
              controls={false}
              fit="cover"
              fullscreenVariant="content"
              poster={target.posterUrl ?? undefined}
              preload="auto"
              src={resolvedMediaUrl}
              title={target.shareTitle}
              onVideoElementReady={handlePreviewVideoReady}
              videoProps={{
                autoPlay: true,
                "data-lectum-share-preview-video": "true",
                loop: true,
                muted: isPreviewMuted,
              }}
            />
            <LectumSharePreviewArt target={target} />
            <button
              aria-label={
                isPreviewMuted
                  ? "Ativar \u00e1udio da pr\u00e9via"
                  : "Mutar \u00e1udio da pr\u00e9via"
              }
              aria-pressed={isPreviewMuted}
              className="absolute right-3 bottom-3 z-[3] grid h-8 w-8 place-items-center rounded-full bg-transparent text-primary-foreground/85 drop-shadow-lg transition hover:bg-transparent hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:pointer-events-none disabled:opacity-50"
              data-lectum-share-preview-volume-button="true"
              disabled={!open}
              onClick={handlePreviewMuteToggle}
              title={
                isPreviewMuted
                  ? "Ativar \u00e1udio da pr\u00e9via"
                  : "Mutar \u00e1udio da pr\u00e9via"
              }
              type="button"
            >
              {isPreviewMuted ? (
                <VolumeX className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {descriptionText ? (
          <section className="flex items-start gap-3 px-1">
            <p className="max-h-28 flex-1 overflow-y-auto whitespace-pre-line pr-1 text-muted-foreground text-sm leading-6">
              {descriptionText}
            </p>
            <div className="pt-0.5">
              <button
                aria-label="Copiar descrição"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition hover:bg-primary-soft/60 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                onClick={copyDescription}
                type="button"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </section>
        ) : null}

        <button
          className={cn(
            "flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 text-primary-foreground text-sm font-black transition",
            "hover:translate-y-[-1px] hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            "disabled:pointer-events-none disabled:opacity-65",
          )}
          disabled={disabled}
          onClick={handleDownload}
          type="button"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {downloadButtonLabel}
        </button>
      </section>
      <style>{`
        [data-lectum-share-download-sheet] {
          backface-visibility: hidden;
          contain: layout paint style;
          translate: 0 0;
        }

        [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="initial"] {
          transform: translate3d(0, calc(100% + 2rem), 0);
        }

        [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="enter"] {
          animation: lectum-share-download-sheet-enter 340ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="exit"] {
          animation: lectum-share-download-sheet-exit 300ms cubic-bezier(0.4, 0, 1, 1) both;
        }

        @keyframes lectum-share-download-sheet-enter {
          from {
            transform: translate3d(0, calc(100% + 2rem), 0);
          }

          to {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes lectum-share-download-sheet-exit {
          from {
            transform: translate3d(0, 0, 0);
          }

          to {
            transform: translate3d(0, calc(100% + 2rem), 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="enter"] {
            animation: none;
            transform: translate3d(0, 0, 0);
          }

          [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="initial"],
          [data-lectum-share-download-sheet][data-lectum-share-download-sheet-motion="exit"] {
            animation: none;
            transform: translate3d(0, calc(100% + 2rem), 0);
          }
        }
      `}</style>
    </div>
  );
};
