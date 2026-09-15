"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ContentVideoWatchTargetType,
  type ContentVideoWatchTrackingRequest,
  sendContentVideoWatchBeacon,
  trackContentVideoWatch,
} from "@/api/req/analytics";
import { documentHasUserAttention } from "@/components/analytics/attention";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";

const CONTENT_VIDEO_RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);
const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_TRACKED_SECONDS = 24 * 60 * 60;

export type ContentVideoWatchTrackingTarget = {
  targetId: string;
  targetType: ContentVideoWatchTargetType;
  videoUrl?: string | null;
};

type FlushMode = "normal" | "keepalive";

const clampSecond = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;

  return Math.min(Math.round(value), MAX_TRACKED_SECONDS);
};

const sanitizeVideoUrlForAnalytics = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const parsed =
      trimmed.startsWith("http://") || trimmed.startsWith("https://")
        ? new URL(trimmed)
        : new URL(trimmed, "https://lectum.local");

    return parsed.origin === "https://lectum.local"
      ? parsed.pathname
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return trimmed.split(/[?#]/)[0] || null;
  }
};

const readableDuration = (video: HTMLVideoElement | null) =>
  video && Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

export const useContentVideoWatchTracking = (
  target?: ContentVideoWatchTrackingTarget | null,
): ((video: HTMLVideoElement | null) => void) => {
  const cleanupTrackingRef = useRef<(() => void) | null>(null);
  const completedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const lastPlaybackPositionRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const maxPositionRef = useRef(0);
  const replayCountRef = useRef(0);
  const retentionBucketsRef = useRef<Set<number>>(new Set());
  const watchedSecondsRef = useRef<Set<number>>(new Set());
  const targetId = target?.targetId ?? null;
  const targetType = target?.targetType ?? null;
  const targetVideoUrl = target?.videoUrl ?? null;
  const targetKeyRef = useRef<string | null>(null);
  const targetKey =
    targetId && targetType ? `${targetType}:${targetId}:${targetVideoUrl ?? ""}` : "disabled";

  useEffect(() => {
    targetKeyRef.current = targetKey;
    completedRef.current = false;
    hasStartedRef.current = false;
    lastPlaybackPositionRef.current = 0;
    lastSentAtRef.current = 0;
    maxPositionRef.current = 0;
    replayCountRef.current = 0;
    retentionBucketsRef.current = new Set();
    watchedSecondsRef.current = new Set();
  }, [targetKey]);

  const buildPayload = useCallback(
    (
      video: HTMLVideoElement | null,
      completed: boolean,
    ): ContentVideoWatchTrackingRequest | null => {
      if (!targetId || !targetType) return null;

      const identity = getOrCreateAnalyticsIdentity();
      if (!identity) return null;

      const durationSeconds = clampSecond(readableDuration(video));
      const maxPositionSeconds = clampSecond(maxPositionRef.current);
      const watchedSeconds = clampSecond(watchedSecondsRef.current.size);

      if (watchedSeconds === 0 && maxPositionSeconds === 0 && !completed) return null;

      if (completed) {
        completedRef.current = true;
        retentionBucketsRef.current.add(100);
      }

      return {
        completed: completedRef.current,
        duration_seconds: durationSeconds || null,
        max_position_seconds: maxPositionSeconds || null,
        replay_count: replayCountRef.current,
        retention_buckets: [...retentionBucketsRef.current].sort((left, right) => left - right),
        session_id: identity.sessionId,
        target_id: targetId,
        target_type: targetType,
        video_url: sanitizeVideoUrlForAnalytics(targetVideoUrl),
        visitor_id: identity.visitorId,
        watched_seconds: watchedSeconds || null,
      };
    },
    [targetId, targetType, targetVideoUrl],
  );

  const flushVideoAnalytics = useCallback(
    (
      video: HTMLVideoElement | null,
      completed = false,
      force = false,
      mode: FlushMode = "normal",
    ) => {
      if (!targetId || !targetType) return;

      const now = Date.now();
      if (!force && now - lastSentAtRef.current < HEARTBEAT_INTERVAL_MS) return;

      const payload = buildPayload(video, completed);
      if (!payload) return;

      lastSentAtRef.current = now;

      if (mode === "keepalive") {
        sendContentVideoWatchBeacon(payload);
        return;
      }

      void trackContentVideoWatch(payload).catch(() => {
        // Analytics must fail silently.
      });
    },
    [buildPayload, targetId, targetType],
  );

  const setVideoElement = useCallback(
    (video: HTMLVideoElement | null) => {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = null;

      if (!video || !targetId || !targetType) return;

      const updateRetentionBuckets = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

        const reachedPercent = Math.min(
          100,
          Math.max(0, (maxPositionRef.current / video.duration) * 100),
        );
        const previousCount = retentionBucketsRef.current.size;

        for (const bucket of CONTENT_VIDEO_RETENTION_BUCKETS) {
          if (reachedPercent >= bucket || (bucket === 100 && completedRef.current)) {
            retentionBucketsRef.current.add(bucket);
          }
        }

        return previousCount !== retentionBucketsRef.current.size;
      };

      const addWatchedRange = (
        from: number,
        to: number,
        options: { allowPaused?: boolean } = {},
      ) => {
        if (!documentHasUserAttention()) return;
        if (video.paused && !options.allowPaused) return;

        const start = Math.max(0, Math.floor(Math.min(from, to)));
        const end = Math.min(MAX_TRACKED_SECONDS, Math.max(0, Math.ceil(Math.max(from, to))));

        for (let second = start; second < end; second += 1) {
          watchedSecondsRef.current.add(second);
        }
      };

      const handlePlay = () => {
        if (!documentHasUserAttention()) return;

        if (hasStartedRef.current && completedRef.current && video.currentTime < 1.5) {
          replayCountRef.current += 1;
          completedRef.current = false;
        }

        hasStartedRef.current = true;
        lastPlaybackPositionRef.current = video.currentTime;
      };

      const handleTimeUpdate = () => {
        if (!documentHasUserAttention()) {
          lastPlaybackPositionRef.current = video.currentTime || lastPlaybackPositionRef.current;
          return;
        }

        const currentTime = video.currentTime || 0;
        const previousTime = lastPlaybackPositionRef.current || 0;

        if (currentTime + 1 < previousTime && previousTime > 2 && currentTime < 1.5) {
          replayCountRef.current += 1;
          completedRef.current = false;
        }

        if (!video.paused && currentTime >= previousTime) {
          addWatchedRange(previousTime, currentTime);
        } else if (!video.paused) {
          watchedSecondsRef.current.add(Math.max(0, Math.floor(currentTime)));
        }

        maxPositionRef.current = Math.max(maxPositionRef.current, currentTime);
        lastPlaybackPositionRef.current = currentTime;

        const bucketChanged = updateRetentionBuckets();
        flushVideoAnalytics(video, false, bucketChanged);
      };

      const handleSeeked = () => {
        const currentTime = video.currentTime || 0;
        const previousTime = lastPlaybackPositionRef.current || 0;

        if (currentTime + 1 < previousTime && previousTime > 2 && currentTime < 1.5) {
          replayCountRef.current += 1;
          completedRef.current = false;
        }

        lastPlaybackPositionRef.current = currentTime;
      };

      const handleEnded = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          addWatchedRange(lastPlaybackPositionRef.current, video.duration, { allowPaused: true });
          maxPositionRef.current = Math.max(maxPositionRef.current, video.duration);
        }

        completedRef.current = true;
        updateRetentionBuckets();
        flushVideoAnalytics(video, true, true);
      };

      const handlePause = () => flushVideoAnalytics(video, false, true);
      const syncAttentionBoundary = () => {
        lastPlaybackPositionRef.current = video.currentTime || lastPlaybackPositionRef.current;
      };
      const handleVisibilityChange = () => {
        if (!documentHasUserAttention()) {
          syncAttentionBoundary();
          flushVideoAnalytics(video, false, true, "keepalive");
          return;
        }

        if (!video.paused) {
          hasStartedRef.current = true;
          syncAttentionBoundary();
        }
      };
      const handleFocus = () => {
        if (!video.paused) syncAttentionBoundary();
      };
      const handleBlur = () => {
        syncAttentionBoundary();
        flushVideoAnalytics(video, false, true, "keepalive");
      };
      const handlePageHide = () => {
        syncAttentionBoundary();
        flushVideoAnalytics(video, false, true, "keepalive");
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("seeked", handleSeeked);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("pause", handlePause);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("pagehide", handlePageHide);

      cleanupTrackingRef.current = () => {
        flushVideoAnalytics(video, false, true);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("seeked", handleSeeked);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("pause", handlePause);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("pagehide", handlePageHide);
      };
    },
    [flushVideoAnalytics, targetId, targetType],
  );

  useEffect(() => {
    return () => {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = null;
    };
  }, []);

  return setVideoElement;
};
