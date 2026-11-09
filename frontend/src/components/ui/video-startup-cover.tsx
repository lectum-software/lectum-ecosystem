"use client";

import Image from "next/image";
import { type RefObject, useLayoutEffect, useState } from "react";

// A prepared frame in a hidden player is not proof of presentation after promotion.
export function VideoStartupCover({
  poster,
  src,
  version = 0,
  videoRef,
  contain = false,
  active = true,
}: {
  poster?: string | null;
  src: string;
  version?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  contain?: boolean;
  active?: boolean;
}) {
  const [ready, setReady] = useState<{ src: string; version: number } | null>(null);
  useLayoutEffect(() => {
    void src;
    void version;
    const video = videoRef.current;
    if (!video || !active) return;
    let frame = 0;
    let videoFrame: number | null = null;
    let generation = 0;
    const cancel = () => {
      generation += 1;
      cancelAnimationFrame(frame);
      frame = 0;
      if (videoFrame !== null) video.cancelVideoFrameCallback(videoFrame);
      videoFrame = null;
    };
    const reset = () => {
      cancel();
      setReady(null);
    };
    const reveal = () => {
      if (videoFrame !== null || frame) return;
      const current = generation;
      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrame = video.requestVideoFrameCallback(() => {
          if (current !== generation) return;
          videoFrame = null;
          if (video.readyState >= 2) setReady({ src, version });
        });
        return;
      }
      // Older browsers cannot confirm presentation; wait for playback and two paints.
      if (video.paused || video.readyState < 2) return;
      frame = requestAnimationFrame(() => {
        if (current !== generation) return;
        frame = requestAnimationFrame(() => {
          if (current !== generation) return;
          frame = 0;
          if (!video.paused && video.readyState >= 2) setReady({ src, version });
        });
      });
    };
    video.addEventListener("emptied", reset);
    video.addEventListener("loadstart", reset);
    video.addEventListener("loadeddata", reveal);
    video.addEventListener("playing", reveal);
    reveal();
    return () => {
      cancel();
      video.removeEventListener("emptied", reset);
      video.removeEventListener("loadstart", reset);
      video.removeEventListener("loadeddata", reveal);
      video.removeEventListener("playing", reveal);
    };
  }, [src, version, videoRef, active]);

  if ((active && ready?.src === src && ready.version === version) || !poster) return null;
  return (
    <Image
      alt=""
      aria-hidden="true"
      src={poster}
      fill
      unoptimized
      sizes="(min-width: 768px) 430px, 100vw"
      className={`pointer-events-none absolute inset-0 z-0 ${contain ? "object-contain" : "object-cover"}`}
      data-video-startup-cover="true"
    />
  );
}
