"use client";

import { type RefCallback, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  documentHasUserAttention,
  subscribeDocumentAttention,
} from "@/components/analytics/attention";
import {
  isModalMediaSuspended,
  subscribeModalMediaSuspension,
} from "@/hooks/use-modal-media-suspension";
import {
  pauseAllVideosForInactiveDocument,
  playVideoWithActiveDocument,
  wasVideoPauseRequestedByFocusGuard,
} from "@/lib/video-playback";

import {
  getVideoSoundEnabled,
  getVideoSoundPreferenceRevision,
  setVideoSoundEnabledByUser,
  subscribeVideoSoundPreference,
  suspendVideoSoundForDocument,
} from "@/lib/video-sound-preference";

const MIN_AUTOPLAY_INTERSECTION_RATIO = 0.58;
const EXIT_INTERSECTION_RATIO = 0.2;
const INTERSECTION_THRESHOLDS = [0, 0.2, 0.35, 0.5, 0.58, 0.7, 0.85, 1];

type SoundPreferenceListener = (soundEnabled: boolean) => void;

type FeedVideoAutoplayItem = {
  blockedSoundRevision: number | null;
  distanceToViewportCenter: number;
  id: string;
  intersectionRatio: number;
  isIntersecting: boolean;
  order: number;
  pausedByUser: boolean;
  playAttempt: number;
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

let nextAutoplayOrder = 0;
let activeVideoId: string | null = null;
let autoplayObserver: IntersectionObserver | null = null;
let autoplayEvaluationFrame: number | null = null;
let modalMediaSuspensionListenerAttached = false;
let visibilityListenerAttached = false;

const soundPreferenceListeners = new Set<SoundPreferenceListener>();
const autoplayItems = new Map<string, FeedVideoAutoplayItem>();
const observedVideoIds = new WeakMap<HTMLVideoElement, string>();

export const getCommunityFeedVideoSoundEnabled = getVideoSoundEnabled;

const applySoundPreferenceToVideo = (item: FeedVideoAutoplayItem) => {
  const soundEnabled = getVideoSoundEnabled();
  const { video } = item;

  video.muted = !soundEnabled;

  if (soundEnabled && video.volume <= 0) {
    try {
      video.volume = 1;
    } catch {
      // Browsers moveis podem ignorar volume programatico; o controle visual permanece disponivel.
    }
  }
};

const isCommunityAutoplayContextActive = () =>
  !isModalMediaSuspended() && documentHasUserAttention();

const playAutoplayItem = async (item: FeedVideoAutoplayItem) => {
  if (!isCommunityAutoplayContextActive()) return;

  applySoundPreferenceToVideo(item);
  const soundEnabled = getVideoSoundEnabled();
  const revision = getVideoSoundPreferenceRevision();
  if (soundEnabled && item.blockedSoundRevision === revision) return;
  const attempt = ++item.playAttempt;
  const isCurrentAttempt = () =>
    autoplayItems.get(item.id) === item &&
    activeVideoId === item.id &&
    item.playAttempt === attempt &&
    !item.pausedByUser &&
    isCommunityAutoplayContextActive();
  let autoplayBlocked = false;

  if (
    await playVideoWithActiveDocument(item.video, {
      onAutoplayBlocked: () => {
        if (!soundEnabled || !isCurrentAttempt()) return;
        if (revision !== getVideoSoundPreferenceRevision()) return;
        autoplayBlocked = suspendVideoSoundForDocument(revision);
        if (!autoplayBlocked) {
          // A per-element browser denial must not mute the user's other videos.
          item.blockedSoundRevision = revision;
        }
      },
    })
  ) {
    return;
  }

  if (autoplayBlocked && !getVideoSoundEnabled() && isCurrentAttempt()) {
    item.video.muted = true;
    await playVideoWithActiveDocument(item.video);
  }
};

const pauseAutoplayItem = (item: FeedVideoAutoplayItem) => {
  item.playAttempt += 1;
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

const pauseAllAutoplayItems = () => {
  for (const item of autoplayItems.values()) {
    pauseAutoplayItem(item);
  }
};

const activateAutoplayItem = (nextId: string, options: { alreadyPlaying?: boolean } = {}) => {
  const item = autoplayItems.get(nextId);
  if (!item) return;

  if (!isCommunityAutoplayContextActive()) {
    pauseAllAutoplayItems();
    activeVideoId = null;
    return;
  }

  activeVideoId = nextId;
  item.pausedByUser = false;
  pauseInactiveAutoplayItems(nextId);
  applySoundPreferenceToVideo(item);

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

  if (!isCommunityAutoplayContextActive()) {
    pauseAllAutoplayItems();
    activeVideoId = null;
    return;
  }

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

const updateVideoSoundPreference = () => {
  for (const item of autoplayItems.values()) applySoundPreferenceToVideo(item);
};

const notifySoundPreferenceListeners = (soundEnabled: boolean) => {
  for (const listener of soundPreferenceListeners) {
    listener(soundEnabled);
  }
};

export const setCommunityFeedVideoSoundEnabled = (soundEnabled: boolean) => {
  if (!documentHasUserAttention()) return;
  setVideoSoundEnabledByUser(soundEnabled);
  updateVideoSoundPreference();
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

  const pauseActiveWithoutAttention = () => {
    if (documentHasUserAttention()) {
      scheduleAutoplayEvaluation();
      return;
    }

    pauseAllAutoplayItems();
    pauseAllVideosForInactiveDocument();
    activeVideoId = null;
  };

  subscribeVideoSoundPreference((enabled) => {
    updateVideoSoundPreference();
    notifySoundPreferenceListeners(enabled);
  });
  subscribeDocumentAttention(pauseActiveWithoutAttention);
  document.addEventListener("visibilitychange", pauseActiveWithoutAttention);
  document.addEventListener("freeze", pauseActiveWithoutAttention);
  window.addEventListener("blur", pauseActiveWithoutAttention);
  window.addEventListener("pagehide", pauseActiveWithoutAttention);
  window.addEventListener("focus", () => scheduleAutoplayEvaluation());

  visibilityListenerAttached = true;
};

const ensureModalMediaSuspensionListener = () => {
  if (
    modalMediaSuspensionListenerAttached ||
    typeof document === "undefined" ||
    typeof window === "undefined"
  ) {
    return;
  }

  subscribeModalMediaSuspension((suspended) => {
    if (suspended) {
      pauseAllAutoplayItems();
      activeVideoId = null;
      return;
    }

    scheduleAutoplayEvaluation();
  });

  modalMediaSuspensionListenerAttached = true;
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

export const registerCommunityFeedVideoAutoplay = (id: string, video: HTMLVideoElement) => {
  ensureVisibilityListener();
  ensureModalMediaSuspensionListener();

  const item: FeedVideoAutoplayItem = {
    blockedSoundRevision: null,
    distanceToViewportCenter: Number.MAX_SAFE_INTEGER,
    id,
    intersectionRatio: 0,
    isIntersecting: false,
    order: nextAutoplayOrder,
    pausedByUser: false,
    playAttempt: 0,
    suppressNextPause: false,
    video,
  };
  nextAutoplayOrder += 1;

  autoplayItems.set(id, item);
  observedVideoIds.set(video, id);
  applySoundPreferenceToVideo(item);

  const observer = getAutoplayObserver();

  if (observer) {
    observer.observe(video);
  } else {
    item.distanceToViewportCenter = 0;
    item.intersectionRatio = 1;
    item.isIntersecting = true;
    scheduleAutoplayEvaluation();
  }

  const enforceSoundPreference = () => applySoundPreferenceToVideo(item);
  const handlePlay = () => {
    enforceSoundPreference();
    if (!isCommunityAutoplayContextActive()) {
      item.pausedByUser = false;
      if (activeVideoId === id) activeVideoId = null;
      pauseAutoplayItem(item);
      return;
    }

    item.pausedByUser = false;
    item.blockedSoundRevision = null;

    if (activeVideoId !== id) {
      activeVideoId = id;
      pauseInactiveAutoplayItems(id);
    }
  };
  const handlePause = () => {
    item.playAttempt += 1;
    if (wasVideoPauseRequestedByFocusGuard(video)) {
      item.suppressNextPause = false;
      return;
    }

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
    if (
      video.paused &&
      activeVideoId === id &&
      !item.pausedByUser &&
      isCommunityAutoplayContextActive()
    ) {
      void playAutoplayItem(item);
    }
  };

  video.addEventListener("canplay", handleCanPlay);
  video.addEventListener("ended", handleEnded);
  video.addEventListener("pause", handlePause);
  video.addEventListener("play", handlePlay);
  video.addEventListener("playing", enforceSoundPreference);
  video.addEventListener("volumechange", enforceSoundPreference);
  video.addEventListener("loadedmetadata", enforceSoundPreference);

  return () => {
    video.removeEventListener("canplay", handleCanPlay);
    video.removeEventListener("ended", handleEnded);
    video.removeEventListener("pause", handlePause);
    video.removeEventListener("play", handlePlay);
    video.removeEventListener("playing", enforceSoundPreference);
    video.removeEventListener("volumechange", enforceSoundPreference);
    video.removeEventListener("loadedmetadata", enforceSoundPreference);
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
