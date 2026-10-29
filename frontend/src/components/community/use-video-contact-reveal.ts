"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { documentHasUserAttention } from "@/components/analytics/attention";
import { isVideoBlockedByModal } from "@/lib/modal-media-scope";

type ContactWatchProgress = { watchedMs: number; revealed: boolean };
const REVEAL_AFTER_MS = 3000;

export const observeVideoContact = (
  video: HTMLVideoElement,
  progress: ContactWatchProgress,
  onReveal: () => void,
) => {
  if (progress.revealed) return () => {};
  let visible = false;
  let lastAt = performance.now();
  let lastPosition = video.currentTime;
  let wasEligible = false;
  let disposed = false;
  const eligible = () =>
    visible &&
    !video.paused &&
    !video.ended &&
    !video.seeking &&
    video.readyState >= 2 &&
    documentHasUserAttention() &&
    !isVideoBlockedByModal(video);
  const resetSample = () => {
    lastAt = performance.now();
    lastPosition = video.currentTime;
    wasEligible = eligible();
  };
  // Count observed playback, not time since mounting or jumps along the seek bar.
  const sample = () => {
    if (disposed) return;
    const now = performance.now();
    const position = video.currentTime;
    const active = eligible();
    if (active && wasEligible && position > lastPosition) {
      progress.watchedMs += Math.min(
        Math.max(0, now - lastAt),
        ((position - lastPosition) / Math.max(0.1, Math.abs(video.playbackRate))) * 1000,
        250,
      );
    }
    lastAt = now;
    lastPosition = position;
    wasEligible = active;
    if (progress.watchedMs >= REVEAL_AFTER_MS) {
      progress.revealed = true;
      cleanup();
      onReveal();
    }
  };
  const observer = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
      resetSample();
    },
    { threshold: [0, 0.5] },
  );
  const events = ["playing", "pause", "waiting", "seeking", "seeked", "ended", "emptied"];
  const interval = window.setInterval(sample, 100);
  function cleanup() {
    disposed = true;
    window.clearInterval(interval);
    observer.disconnect();
    for (const event of events) video.removeEventListener(event, resetSample);
    document.removeEventListener("visibilitychange", resetSample);
    window.removeEventListener("blur", resetSample);
    window.removeEventListener("focus", resetSample);
  }
  for (const event of events) video.addEventListener(event, resetSample);
  document.addEventListener("visibilitychange", resetSample);
  window.addEventListener("blur", resetSample);
  window.addEventListener("focus", resetSample);
  observer.observe(video);
  return cleanup;
};

export const useVideoContactReveal = (mediaKey: string | null) => {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const progress = useMemo(() => ({ mediaKey, watchedMs: 0, revealed: false }), [mediaKey]);
  const handleVideoReady = useCallback((element: HTMLVideoElement | null) => setVideo(element), []);
  useEffect(() => {
    if (!video || !mediaKey) return;
    return observeVideoContact(video, progress, () => setRevealedKey(mediaKey));
  }, [video, mediaKey, progress]);
  return { handleVideoReady, expanded: Boolean(mediaKey && revealedKey === mediaKey) };
};
