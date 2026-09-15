"use client";

import { type RefCallback, useCallback, useEffect, useId, useRef, useState } from "react";

const COMMUNITY_FEED_VIDEO_SOUND_STORAGE_KEY = "lectum:community-feed-video-sound-enabled";
const MIN_AUTOPLAY_INTERSECTION_RATIO = 0.58;
const EXIT_INTERSECTION_RATIO = 0.2;
const INTERSECTION_THRESHOLDS = [0, 0.2, 0.35, 0.5, 0.58, 0.7, 0.85, 1];

type SoundPreferenceListener = (soundEnabled: boolean) => void;

type FeedVideoAutoplayItem = {
  distanceToViewportCenter: number;
  id: string;
  intersectionRatio: number;
  isIntersecting: boolean;
  order: number;
  pausedByUser: boolean;
  suppressNextPause: boolean;
  video: HTMLVideoElement;
};

export type CommunityFeedVideoAutoplayCandidate = {
  distanceToViewportCenter: number;
  id: string;
  intersectionRatio: number;
  isIntersecting: boolean;
  order: number;
  pausedByUser?: boolean;
};

let memorySoundEnabled = false;
let memorySoundPreferenceInitialized = false;
let nextAutoplayOrder = 0;
let activeVideoId: string | null = null;
let autoplayObserver: IntersectionObserver | null = null;
let autoplayEvaluationFrame: number | null = null;
let visibilityListenerAttached = false;

const soundPreferenceListeners = new Set<SoundPreferenceListener>();
const autoplayItems = new Map<string, FeedVideoAutoplayItem>();
const observedVideoIds = new WeakMap<HTMLVideoElement, string>();

const readStoredSoundPreference = () => {
  if (typeof window === "undefined") return memorySoundEnabled;

  try {
    return window.localStorage.getItem(COMMUNITY_FEED_VIDEO_SOUND_STORAGE_KEY) === "true";
  } catch {
    return memorySoundEnabled;
  }
};

const persistStoredSoundPreference = (soundEnabled: boolean) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      COMMUNITY_FEED_VIDEO_SOUND_STORAGE_KEY,
      soundEnabled ? "true" : "false",
    );
  } catch {
    // Preferencia local e degradavel: se o storage estiver bloqueado, a sessao ainda funciona.
  }
};

export const getCommunityFeedVideoSoundEnabled = () => {
  if (!memorySoundPreferenceInitialized) {
    memorySoundEnabled = readStoredSoundPreference();
    memorySoundPreferenceInitialized = true;
  }

  return memorySoundEnabled;
};

const applySoundPreferenceToVideo = (video: HTMLVideoElement) => {
  const soundEnabled = getCommunityFeedVideoSoundEnabled();

  video.muted = !soundEnabled;

  if (soundEnabled && video.volume <= 0) {
    try {
      video.volume = 1;
    } catch {
      // Browsers moveis podem ignorar volume programatico; o controle visual permanece disponivel.
    }
  }
};

const playAutoplayItem = async (item: FeedVideoAutoplayItem) => {
  applySoundPreferenceToVideo(item.video);

  try {
    await item.video.play();
  } catch {
    if (!getCommunityFeedVideoSoundEnabled()) return;

    item.video.muted = true;

    try {
      await item.video.play();
    } catch {
      // Autoplay pode ser bloqueado pelo navegador; mantemos controles manuais sem erro publico.
    }
  }
};

const pauseAutoplayItem = (item: FeedVideoAutoplayItem) => {
  if (item.video.paused) {
    item.suppressNextPause = false;
    return;
  }

  item.suppressNextPause = true;
  item.video.pause();

  if (typeof window !== "undefined") {
    window.setTimeout(() => {
      item.suppressNextPause = false;
    }, 0);
  }
};

const pauseInactiveAutoplayItems = (exceptId: string | null) => {
  for (const item of autoplayItems.values()) {
    if (item.id === exceptId) continue;
    pauseAutoplayItem(item);
  }
};

const activateAutoplayItem = (nextId: string, options: { alreadyPlaying?: boolean } = {}) => {
  const item = autoplayItems.get(nextId);
  if (!item) return;

  activeVideoId = nextId;
  item.pausedByUser = false;
  pauseInactiveAutoplayItems(nextId);
  applySoundPreferenceToVideo(item.video);

  if (!options.alreadyPlaying) {
    void playAutoplayItem(item);
  }
};

