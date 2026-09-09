"use client";

import { Copy, Download, Volume2, VolumeX, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { playVideoWithSound } from "@/lib/video-playback";
import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";

type LectumShareDownloadDialogProps = {
  disabled?: boolean;
  onClose: () => void;
  onDownload: () => void;
  open: boolean;
  preparedFile?: File | null;
  preparing?: boolean;
  ready?: boolean;
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

export const LectumShareDownloadDialog = ({
  disabled = false,
  onClose,
  onDownload,
  open,
  preparedFile = null,
  preparing = false,
  ready = false,
  target,
}: LectumShareDownloadDialogProps) => {
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const preparedPreviewUrl = useMemo(() => {
    if (!preparedFile || typeof URL === "undefined") return null;

    return URL.createObjectURL(preparedFile);
  }, [preparedFile]);

  const handlePreviewVideoReady = useCallback(
    (video: HTMLVideoElement | null) => {
      previewVideoRef.current = video;

      if (!video) return;

      applyPreviewMutedState(video, isPreviewMuted);
    },
    [isPreviewMuted],
  );

  useEffect(() => {
    if (!preparedPreviewUrl || typeof URL === "undefined") return;

    return () => {
      URL.revokeObjectURL(preparedPreviewUrl);
    };
  }, [preparedPreviewUrl]);

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
    if (!open || !target || !preparedPreviewUrl || typeof document === "undefined") return;

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
  }, [open, preparedPreviewUrl, target]);

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
  const resolvedMediaUrl = preparedPreviewUrl;
  const descriptionText = target.responseText?.trim() ?? "";
  const downloadButtonLabel = preparing
    ? "Preparando..."
    : ready
      ? "Baixar v\u00eddeo"
      : "Preparar v\u00eddeo";

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
          {resolvedMediaUrl ? (
            <div className="relative aspect-[9/16] overflow-hidden bg-media-background [container-type:inline-size]">
              <VerticalVideoPlayer
                className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none"
                controls={false}
                fit="cover"
                fullscreenVariant="content"
                poster={undefined}
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
            </div>
          ) : (
            <div className="grid aspect-[9/16] place-items-center border border-border bg-surface-muted px-5 text-center text-muted text-sm">
              {preparing
                ? "Preparando prévia idêntica ao vídeo final..."
                : "A prévia final aparece aqui quando o vídeo com arte estiver pronto."}
            </div>
          )}
        </div>

        {resolvedMediaUrl ? (
          <button
            aria-label={
              isPreviewMuted
                ? "Ativar som da pr\u00e9via do v\u00eddeo"
                : "Mutar pr\u00e9via do v\u00eddeo"
            }
            aria-pressed={isPreviewMuted}
            className="mx-auto inline-flex items-center justify-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-muted-foreground text-xs font-bold transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50"
            disabled={!open}
            onClick={handlePreviewMuteToggle}
            title={
              isPreviewMuted
                ? "Ativar som da pr\u00e9via do v\u00eddeo"
                : "Mutar pr\u00e9via do v\u00eddeo"
            }
            type="button"
          >
            {isPreviewMuted ? (
              <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isPreviewMuted ? "Som desligado" : "Som ligado"}
          </button>
        ) : null}

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
