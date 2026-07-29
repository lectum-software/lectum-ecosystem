"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ContentAttentionTargetType,
  type ContentAttentionTrackingRequest,
  sendContentAttentionBeacon,
  trackContentAttention,
} from "@/api/req/analytics";
import { documentHasUserAttention } from "@/components/analytics/attention";
import { getOrCreateAnalyticsIdentity } from "@/components/analytics/storage";

export const CONTENT_ATTENTION_MIN_VISIBLE_RATIO = 0.35;
export const CONTENT_ATTENTION_MIN_VISIBLE_PIXELS = 160;

const HEARTBEAT_INTERVAL_MS = 15_000;
const MAX_TRACKED_SECONDS = 24 * 60 * 60;
const STORAGE_PREFIX = "lectum:content-attention-seconds";

type FlushMode = "keepalive" | "normal";

export type ContentAttentionTrackingTarget = {
  targetId: string;
  targetType: ContentAttentionTargetType;
};

type AttentionState = {
  accumulatedVisibleMs: number;
  activeStartedAt: number | null;
  isVisibleEnough: boolean;
  lastSentAt: number;
  lastSentSeconds: number;
};

const clampSecond = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return 0;

  return Math.min(Math.round(value), MAX_TRACKED_SECONDS);
};

const storageKeyForTarget = (target?: ContentAttentionTrackingTarget | null) => {
  if (!target?.targetId || typeof window === "undefined") return null;

  const identity = getOrCreateAnalyticsIdentity();
  if (!identity) return null;

  return `${STORAGE_PREFIX}:${identity.visitorId}:${identity.sessionId}:${target.targetType}:${target.targetId}`;
};

const readStoredAttentionSeconds = (target?: ContentAttentionTrackingTarget | null) => {
  const key = storageKeyForTarget(target);
  if (!key) return 0;

  try {
    const value = Number(window.sessionStorage.getItem(key));

    return clampSecond(value);
  } catch {
    return 0;
  }
};

const writeStoredAttentionSeconds = (
  target: ContentAttentionTrackingTarget | null,
  attentionSeconds: number,
) => {
  const key = storageKeyForTarget(target);
  if (!key) return;

  try {
    const current = readStoredAttentionSeconds(target);
    window.sessionStorage.setItem(key, String(Math.max(current, attentionSeconds)));
  } catch {
    // Analytics must never break the user experience.
  }
};

const createInitialState = (target?: ContentAttentionTrackingTarget | null): AttentionState => {
  const storedSeconds = readStoredAttentionSeconds(target);

  return {
    accumulatedVisibleMs: storedSeconds * 1000,
    activeStartedAt: null,
    isVisibleEnough: false,
    lastSentAt: 0,
    lastSentSeconds: storedSeconds,
  };
};

const currentPath = () => {
  if (typeof window === "undefined") return null;

  return `${window.location.pathname || "/"}${window.location.search || ""}`;
};

const entryHasEnoughVisibleArea = (entry: IntersectionObserverEntry) => {
  const visibleHeight = entry.intersectionRect.height;

  return (
    entry.isIntersecting &&
    (entry.intersectionRatio >= CONTENT_ATTENTION_MIN_VISIBLE_RATIO ||
      visibleHeight >= CONTENT_ATTENTION_MIN_VISIBLE_PIXELS)
  );
};

