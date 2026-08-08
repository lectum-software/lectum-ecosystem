"use client";

import { Image as ImageIcon, Maximize2, Play, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { AdminCommunityContentItem } from "@/api/req/communities";
import { isAdminPublicMediaUrl, renderableImageSrc, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";

export const ContentVideoMiniplayer = ({ label, src }: { label: string; src: string }) => {
  const expandedVideoRef = useRef<HTMLVideoElement | null>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement | null>(null);
  const videoTimeRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const syncInlineVideoTime = useCallback((time: number) => {
    videoTimeRef.current = time;
    const video = videoRef.current;
    if (!video || !Number.isFinite(time)) return;
    video.currentTime = time;
  }, []);

  const playVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const openExpandedVideo = () => {
    const video = videoRef.current;
    if (video) {
      videoTimeRef.current = video.currentTime;
      video.pause();
    }

    flushSync(() => {
      setIsExpanded(true);
    });

    const container = fullscreenContainerRef.current;
    if (container?.requestFullscreen) {
      void container.requestFullscreen().catch(() => undefined);
    }
  };

  const closeExpandedVideo = useCallback(() => {
    const expandedVideo = expandedVideoRef.current;
    if (expandedVideo) {
      syncInlineVideoTime(expandedVideo.currentTime);
      expandedVideo.pause();
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined);
    }

    setIsExpanded(false);
  }, [syncInlineVideoTime]);

  useEffect(() => {
    if (!isExpanded) return;

    const expandedVideo = expandedVideoRef.current;

    const syncExpandedVideo = () => {
      const currentTime = videoTimeRef.current;
      if (expandedVideo && Number.isFinite(currentTime)) {
        expandedVideo.currentTime = currentTime;
        void expandedVideo.play().catch(() => undefined);
      }
    };

    const handleFullscreenChange = () => {
      if (document.fullscreenElement) return;

      const currentTime = expandedVideoRef.current?.currentTime ?? videoTimeRef.current;
      syncInlineVideoTime(currentTime);
      setIsExpanded(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) {
        closeExpandedVideo();
      }
    };

    if (expandedVideo?.readyState) {
      syncExpandedVideo();
    } else {
      expandedVideo?.addEventListener("loadedmetadata", syncExpandedVideo, { once: true });
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      expandedVideo?.removeEventListener("loadedmetadata", syncExpandedVideo);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeExpandedVideo, isExpanded, syncInlineVideoTime]);

  return (
    <div className="relative h-full w-full bg-media-background">
      <video
        aria-label={label}
        className="admin-community-video-player h-full w-full object-cover"
        controls
        controlsList="nofullscreen noremoteplayback"
        disablePictureInPicture
        muted
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onTimeUpdate={(event) => {
          videoTimeRef.current = event.currentTarget.currentTime;
        }}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={src}
      />
      {!isPlaying ? (
        <button
          aria-label="Reproduzir vídeo publicado"
          className="absolute left-1/2 top-1/2 inline-flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
          onClick={playVideo}
          type="button"
        >
          <Play aria-hidden className="h-5 w-5 fill-current" />
        </button>
      ) : null}
      <button
        aria-label="Ampliar vídeo publicado em 9:16"
        className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-foreground/70 text-background shadow-sm transition hover:bg-foreground"
        onClick={openExpandedVideo}
        title="Ampliar vídeo"
        type="button"
      >
        <Maximize2 aria-hidden className="h-4 w-4" />
      </button>
      {isExpanded ? (
        <div
          aria-label="Vídeo ampliado em 9:16"
          aria-modal="true"
          className="fixed inset-0 z-[9999] grid place-items-center bg-media-background p-4"
          ref={fullscreenContainerRef}
          role="dialog"
        >
          <button
            aria-label="Fechar vídeo ampliado"
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-media-foreground/15 text-primary-foreground shadow-sm transition hover:bg-media-foreground/25"
            onClick={closeExpandedVideo}
            title="Fechar"
            type="button"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
          <video
            aria-label={`${label} ampliado`}
            className="admin-community-video-expanded object-cover"
            controls
            controlsList="nofullscreen noremoteplayback"
            disablePictureInPicture
            muted
            onEnded={() => closeExpandedVideo()}
            onTimeUpdate={(event) => {
              videoTimeRef.current = event.currentTarget.currentTime;
            }}
            playsInline
            preload="metadata"
            ref={expandedVideoRef}
            src={src}
          />
        </div>
      ) : null}
    </div>
  );
};

export const ContentMediaThumbnail = ({ item }: { item: AdminCommunityContentItem }) => {
  if (!item.media) return null;

  const mediaType = item.media.media_type.toLowerCase();
  const isVideo = mediaType === "video";
  const imageSrc = mediaType === "image" ? renderableImageSrc(item.media.media_url) : null;
  const videoSrc = isVideo ? resolveAdminMediaUrl(item.media.media_url) : null;
  const mediaLabel = isVideo ? "Miniplayer de vídeo publicado" : "Miniatura de imagem publicada";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border bg-surface-muted",
        isVideo ? "aspect-[9/16] max-w-40 sm:w-28 sm:max-w-none" : "h-24 sm:h-28 sm:w-28",
      )}
    >
      {imageSrc ? (
        <Image
          alt={mediaLabel}
          className="object-cover"
          fill
          sizes="112px"
          src={imageSrc}
          unoptimized={isAdminPublicMediaUrl(item.media.media_url)}
        />
      ) : null}
      {!imageSrc && videoSrc ? <ContentVideoMiniplayer label={mediaLabel} src={videoSrc} /> : null}
      {!imageSrc && !videoSrc ? (
        <div className="grid h-full place-items-center gap-1 p-3 text-center text-xs font-black text-muted">
          <ImageIcon className="mx-auto h-5 w-5" />
          <span>Mídia publicada</span>
        </div>
      ) : null}
    </div>
  );
};