export const selectCommunityFeedAutoplayCandidate = (
  candidates: CommunityFeedVideoAutoplayCandidate[],
) =>
  candidates
    .filter(
      (candidate) =>
        candidate.isIntersecting &&
        !candidate.pausedByUser &&
        candidate.intersectionRatio >= MIN_AUTOPLAY_INTERSECTION_RATIO,
    )
    .sort((left, right) => {
      const visibilityDelta = right.intersectionRatio - left.intersectionRatio;
      if (Math.abs(visibilityDelta) > 0.04) return visibilityDelta;

      const centerDelta = left.distanceToViewportCenter - right.distanceToViewportCenter;
      if (centerDelta !== 0) return centerDelta;

      return left.order - right.order;
    })[0]?.id ?? null;

const runAutoplayEvaluation = () => {
  autoplayEvaluationFrame = null;

  const activeItem = activeVideoId ? autoplayItems.get(activeVideoId) : null;

  for (const item of autoplayItems.values()) {
    if (!item.isIntersecting || item.intersectionRatio < EXIT_INTERSECTION_RATIO) {
      item.pausedByUser = false;
    }
  }

  if (
    activeItem &&
    (!activeItem.isIntersecting || activeItem.intersectionRatio < EXIT_INTERSECTION_RATIO)
  ) {
    pauseAutoplayItem(activeItem);
    activeVideoId = null;
  } else if (
    activeItem?.pausedByUser &&
    activeItem.isIntersecting &&
    activeItem.intersectionRatio >= MIN_AUTOPLAY_INTERSECTION_RATIO
  ) {
    return;
  }

  const nextId = selectCommunityFeedAutoplayCandidate(
    Array.from(autoplayItems.values(), (item) => ({
      distanceToViewportCenter: item.distanceToViewportCenter,
      id: item.id,
      intersectionRatio: item.intersectionRatio,
      isIntersecting: item.isIntersecting,
      order: item.order,
      pausedByUser: item.pausedByUser,
    })),
  );

  if (!nextId) return;

  if (nextId === activeVideoId) {
    const item = autoplayItems.get(nextId);
    if (item?.video.paused && !item.pausedByUser) {
      void playAutoplayItem(item);
    }
    return;
  }

  activateAutoplayItem(nextId);
};

const scheduleAutoplayEvaluation = () => {
  if (typeof window === "undefined" || autoplayEvaluationFrame !== null) return;

  autoplayEvaluationFrame = window.requestAnimationFrame(runAutoplayEvaluation);
};

const updateActiveVideoSoundPreference = () => {
  const activeItem = activeVideoId ? autoplayItems.get(activeVideoId) : null;
  if (!activeItem) return;

  applySoundPreferenceToVideo(activeItem.video);
};

export const setCommunityFeedVideoSoundEnabled = (soundEnabled: boolean) => {
  const nextSoundEnabled = Boolean(soundEnabled);
  const changed = !memorySoundPreferenceInitialized || memorySoundEnabled !== nextSoundEnabled;

  memorySoundEnabled = nextSoundEnabled;
  memorySoundPreferenceInitialized = true;
  persistStoredSoundPreference(nextSoundEnabled);
  updateActiveVideoSoundPreference();

  if (!changed) return;

  for (const listener of soundPreferenceListeners) {
    listener(nextSoundEnabled);
  }
};

export const subscribeCommunityFeedVideoSoundPreference = (listener: SoundPreferenceListener) => {
  listener(getCommunityFeedVideoSoundEnabled());
  soundPreferenceListeners.add(listener);

  return () => {
    soundPreferenceListeners.delete(listener);
  };
};

const ensureVisibilityListener = () => {
  if (
    visibilityListenerAttached ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const activeItem = activeVideoId ? autoplayItems.get(activeVideoId) : null;
      if (activeItem) pauseAutoplayItem(activeItem);
      return;
    }

    scheduleAutoplayEvaluation();
  });

  visibilityListenerAttached = true;
};

