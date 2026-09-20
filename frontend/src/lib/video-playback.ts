import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  documentHasUserAttention,
  subscribeDocumentAttention,
} from "@/components/analytics/attention";

export const VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE = "data-lectum-paused-by-focus-guard";

const DEFAULT_MIN_VISIBLE_RATIO = 0.35;
const INTERSECTION_THRESHOLDS = [0, 0.2, 0.35, 0.5, 0.7, 1];
const FOCUS_GUARD_PAUSE_MARK_DURATION_MS = 500;

type ActiveVideoPlaybackGuardOptions = {
  enabled?: boolean;
  minVisibleRatio?: number;
  videoElementVersion?: number;
  videoRef: RefObject<HTMLVideoElement | null>;
};

export const wasVideoPauseRequestedByFocusGuard = (video: HTMLVideoElement) =>
  video.getAttribute(VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE) === "true";

const markFocusGuardPause = (video: HTMLVideoElement) => {
  video.setAttribute(VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE, "true");

  window.setTimeout(() => {
    if (wasVideoPauseRequestedByFocusGuard(video)) {
      video.removeAttribute(VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE);
    }
  }, FOCUS_GUARD_PAUSE_MARK_DURATION_MS);
};

export const canResumeFocusedVideoPlayback = (visibleEnough: boolean) =>
  documentHasUserAttention() && visibleEnough;

export const pauseVideoForFocusGuard = (video: HTMLVideoElement) => {
  if (typeof window === "undefined" || video.paused || video.ended) return false;

  markFocusGuardPause(video);
  video.pause();
  return true;
};

export const pauseAllVideosForInactiveDocument = () => {
  if (typeof document === "undefined") return;

  for (const video of document.querySelectorAll<HTMLVideoElement>("video")) {
    pauseVideoForFocusGuard(video);
  }
};

export const playVideoWithActiveDocument = async (video: HTMLVideoElement | null) => {
  if (!video || !documentHasUserAttention()) return false;

  try {
    await video.play();
    if (!documentHasUserAttention()) {
      pauseVideoForFocusGuard(video);
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const useActiveVideoPlaybackGuard = ({
  enabled = true,
  minVisibleRatio = DEFAULT_MIN_VISIBLE_RATIO,
  videoElementVersion = 0,
  videoRef,
}: ActiveVideoPlaybackGuardOptions) => {
  const shouldResumeAfterFocusRef = useRef(false);
  const [visibleEnough, setVisibleEnough] = useState(true);

  const pauseForInactiveFocus = useCallback(() => {
    if (typeof window === "undefined") return;

    const video = videoRef.current;
    if (!video || video.paused || video.ended) return;

    shouldResumeAfterFocusRef.current = true;
    pauseVideoForFocusGuard(video);
  }, [videoRef]);

  const syncPlaybackEligibility = useCallback(() => {
    if (!enabled) return;

    const video = videoRef.current;
    if (!video) return;

    if (!canResumeFocusedVideoPlayback(visibleEnough)) {
      pauseForInactiveFocus();
      return;
    }

    if (!shouldResumeAfterFocusRef.current) return;

    shouldResumeAfterFocusRef.current = false;
    void playVideoWithActiveDocument(video);
  }, [enabled, pauseForInactiveFocus, videoRef, visibleEnough]);

  useEffect(() => {
    void videoElementVersion;

    if (!enabled) {
      shouldResumeAfterFocusRef.current = false;
      return;
    }

    syncPlaybackEligibility();
  }, [enabled, syncPlaybackEligibility, videoElementVersion]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined" || typeof document === "undefined") return;

    const unsubscribe = subscribeDocumentAttention(syncPlaybackEligibility);

    const handleInactiveFocus = () => {
      pauseForInactiveFocus();
    };
    const handleActiveFocus = () => syncPlaybackEligibility();
    const handleVisibilityChange = () => {
      if (documentHasUserAttention()) {
        syncPlaybackEligibility();
        return;
      }

      handleInactiveFocus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("freeze", handleInactiveFocus);
    document.addEventListener("resume", handleActiveFocus);
    window.addEventListener("blur", handleInactiveFocus);
    window.addEventListener("focus", handleActiveFocus);
    window.addEventListener("pagehide", handleInactiveFocus);
    window.addEventListener("pageshow", handleActiveFocus);
    window.addEventListener("beforeunload", handleInactiveFocus);

    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("freeze", handleInactiveFocus);
      document.removeEventListener("resume", handleActiveFocus);
      window.removeEventListener("blur", handleInactiveFocus);
      window.removeEventListener("focus", handleActiveFocus);
      window.removeEventListener("pagehide", handleInactiveFocus);
      window.removeEventListener("pageshow", handleActiveFocus);
      window.removeEventListener("beforeunload", handleInactiveFocus);
    };
  }, [enabled, pauseForInactiveFocus, syncPlaybackEligibility]);

  useEffect(() => {
    void videoElementVersion;
    const video = videoRef.current;
    if (!enabled || !video) return;
    const enforce = () => {
      if (!canResumeFocusedVideoPlayback(visibleEnough)) pauseForInactiveFocus();
    };
    video.addEventListener("play", enforce);
    video.addEventListener("playing", enforce);
    video.addEventListener("timeupdate", enforce);
    return () => {
      video.removeEventListener("play", enforce);
      video.removeEventListener("playing", enforce);
      video.removeEventListener("timeupdate", enforce);
    };
  }, [enabled, pauseForInactiveFocus, videoElementVersion, videoRef, visibleEnough]);

  useEffect(() => {
    void videoElementVersion;

    if (!enabled || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(0);
        const nextVisibleEnough =
          Boolean(entry?.isIntersecting) && (entry?.intersectionRatio ?? 0) >= minVisibleRatio;

        setVisibleEnough(nextVisibleEnough);
      },
      { threshold: INTERSECTION_THRESHOLDS },
    );

    observer.observe(video);

    return () => observer.disconnect();
  }, [enabled, minVisibleRatio, videoElementVersion, videoRef]);

  useEffect(() => {
    syncPlaybackEligibility();
  }, [syncPlaybackEligibility]);
};

export const ensureVideoCanPlayWithSound = (video: HTMLVideoElement | null) => {
  if (!video) return;

  video.muted = false;

  if (video.volume <= 0) {
    video.volume = 1;
  }
};

export const playVideoWithSound = async (video: HTMLVideoElement | null) => {
  if (!video) return false;

  ensureVideoCanPlayWithSound(video);

  return playVideoWithActiveDocument(video);
};

export const needsUserPlayWithSound = (video: HTMLVideoElement | null) =>
  !video || video.paused || video.muted || video.volume <= 0;
