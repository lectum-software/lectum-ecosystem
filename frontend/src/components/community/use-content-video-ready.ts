"use client";

import { type RefObject, useCallback } from "react";

export function useContentVideoReady({
  videoRef,
  trackVideo,
  initialTime,
  play,
  setDuration,
  setTime,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  trackVideo: (video: HTMLVideoElement | null) => void;
  initialTime: number;
  play: () => Promise<void>;
  setDuration: (duration: number) => void;
  setTime: (time: number) => void;
}) {
  return useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;
      trackVideo(video);
      if (!video) return;
      // Standby metadata may have arrived before this slide owned the element.
      if (video.readyState >= 1) {
        if (initialTime > 0 && initialTime < video.duration) video.currentTime = initialTime;
        setDuration(Number.isFinite(video.duration) ? video.duration : 0);
        setTime(video.currentTime);
      }
      requestAnimationFrame(() => {
        if (videoRef.current === video) void play();
      });
    },
    [initialTime, play, setDuration, setTime, trackVideo, videoRef],
  );
}
