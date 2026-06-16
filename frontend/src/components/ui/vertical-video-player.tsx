"use client";

import { Maximize2, Play, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { needsUserPlayWithSound, playVideoWithSound } from "@/lib/video-playback";

type VideoFit = "contain" | "cover";

type VerticalVideoLightboxProps = {
  open: boolean;
  onClose: () => void;
  poster?: string | null;
  src: string;
  title: string;
};

type VerticalVideoPlayerProps = {
  className?: string;
  controls?: boolean;
  expandLabel?: string;
  fit?: VideoFit;
  poster?: string | null;
  preload?: "auto" | "metadata" | "none";
  src: string;
  title: string;
  videoClassName?: string;
};

const fitClassName: Record<VideoFit, string> = {
  contain: "object-contain",
  cover: "object-cover",
};

export const VerticalVideoLightbox = ({
  onClose,
  open,
  poster,
  src,
  title,
}: VerticalVideoLightboxProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [needsActivation, setNeedsActivation] = useState(true);

  const syncVideoState = useCallback(() => {
    setNeedsActivation(needsUserPlayWithSound(videoRef.current));
  }, []);

  const handleUserPlayWithSound = useCallback(async () => {
    const played = await playVideoWithSound(videoRef.current);
    syncVideoState();

    if (!played) {
      setNeedsActivation(true);
    }
  }, [syncVideoState]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    const timeout = window.setTimeout(syncVideoState, 0);

    return () => window.clearTimeout(timeout);
  }, [open, syncVideoState]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-label={title}
      aria-modal="true"
      className="fixed inset-0 z-[9999] grid place-items-center bg-black/95 px-3 py-[max(12px,env(safe-area-inset-top))] text-white backdrop-blur-sm sm:px-6 sm:py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
    >
      <button
        aria-label="Fechar vídeo ampliado"
        className="fixed top-[max(14px,env(safe-area-inset-top))] right-4 z-[2] grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/12 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        onClick={onClose}
        type="button"
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      <div
        className="relative isolate aspect-[9/16] overflow-hidden rounded-[22px] bg-black shadow-[0_24px_80px_rgba(0,0,0,0.5)] ring-1 ring-white/10 sm:rounded-[28px]"
        style={{
          height: "min(calc(100dvh - 32px), calc((100vw - 24px) * 16 / 9))",
          width: "min(calc(100vw - 24px), calc((100dvh - 32px) * 9 / 16))",
        }}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: Conteúdos enviados por usuários ainda não possuem legenda persistida. */}
        <video
          aria-label={title}
          autoPlay
          className="h-full w-full bg-black object-contain"
          controls
          controlsList="nodownload nofullscreen"
          onLoadedMetadata={syncVideoState}
          onPause={syncVideoState}
          onPlay={syncVideoState}
          onVolumeChange={syncVideoState}
          playsInline
          poster={poster || undefined}
          preload="metadata"
          ref={videoRef}
          src={src}
        >
          Seu navegador não suporta a reprodução de vídeo.
        </video>
        {needsActivation ? (
          <button
            aria-label={`Reproduzir video com som: ${title}`}
            className="absolute inset-0 z-[1] grid place-items-center bg-black/10 text-white transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={handleUserPlayWithSound}
            type="button"
          >
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/38 shadow-[0_14px_34px_rgba(0,0,0,0.32)] backdrop-blur">
              <Play className="ml-1 h-7 w-7 fill-white" aria-hidden="true" />
            </span>
          </button>
        ) : null}
      </div>
    </div>,
    document.body,
  );
};

export const VerticalVideoPlayer = ({
  className,
  controls = true,
  expandLabel,
  fit = "cover",
  poster,
  preload = "metadata",
  src,
  title,
  videoClassName,
}: VerticalVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsActivation, setNeedsActivation] = useState(true);

  const syncVideoState = useCallback(() => {
    const currentVideo = videoRef.current;

    setNeedsActivation(needsUserPlayWithSound(currentVideo));
  }, []);

  const handleUserPlayWithSound = useCallback(async () => {
    const played = await playVideoWithSound(videoRef.current);
    syncVideoState();

    if (!played) {
      setNeedsActivation(true);
    }
  }, [syncVideoState]);

  const openExpanded = () => {
    videoRef.current?.pause();
    syncVideoState();
    setExpanded(true);
  };

  return (
    <>
      <div
        className={cn(
          "relative aspect-[9/16] overflow-hidden rounded-[22px] border border-border bg-black shadow-inner",
          className,
        )}
      >
        {/* biome-ignore lint/a11y/useMediaCaption: Conteúdos enviados por usuários ainda não possuem legenda persistida. */}
        <video
          aria-label={title}
          className={cn("h-full w-full bg-black", fitClassName[fit], videoClassName)}
          controls={controls}
          controlsList="nodownload nofullscreen"
          onLoadedMetadata={syncVideoState}
          onPause={syncVideoState}
          onPlay={syncVideoState}
          onVolumeChange={syncVideoState}
          playsInline
          poster={poster || undefined}
          preload={preload}
          ref={videoRef}
          src={src}
        >
          Seu navegador não suporta a reprodução de vídeo.
        </video>

        {needsActivation ? (
          <button
            aria-label={`Reproduzir video com som: ${title}`}
            className="absolute inset-0 z-[1] grid place-items-center text-white/80 transition hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            onClick={handleUserPlayWithSound}
            type="button"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full bg-black/32 shadow-[0_12px_28px_rgba(0,0,0,0.2)] backdrop-blur">
              <Play className="ml-1 h-6 w-6 fill-white" aria-hidden="true" />
            </span>
          </button>
        ) : null}

        <button
          aria-label={expandLabel ?? `Ampliar vídeo: ${title}`}
          className="absolute top-2 right-2 z-[2] grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white shadow-[0_8px_20px_rgba(0,0,0,0.22)] backdrop-blur transition hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          onClick={openExpanded}
          type="button"
        >
          <Maximize2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <VerticalVideoLightbox
        onClose={() => setExpanded(false)}
        open={expanded}
        poster={poster}
        src={src}
        title={title}
      />
    </>
  );
};
