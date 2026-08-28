"use client";

import { Copy, Download, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useLayoutEffect } from "react";
import { toast } from "sonner";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { playVideoWithSound } from "@/lib/video-playback";
import { storyCanvasLayout } from "@/utils/lectum-share-media/layout";
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
export const LECTUM_SHARE_PREVIEW_SHEET_EXIT_MS = 300;
const PREVIEW_SHEET_SELECTOR = "[data-lectum-share-download-sheet]";
const PREVIEW_VIDEO_SELECTOR = '[data-lectum-share-preview-video="true"]';
const PREVIEW_LAYOUT = storyCanvasLayout;
const PREVIEW_CARD = PREVIEW_LAYOUT.card;
const PREVIEW_PROFESSIONAL_TAG = PREVIEW_LAYOUT.professionalTag;
const PREVIEW_PROFESSIONAL_TAG_TOP =
  PREVIEW_LAYOUT.height - PREVIEW_PROFESSIONAL_TAG.bottom - PREVIEW_PROFESSIONAL_TAG.height;

const previewLength = (value: number) => `calc(${value} / ${PREVIEW_LAYOUT.width} * 100cqw)`;

const previewQuestionCardStyle: CSSProperties = {
  borderRadius: previewLength(PREVIEW_CARD.radius),
  left: previewLength(PREVIEW_CARD.x),
  top: previewLength(PREVIEW_CARD.y),
  width: previewLength(PREVIEW_CARD.width),
};

const previewQuestionHeaderStyle: CSSProperties = {
  fontSize: previewLength(PREVIEW_CARD.headerFontSize),
  height: previewLength(PREVIEW_CARD.headerHeight),
  lineHeight: "1",
};

const previewQuestionLogoStyle: CSSProperties = {
  backgroundColor: "currentColor",
  maskImage: 'url("/logo-icon.svg")',
  maskPosition: "center",
  maskRepeat: "no-repeat",
  maskSize: "contain",
  height: previewLength(PREVIEW_CARD.brandIconSize),
  WebkitMaskImage: 'url("/logo-icon.svg")',
  WebkitMaskPosition: "center",
  WebkitMaskRepeat: "no-repeat",
  WebkitMaskSize: "contain",
  width: previewLength(PREVIEW_CARD.brandIconSize),
};

const previewQuestionHeaderContentStyle: CSSProperties = {
  gap: previewLength(PREVIEW_CARD.brandGap),
};

const previewQuestionBodyStyle: CSSProperties = {
  fontSize: previewLength(PREVIEW_CARD.bodyFontSize),
  lineHeight: previewLength(PREVIEW_CARD.lineHeight),
  minHeight: previewLength(PREVIEW_CARD.minBodyHeight),
  padding: `${previewLength(PREVIEW_CARD.paddingY)} ${previewLength(PREVIEW_CARD.paddingX)}`,
};

const previewProfessionalTagStyle: CSSProperties = {
  gap: previewLength(PREVIEW_PROFESSIONAL_TAG.roleGap),
  left: "50%",
  maxWidth: previewLength(PREVIEW_PROFESSIONAL_TAG.maxWidth),
  top: previewLength(PREVIEW_PROFESSIONAL_TAG_TOP),
  transform: "translateX(-50%)",
};

const previewProfessionalNameStyle: CSSProperties = {
  fontSize: previewLength(PREVIEW_PROFESSIONAL_TAG.nameFontSize),
  gap: previewLength(PREVIEW_PROFESSIONAL_TAG.gap * 0.55),
  lineHeight: "1.1",
  textShadow: "0 2px 8px var(--lectum-media-background)",
};

const previewProfessionalRoleStyle: CSSProperties = {
  fontSize: previewLength(PREVIEW_PROFESSIONAL_TAG.roleFontSize),
  lineHeight: "1.15",
  textShadow: "0 2px 8px var(--lectum-media-background)",
};

const previewVerifiedBadgeStyle: CSSProperties = {
  height: previewLength(PREVIEW_PROFESSIONAL_TAG.verifiedSize),
  width: previewLength(PREVIEW_PROFESSIONAL_TAG.verifiedSize),
};

const PreviewVerifiedBadge = () => (
  <span
    aria-label="Perfil verificado"
    className="grid shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
    role="img"
    style={previewVerifiedBadgeStyle}
  >
    <svg
      aria-hidden="true"
      className="h-[62%] w-[62%]"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.75 12.4 10.15 15.8 17.55 8.2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  </span>
);

