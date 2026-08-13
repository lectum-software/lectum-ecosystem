"use client";

import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import { playVideoWithSound } from "@/lib/video-playback";
import {
  type LectumShareSocialTarget,
  truncateLectumShareProfessionalTagName,
} from "@/utils/lectum-share-target";
import { resolvePublicMediaUrl } from "@/utils/media";

const sharePreviewClassName = "w-[min(74vw,300px,31.5dvh)] sm:w-[min(34vw,340px,36dvh)]";

const sharePreviewCardClassName =
  "top-[6%] left-[10%] right-[10%] overflow-hidden rounded-[8px] sm:top-[6.75%] sm:left-[11%] sm:right-[11%] sm:rounded-[7px]";

const twoLineClampStyle = {
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  display: "-webkit-box",
  maxHeight: "2.16em",
} as CSSProperties;

const normalizePreviewText = (value: string) => value.replace(/\s+/g, " ").trim();

export const SharePreview = ({ target }: { target: LectumShareSocialTarget }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoIsMuted, setVideoIsMuted] = useState(false);
  const mediaSrc = resolvePublicMediaUrl(target.mediaUrl);
  const professionalTagName = truncateLectumShareProfessionalTagName(target.professional.name);
  const sourcePreview = normalizePreviewText(target.sourceText);

  useEffect(() => {
    if (!mediaSrc || target.mediaType !== "video") return;

    const video = videoRef.current;
    if (!video) return;

    let canceled = false;
    const syncMutedState = () => {
      if (!canceled) setVideoIsMuted(video.muted || video.volume <= 0);
    };
    const startPreview = async () => {
      const didPlayWithSound = await playVideoWithSound(video);
      if (canceled) return;

      if (!didPlayWithSound) {
        video.muted = true;
        syncMutedState();
        await video.play().catch(() => undefined);
        return;
      }

      syncMutedState();
    };

    video.addEventListener("volumechange", syncMutedState);
    void startPreview();

    return () => {
      canceled = true;
      video.removeEventListener("volumechange", syncMutedState);
    };
  }, [mediaSrc, target.mediaType]);

  const togglePreviewSound = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.muted || video.volume <= 0) {
      video.muted = false;
      if (video.volume <= 0) video.volume = 1;
      void video
        .play()
        .then(() => setVideoIsMuted(false))
        .catch(() => {
          video.muted = true;
          setVideoIsMuted(true);
        });
      return;
    }

    video.muted = true;
    setVideoIsMuted(true);
  }, []);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/16] overflow-hidden rounded-[28px] bg-foreground text-primary-foreground",
        sharePreviewClassName,
      )}
    >
      {mediaSrc && target.mediaType === "video" ? (
        <>
          <video
            aria-label="Previa do video no layout de compartilhamento Lectum"
            autoPlay
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            crossOrigin="anonymous"
            loop
            muted={videoIsMuted}
            playsInline
            ref={videoRef}
            src={mediaSrc}
          />
          <button
            aria-label={
              videoIsMuted ? "Ativar som do video do preview" : "Silenciar video do preview"
            }
            className="absolute right-3 bottom-3 z-20 grid h-9 w-9 place-items-center rounded-full border border-media-foreground/30 bg-media-background/45 text-primary-foreground backdrop-blur transition hover:bg-media-background/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70 active:scale-95"
            onClick={togglePreviewSound}
            type="button"
          >
            {videoIsMuted ? (
              <VolumeX className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
              <Volume2 className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
          </button>
        </>
      ) : mediaSrc ? (
        <>
          <Image
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-55 blur-xl"
            fill
            sizes="(min-width: 640px) 340px, 300px"
            src={mediaSrc}
            unoptimized
          />
          <Image
            alt="Previa da imagem no layout de compartilhamento Lectum"
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            fill
            sizes="(min-width: 640px) 340px, 300px"
            src={mediaSrc}
            unoptimized
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-foreground" />
      )}

      <div
        className={cn(
          "absolute border border-media-foreground/80 bg-surface/95 text-foreground shadow-lectum-soft ring-1 ring-foreground/10 backdrop-blur-xl",
          sharePreviewCardClassName,
        )}
      >
        <p className="share-preview-header border-primary-foreground/20 border-b px-3.5 py-[7px] text-center text-[10px] font-bold leading-none tracking-[-0.01em] text-primary-foreground shadow-lectum-soft sm:px-3 sm:py-[6px] sm:text-[8px] sm:leading-none">
          {target.cardLabel}
        </p>
        <div className="share-preview-body px-3.5 py-2 text-center sm:px-3 sm:py-1.5">
          <p
            className={cn(
              "m-0 overflow-hidden break-words font-semibold tracking-[-0.02em] text-foreground",
              "text-[clamp(0.7rem,2.35vw,0.84rem)] leading-[1.08] sm:text-[10px] sm:leading-[1.08]",
            )}
            style={twoLineClampStyle}
          >
            {sourcePreview}
          </p>
        </div>
      </div>

      <div className="absolute bottom-[23.5%] left-1/2 z-10 flex max-w-[72%] -translate-x-1/2 items-center px-1 py-0 text-primary-foreground [text-shadow:0_1px_4px_rgb(0_0_0_/_70%)]">
        <span className="flex min-w-0 flex-col items-start justify-center">
          <span className="flex min-w-0 items-center gap-1 leading-[1.05]">
            <span className="min-w-0 whitespace-nowrap text-left text-[11px] font-bold leading-[1.05] tracking-[-0.02em] text-primary-foreground sm:text-[9.5px]">
              {professionalTagName}
            </span>
            {target.professional.verified ? (
              <VerifiedBadgeIcon
                aria-hidden="true"
                className="h-3 w-3 shrink-0 sm:h-2.5 sm:w-2.5"
              />
            ) : null}
          </span>
          <span className="mt-0.5 whitespace-nowrap text-left text-[8.5px] font-medium leading-[1.25] tracking-[-0.01em] text-primary-foreground/75 sm:text-[7.5px] sm:leading-[1.25]">
            {target.professional.roleLabel}
          </span>
        </span>
      </div>
    </div>
  );
};
