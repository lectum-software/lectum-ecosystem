import type { RefObject } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { documentHasUserAttention } from "@/components/analytics/attention";

export const VIDEO_PAUSED_BY_FOCUS_GUARD_ATTRIBUTE = "data-lectum-paused-by-focus-guard";

const DEFAULT_MIN_VISIBLE_RATIO = 0.35;
const INTERSECTION_THRESHOLDS = [0, 0.2, 0.35, 0.5, 0.7, 1];

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
  }, 0);
};

export const canResumeFocusedVideoPlayback = (visibleEnough: boolean) =>
  documentHasUserAttention() && visibleEnough;

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
    markFocusGuardPause(video);
    video.pause();
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
    void video.play().catch(() => undefined);
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

    const handleInactiveFocus = () => pauseForInactiveFocus();
    const handleActiveFocus = () => syncPlaybackEligibility();
    const handleVisibilityChange = () => {
      if (documentHasUserAttention()) {
        syncPlaybackEligibility();
        return;
      }

      pauseForInactiveFocus();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("freeze", handleInactiveFocus);
    window.addEventListener("blur", handleInactiveFocus);
    window.addEventListener("focus", handleActiveFocus);
    window.addEventListener("pagehide", handleInactiveFocus);
    window.addEventListener("pageshow", handleActiveFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("freeze", handleInactiveFocus);
      window.removeEventListener("blur", handleInactiveFocus);
      window.removeEventListener("focus", handleActiveFocus);
      window.removeEventListener("pagehide", handleInactiveFocus);
      window.removeEventListener("pageshow", handleActiveFocus);
    };
  }, [enabled, pauseForInactiveFocus, syncPlaybackEligibility]);

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

  try {
    await video.play();
    return true;
  } catch {
    return false;
  }
};

export const needsUserPlayWithSound = (video: HTMLVideoElement | null) =>
  !video || video.paused || video.muted || video.volume <= 0;
