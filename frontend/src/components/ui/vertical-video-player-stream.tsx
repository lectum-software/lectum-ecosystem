"use client";

import { LoaderCircle } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { getApiErrorStatus } from "@/api/errors";
import { useAttachVideoSource, useVideoPlaybackSource } from "@/hooks/video-stream";
import { isVideoAssetReference } from "@/utils/video-stream";

export const useVerticalVideoStream = ({
  poster,
  src,
  videoRef,
}: {
  poster?: string | null;
  src: string;
  videoRef: RefObject<HTMLVideoElement | null>;
}) => {
  const isStreamReference = isVideoAssetReference(src);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const playback = useVideoPlaybackSource(src, poster, !isStreamReference || activeSource === src);
  const adaptivePlaybackFailed = useAttachVideoSource({
    adaptive: playback.isStream,
    source: playback.source,
    videoRef,
  });

  useEffect(() => {
    if (!isStreamReference) return;

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
  }, [isStreamReference, src, videoRef]);

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
      {getApiErrorStatus(error) === 401
        ? "Entre na sua conta para assistir a este vídeo."
        : "Não foi possível reproduzir este vídeo agora."}
    </div>
  );
};