const getAutoplayObserver = () => {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
    return null;
  }

  if (autoplayObserver) return autoplayObserver;

  autoplayObserver = new IntersectionObserver(
    (entries) => {
      const viewportCenter = window.innerHeight / 2;

      for (const entry of entries) {
        const video = entry.target instanceof HTMLVideoElement ? entry.target : null;
        if (!video) continue;

        const id = observedVideoIds.get(video);
        const item = id ? autoplayItems.get(id) : null;
        if (!item) continue;

        const videoCenter = entry.boundingClientRect.top + entry.boundingClientRect.height / 2;
        item.distanceToViewportCenter = Math.abs(videoCenter - viewportCenter);
        item.intersectionRatio = entry.intersectionRatio;
        item.isIntersecting = entry.isIntersecting;
      }

      scheduleAutoplayEvaluation();
    },
    {
      threshold: INTERSECTION_THRESHOLDS,
    },
  );

  return autoplayObserver;
};

const registerCommunityFeedVideoAutoplay = (id: string, video: HTMLVideoElement) => {
  ensureVisibilityListener();

  const item: FeedVideoAutoplayItem = {
    distanceToViewportCenter: Number.MAX_SAFE_INTEGER,
    id,
    intersectionRatio: 0,
    isIntersecting: false,
    order: nextAutoplayOrder,
    pausedByUser: false,
    suppressNextPause: false,
    video,
  };
  nextAutoplayOrder += 1;

  autoplayItems.set(id, item);
  observedVideoIds.set(video, id);
  applySoundPreferenceToVideo(video);

  const observer = getAutoplayObserver();

  if (observer) {
    observer.observe(video);
  } else {
    item.distanceToViewportCenter = 0;
    item.intersectionRatio = 1;
    item.isIntersecting = true;
    scheduleAutoplayEvaluation();
  }

  const handlePlay = () => {
    item.pausedByUser = false;

    if (activeVideoId !== id) {
      activeVideoId = id;
      pauseInactiveAutoplayItems(id);
    }
  };
  const handlePause = () => {
    if (item.suppressNextPause) {
      item.suppressNextPause = false;
      return;
    }

    if (activeVideoId === id && !video.ended) {
      item.pausedByUser = true;
    }
  };
  const handleEnded = () => {
    if (activeVideoId === id) item.pausedByUser = true;
  };
  const handleCanPlay = () => {
    if (activeVideoId === id && !item.pausedByUser) {
      void playAutoplayItem(item);
    }
  };

  video.addEventListener("canplay", handleCanPlay);
  video.addEventListener("ended", handleEnded);
  video.addEventListener("pause", handlePause);
  video.addEventListener("play", handlePlay);

  return () => {
    video.removeEventListener("canplay", handleCanPlay);
    video.removeEventListener("ended", handleEnded);
    video.removeEventListener("pause", handlePause);
    video.removeEventListener("play", handlePlay);
    observer?.unobserve(video);
    observedVideoIds.delete(video);

    if (activeVideoId === id) {
      pauseAutoplayItem(item);
      activeVideoId = null;
    }

    autoplayItems.delete(id);
    scheduleAutoplayEvaluation();
  };
};

const cleanupAutoplayRegistration = (cleanupRef: { current: (() => void) | null }) => {
  cleanupRef.current?.();
  cleanupRef.current = null;
};

export const useCommunityVideoAutoplay = (
  enabled: boolean,
): {
  handleVideoElementReady: RefCallback<HTMLVideoElement>;
  onSoundEnabledChange: (soundEnabled: boolean) => void;
  soundEnabled: boolean;
} => {
  const id = useId();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => subscribeCommunityFeedVideoSoundPreference(setSoundEnabled), []);

  const registerCurrentVideo = useCallback(() => {
    cleanupAutoplayRegistration(cleanupRef);

    if (!enabled || !videoRef.current) return;

    cleanupRef.current = registerCommunityFeedVideoAutoplay(id, videoRef.current);
  }, [enabled, id]);

  const handleVideoElementReady = useCallback<RefCallback<HTMLVideoElement>>(
    (video) => {
      if (videoRef.current === video) return;

      videoRef.current = video;
      registerCurrentVideo();
    },
    [registerCurrentVideo],
  );

  useEffect(() => {
    registerCurrentVideo();

    return () => {
      cleanupAutoplayRegistration(cleanupRef);
    };
  }, [registerCurrentVideo]);

  return {
    handleVideoElementReady,
    onSoundEnabledChange: setCommunityFeedVideoSoundEnabled,
    soundEnabled,
  };
};

export const useCommunityFeedVideoAutoplay = useCommunityVideoAutoplay;
