"use client";

import Image from "next/image";
import { type RefObject, useLayoutEffect, useState } from "react";

// Keep the poster above the media until the current source has a decoded frame.
export function VideoStartupCover({
  poster,
  src,
  version = 0,
  videoRef,
  contain = false,
}: {
  poster?: string | null;
  src: string;
  version?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  contain?: boolean;
}) {
  const [ready, setReady] = useState<{ src: string; version: number } | null>(null);
  useLayoutEffect(() => {
    void src;
    void version;
    const video = videoRef.current;
    if (!video) return;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      setReady(null);
    };
    const reveal = () => {
      if (video.readyState < 2) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (video.readyState >= 2) setReady({ src, version });
      });
    };
    video.addEventListener("emptied", reset);
    video.addEventListener("loadstart", reset);
    video.addEventListener("loadeddata", reveal);
    video.addEventListener("playing", reveal);
    reveal();
    return () => {
      cancelAnimationFrame(frame);
      video.removeEventListener("emptied", reset);
      video.removeEventListener("loadstart", reset);
      video.removeEventListener("loadeddata", reveal);
      video.removeEventListener("playing", reveal);
    };
  }, [src, version, videoRef]);

  if ((ready?.src === src && ready.version === version) || !poster) return null;
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
