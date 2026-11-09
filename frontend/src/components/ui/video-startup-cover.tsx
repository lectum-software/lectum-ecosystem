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
    if (!video || !active || !poster) return;
    let frame = 0;
    let videoFrame: number | null = null;
    let generation = 0;
    let progressFrame = 0;
    let progressStart = video.currentTime;
    let revealed = false;
    const cancel = () => {
      generation += 1;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(progressFrame);
      progressFrame = 0;
      frame = 0;
      if (videoFrame !== null) video.cancelVideoFrameCallback(videoFrame);
      videoFrame = null;
    };
    const reset = () => {
      cancel();
      revealed = false;
      progressStart = video.currentTime;
      setReady(null);
    };
    const canPresent = () =>
      document.visibilityState !== "hidden" &&
      !video.paused &&
      !video.seeking &&
      video.readyState >= 2;
    const finish = () => {
      cancel();
      revealed = true;
      setReady({ src, version });
    };
    const afterPaint = () => {
      if (frame || revealed) return;
      const current = generation;
      frame = requestAnimationFrame(() => {
        if (current !== generation) return;
        frame = requestAnimationFrame(() => {
          if (current !== generation) return;
          frame = 0;
          if (canPresent()) finish();
        });
      });
    };
    // Safari can omit a frame callback after moving a prepared video. Require
    // sustained playback progress, never just a timeout or a seek, before fallback.
    const watchProgress = () => {
      if (revealed || progressFrame || video.paused) return;
      const current = generation;
      progressFrame = requestAnimationFrame(() => {
        if (current !== generation) return;
        progressFrame = 0;
        if (!canPresent() || video.currentTime < progressStart) {
          progressStart = video.currentTime;
        } else if (video.currentTime - progressStart >= 0.12) {
          afterPaint();
        }
        watchProgress();
      });
    };
    const restartProgress = () => {
      if (revealed) return;
      cancel();
      progressStart = video.currentTime;
      reveal();
    };
    const reveal = () => {
      if (revealed) return;
      watchProgress();
      if (videoFrame !== null) return;
      const current = generation;
      if (typeof video.requestVideoFrameCallback === "function") {
        videoFrame = video.requestVideoFrameCallback((_now, metadata) => {
          if (current !== generation) return;
          videoFrame = null;
          // A queued standby frame can arrive after promotion. It must not
          // uncover a paused/just-seeked player before playback advances.
          if (canPresent() && metadata.mediaTime > progressStart) afterPaint();
          else reveal();
        });
        return;
      }
    };
    video.addEventListener("emptied", reset);
    video.addEventListener("loadstart", reset);
    video.addEventListener("loadeddata", reveal);
    video.addEventListener("playing", reveal);
    video.addEventListener("seeking", restartProgress);
    video.addEventListener("seeked", restartProgress);
    video.addEventListener("pause", restartProgress);
    reveal();
    return () => {
      cancel();
      video.removeEventListener("emptied", reset);
      video.removeEventListener("loadstart", reset);
      video.removeEventListener("loadeddata", reveal);
      video.removeEventListener("playing", reveal);
      video.removeEventListener("seeking", restartProgress);
      video.removeEventListener("seeked", restartProgress);
      video.removeEventListener("pause", restartProgress);
    };
  }, [src, version, videoRef, active, poster]);

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
