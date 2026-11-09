"use client";

import { LoaderCircle } from "lucide-react";
import { type RefObject, useEffect, useEffectEvent, useReducer, useState } from "react";
import { useAttachVideoSource, useVideoPlaybackSource } from "@/hooks/video-stream";
import { isVideoAssetReference } from "@/utils/video-stream";
import { VideoStartupCover } from "./video-startup-cover";

export function VerticalVideoMediaStatus({
  playback,
  adaptivePlaybackFailed,
  videoRef,
  videoElementVersion,
  contain,
  showCover,
}: {
  playback: ReturnType<typeof useVideoPlaybackSource>;
  adaptivePlaybackFailed: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  videoElementVersion: number;
  contain: boolean;
  showCover: boolean;
}) {
  return (
    <>
      {showCover ? (
        <VideoStartupCover
          poster={playback.poster}
          src={playback.source}
          version={videoElementVersion}
          videoRef={videoRef}
          contain={contain}
        />
      ) : null}
      <VerticalVideoStreamStatus
        adaptivePlaybackFailed={adaptivePlaybackFailed}
        error={playback.error}
        isLoading={playback.isLoading}
      />
    </>
  );
}

export const useVerticalVideoStream = ({
  playbackMode = "visible",
  poster,
  src,
  videoElementVersion = 0,
  videoRef,
}: {
  playbackMode?: "visible" | "active" | "standby";
  poster?: string | null;
  src: string;
  videoElementVersion?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
}) => {
  const isStreamReference = isVideoAssetReference(src);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const playback = useVideoPlaybackSource(
    src,
    poster,
    playbackMode !== "visible" || !isStreamReference || activeSource === src,
  );
  const [retryVersion, retry] = useReducer((version: number) => version + 1, 0);
  const adaptivePlaybackFailed = useAttachVideoSource({
    adaptive: playback.isStream,
    source: playback.source,
    videoElementVersion: videoElementVersion + retryVersion,
    standby: playbackMode === "standby",
    videoRef,
  });

  const retryPrepared = useEffectEvent(() => {
    if (playback.error) void playback.refetch();
    if (adaptivePlaybackFailed) retry();
    else if (videoRef.current?.error) videoRef.current.load();
  });
  useEffect(() => {
    if (playbackMode === "active") retryPrepared();
  }, [playbackMode]);

  useEffect(() => {
    // Reobserva o elemento quando o player expandido troca de container via portal.
    void videoElementVersion;

    if (!isStreamReference || playbackMode !== "visible") return;

    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === "undefined") {
      setActiveSource(src);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setActiveSource((current) =>
          entry?.isIntersecting ? src : current === src ? null : current,
        );
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [isStreamReference, src, videoElementVersion, videoRef, playbackMode]);

  return { adaptivePlaybackFailed, playback };
};

export const VerticalVideoStreamStatus = ({
  adaptivePlaybackFailed,
  error,
  isLoading,
}: {
  adaptivePlaybackFailed: boolean;
  error: unknown;
  isLoading: boolean;
}) => {
  if (isLoading) {
    return (
      <div className="pointer-events-none absolute inset-0 z-[4] grid place-items-center bg-media-background/45 text-media-foreground">
        <span className="flex items-center gap-2 rounded-full bg-media-background/70 px-4 py-2 text-sm">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          Preparando vídeo
        </span>
      </div>
    );
  }

  if (!error && !adaptivePlaybackFailed) return null;

  return (
    <div className="absolute inset-0 z-[4] grid place-items-center bg-media-background/75 px-6 text-center text-sm text-media-foreground">
      Não foi possível reproduzir este vídeo agora.
    </div>
  );
};