const pauseBackgroundMedia = () => {
  for (const media of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
    if (media.closest(PREVIEW_SHEET_SELECTOR)) continue;
    if (media.paused || media.ended) continue;

    media.pause();
  }
};

export const LectumShareDownloadDialog = ({
  disabled = false,
  onClose,
  onDownload,
  open,
  target,
}: LectumShareDownloadDialogProps) => {
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

    const previewVideo = document.querySelector<HTMLVideoElement>(PREVIEW_VIDEO_SELECTOR);
    if (!previewVideo) return;

    const playPreviewWithSound = () => {
      void playVideoWithSound(previewVideo);
    };

    playPreviewWithSound();

    previewVideo.addEventListener("loadedmetadata", playPreviewWithSound, { once: true });
    previewVideo.addEventListener("canplay", playPreviewWithSound, { once: true });

    return () => {
      previewVideo.removeEventListener("loadedmetadata", playPreviewWithSound);
      previewVideo.removeEventListener("canplay", playPreviewWithSound);
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
  const resolvedMediaUrl = resolvePublicMediaUrl(target.mediaUrl);
  const resolvedPosterUrl = resolvePublicMediaUrl(target.posterUrl);
  const sourceText = target.sourceText.trim() || SOURCE_TEXT_FALLBACK;
  const descriptionText = target.responseText?.trim() ?? "";

  const copyDescription = async () => {
    if (!descriptionText) return;

    try {
      await navigator.clipboard.writeText(descriptionText);
      toast.success("Descrição copiada.");
    } catch {
      toast.error("Não foi possível copiar a descrição agora.");
    }
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
          "relative z-10 grid max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-[min(100vw,44rem)] transform-gpu gap-4 overflow-y-auto overscroll-contain rounded-t-[2rem] border border-border bg-surface px-5 pt-5 pb-[calc(var(--lectum-bottom-fixed-padding)+1rem)] text-foreground shadow-[var(--lectum-shadow)] transition-transform will-change-transform sm:max-h-[min(760px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-[2rem] sm:pb-5",
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
              Baixe o vídeo com a arte da Lectum e poste no Instagram, TikTok ou Shorts.
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

        <div className="mx-auto w-[min(76vw,320px)] min-w-[220px]">
          {resolvedMediaUrl ? (
            <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-border bg-media-background [container-type:inline-size]">
              <VerticalVideoPlayer
                className="absolute inset-0 h-full w-full rounded-none border-0 shadow-none"
                controls={false}
                fit="contain"
                fullscreenVariant="content"
                poster={resolvedPosterUrl}
                preload="auto"
                src={resolvedMediaUrl}
                title={target.shareTitle}
                videoProps={{
                  autoPlay: true,
                  "data-lectum-share-preview-video": "true",
                  loop: true,
                  muted: false,
                }}
              />

              <div
                className="pointer-events-none absolute z-[4] overflow-hidden border border-surface/80 bg-surface/95 text-center shadow-[var(--lectum-shadow-soft)]"
                style={previewQuestionCardStyle}
              >
                <div
                  className="flex items-center justify-center bg-primary text-primary-foreground font-extrabold"
                  style={previewQuestionHeaderStyle}
                >
                  <span
                    className="inline-flex items-center justify-center"
                    style={previewQuestionHeaderContentStyle}
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block shrink-0"
                      style={previewQuestionLogoStyle}
                    />
                    <span>{target.cardLabel}</span>
                  </span>
                </div>
                <div
                  className="grid place-items-center text-foreground font-bold"
                  style={previewQuestionBodyStyle}
                >
                  <p className="line-clamp-3">{sourceText}</p>
                </div>
              </div>

              <div
                className="pointer-events-none absolute z-[4] grid justify-items-start text-media-foreground"
                style={previewProfessionalTagStyle}
              >
                <div
                  className="inline-flex max-w-full items-center font-bold"
                  style={previewProfessionalNameStyle}
                >
                  <span className="truncate">{target.professional.name}</span>
                  {target.professional.verified ? <PreviewVerifiedBadge /> : null}
                </div>
                <span className="font-medium opacity-80" style={previewProfessionalRoleStyle}>
                  {target.professional.roleLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="grid aspect-[9/16] place-items-center rounded-[28px] border border-border bg-surface-muted px-5 text-center text-muted text-sm">
              Vídeo indisponível para prévia.
            </div>
          )}
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
          onClick={onDownload}
          type="button"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {disabled ? "Preparando..." : "Baixar vídeo"}
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