export const useContentAttentionTracking = (
  target?: ContentAttentionTrackingTarget | null,
): ((element: HTMLElement | null) => void) => {
  const cleanupElementRef = useRef<(() => void) | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef<AttentionState>(createInitialState(target));
  const targetRef = useRef<ContentAttentionTrackingTarget | null>(target ?? null);
  const targetId = target?.targetId ?? null;
  const targetType = target?.targetType ?? null;

  useEffect(() => {
    targetRef.current = targetId && targetType ? { targetId, targetType } : null;
    stateRef.current = createInitialState(targetRef.current);
  }, [targetId, targetType]);

  const shouldBeActive = useCallback(() => {
    const currentTarget = targetRef.current;

    return Boolean(
      currentTarget?.targetId && stateRef.current.isVisibleEnough && documentHasUserAttention(),
    );
  }, []);

  const syncActiveState = useCallback(() => {
    const state = stateRef.current;
    const now = Date.now();
    const shouldTrack = shouldBeActive();

    if (shouldTrack && state.activeStartedAt === null) {
      state.activeStartedAt = now;
      return;
    }

    if (!shouldTrack && state.activeStartedAt !== null) {
      state.accumulatedVisibleMs += Math.max(0, now - state.activeStartedAt);
      state.activeStartedAt = null;
    }
  }, [shouldBeActive]);

  const flushAttention = useCallback(
    (mode: FlushMode = "normal", force = false) => {
      const currentTarget = targetRef.current;
      if (!currentTarget?.targetId) return;

      syncActiveState();

      const state = stateRef.current;
      const now = Date.now();
      if (!force && now - state.lastSentAt < HEARTBEAT_INTERVAL_MS) return;

      const activeSegmentMs = state.activeStartedAt ? Math.max(0, now - state.activeStartedAt) : 0;
      const attentionSeconds = clampSecond((state.accumulatedVisibleMs + activeSegmentMs) / 1000);
      if (attentionSeconds <= 0 || attentionSeconds <= state.lastSentSeconds) return;

      const identity = getOrCreateAnalyticsIdentity();
      if (!identity) return;

      const payload: ContentAttentionTrackingRequest = {
        attention_seconds: attentionSeconds,
        path: currentPath(),
        session_id: identity.sessionId,
        target_id: currentTarget.targetId,
        target_type: currentTarget.targetType,
        visitor_id: identity.visitorId,
      };

      state.lastSentAt = now;
      state.lastSentSeconds = attentionSeconds;
      writeStoredAttentionSeconds(currentTarget, attentionSeconds);

      if (mode === "keepalive") {
        sendContentAttentionBeacon(payload);
        return;
      }

      void trackContentAttention(payload).catch(() => {
        // Analytics must fail silently.
      });
    },
    [syncActiveState],
  );

  const setElement = useCallback(
    (element: HTMLElement | null) => {
      cleanupElementRef.current?.();
      cleanupElementRef.current = null;
      elementRef.current = element;
      stateRef.current.isVisibleEnough = false;
      syncActiveState();

      if (!element || !targetRef.current?.targetId) return;

      if (typeof IntersectionObserver === "undefined") {
        stateRef.current.isVisibleEnough = true;
        syncActiveState();
        cleanupElementRef.current = () => {
          flushAttention("normal", true);
          stateRef.current.isVisibleEnough = false;
          syncActiveState();
        };
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          stateRef.current.isVisibleEnough = entry ? entryHasEnoughVisibleArea(entry) : false;
          syncActiveState();
          flushAttention("normal");
        },
        {
          threshold: [0, 0.25, CONTENT_ATTENTION_MIN_VISIBLE_RATIO, 0.5, 0.75, 1],
        },
      );

      observer.observe(element);
      cleanupElementRef.current = () => {
        flushAttention("normal", true);
        observer.disconnect();
        stateRef.current.isVisibleEnough = false;
        syncActiveState();
      };
    },
    [flushAttention, syncActiveState],
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      syncActiveState();
      flushAttention(document.visibilityState === "hidden" ? "keepalive" : "normal", true);
    };
    const handleFocus = () => syncActiveState();
    const handleBlur = () => {
      syncActiveState();
      flushAttention("keepalive", true);
    };
    const handlePageHide = () => flushAttention("keepalive", true);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
      flushAttention("keepalive", true);
      cleanupElementRef.current?.();
      cleanupElementRef.current = null;
    };
  }, [flushAttention, syncActiveState]);

  return setElement;
};
