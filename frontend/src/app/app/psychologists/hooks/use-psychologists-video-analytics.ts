"use client";

import { useCallback, useEffect } from "react";
import type { DirectoryPsychologistVideoWatchPayload } from "@/api/generator/types/directory";
import { documentHasUserAttention } from "@/components/analytics/attention";
import { resetVideoElementToStart } from "../modules/directory-url";
import {
  clampNumber,
  DEFAULT_VIDEO_PLAYBACK_RATE,
  PRESENTATION_VIDEO_RETENTION_BUCKETS,
  PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR,
  VIDEO_ANALYTICS_HEARTBEAT_MS,
} from "../modules/onboarding";
import { getReadableVideoDuration } from "../modules/search-suggestions";
import {
  createEmptyFeedVideoAnalyticsState,
  createVideoSessionKey,
} from "../modules/video-analytics";
import { usePsychologistsSetupContext } from "./setup-context";
import type { PsychologistsDirectory } from "./use-psychologists-directory";
import type { PsychologistsOnboarding } from "./use-psychologists-onboarding";

const MAX_TRACKED_SECONDS = 24 * 60 * 60;

export const usePsychologistsVideoAnalytics = ({
  directory,
  onboarding,
}: {
  directory: PsychologistsDirectory;
  onboarding: PsychologistsOnboarding;
}) => {
  const setup = usePsychologistsSetupContext();
  const {
    accountTipsUserId,
    actionAnchorRef,
    actionColumnRef,
    activePsychologistIndex,
    backgroundVideoRef,
    bioTextRef,
    feedVideoAnalyticsRef,
    isVideoMuted,
    isVideoPaused,
    isVideoProgressSeeking,
    isVideoProgressSeekingRef,
    lastActiveVideoResetKeyRef,
    lastVideoProgressStateSyncRef,
    progressAnimationFrameRef,
    progressFillRef,
    setActionColumnTranslateY,
    setIsVideoPaused,
    setIsVideoPlaybackFailed,
    setIsVideoProgressSeeking,
    setShareFeedback,
    setVideoPlaybackRate,
    setVideoProgress,
    videoPlaybackRate,
    videoProgressStateRef,
    videoSeekPreviewRatioRef,
    videoVolume,
    wasVideoPlayingBeforeProgressScrubRef,
  } = setup;

  const {
    activeVideoResetKey,
    activeVideoSource,
    featuredBenefitChipsCount,
    featuredBio,
    featuredPsychologistId,
    trackFeaturedVideoWatch,
  } = directory;

  const { resetVideoInteractionState } = onboarding;

  const syncActionColumnAlignment = useCallback(() => {
    const hasBaselineContent = Boolean(featuredBio || featuredBenefitChipsCount > 0);
    const bioText = bioTextRef.current;
    const actionAnchor = actionAnchorRef.current;
    const actionColumn = actionColumnRef.current;

    if (!hasBaselineContent || !bioText || !actionAnchor || !actionColumn) return;

    const delta =
      bioText.getBoundingClientRect().bottom - actionAnchor.getBoundingClientRect().bottom;

    setActionColumnTranslateY((current) => (Math.abs(current - delta) > 0.5 ? delta : current));
  }, [
    actionAnchorRef,
    actionColumnRef,
    bioTextRef,
    featuredBenefitChipsCount,
    featuredBio,
    setActionColumnTranslateY,
  ]);

  const recalculateInfoOverlayLayout = useCallback(() => {
    syncActionColumnAlignment();
  }, [syncActionColumnAlignment]);

  const applyVideoProgressRatio = useCallback(
    (ratio: number) => {
      const progressFill = progressFillRef.current;
      if (!progressFill) return;

      progressFill.style.transform = `scaleX(${clampNumber(ratio, 0, 1)})`;
    },
    [progressFillRef],
  );

  const syncActiveVideoProgress = useCallback(
    (video?: HTMLVideoElement | null, options?: { forceState?: boolean }) => {
      const currentVideo = video ?? backgroundVideoRef.current;

      if (!currentVideo) {
        applyVideoProgressRatio(0);
        const current = videoProgressStateRef.current;

        if (current.currentTime !== 0 || current.duration !== 0) {
          const nextProgress = {
            currentTime: 0,
            duration: 0,
          };

          videoProgressStateRef.current = nextProgress;
          setVideoProgress(nextProgress);
        }

        return;
      }

      const duration = getReadableVideoDuration(currentVideo);
      const currentTime = duration ? clampNumber(currentVideo.currentTime || 0, 0, duration) : 0;

      if (!isVideoProgressSeekingRef.current) {
        applyVideoProgressRatio(duration ? currentTime / duration : 0);
      }

      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      const current = videoProgressStateRef.current;

      const shouldUpdate =
        options?.forceState === true ||
        Math.abs(current.duration - duration) > 0.04 ||
        (currentTime === 0 && current.currentTime !== 0) ||
        now - lastVideoProgressStateSyncRef.current > 250;

      if (!shouldUpdate) return;

      lastVideoProgressStateSyncRef.current = now;

      const nextProgress = {
        currentTime,
        duration,
      };

      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
    },
    [
      applyVideoProgressRatio,
      backgroundVideoRef,
      isVideoProgressSeekingRef,
      lastVideoProgressStateSyncRef,
      setVideoProgress,
      videoProgressStateRef,
    ],
  );

  const ensureFeedVideoAnalyticsState = useCallback(
    (profileId: string, videoUrl: string) => {
      const current = feedVideoAnalyticsRef.current;

      if (current.profileId === profileId && current.videoUrl === videoUrl) {
        if (!current.sessionKey) {
          current.sessionKey = createVideoSessionKey(profileId, videoUrl);
        }

        return current;
      }

      const next = createEmptyFeedVideoAnalyticsState();
      next.profileId = profileId;
      next.videoUrl = videoUrl;
      next.sessionKey = createVideoSessionKey(profileId, videoUrl);
      feedVideoAnalyticsRef.current = next;

      return next;
    },
    [feedVideoAnalyticsRef],
  );

  const recordFeedVideoAnalyticsProgress = useCallback(
    (video: HTMLVideoElement) => {
      if (!featuredPsychologistId || !activeVideoSource) return null;

      const state = ensureFeedVideoAnalyticsState(featuredPsychologistId, activeVideoSource);
      const durationSeconds = Number.isFinite(video.duration)
        ? Math.min(MAX_TRACKED_SECONDS, Math.max(0, Math.round(video.duration)))
        : 0;
      const currentTime = Math.min(MAX_TRACKED_SECONDS, Math.max(0, video.currentTime || 0));

      if (!documentHasUserAttention()) {
        state.lastPosition = currentTime;
        return state;
      }

      if (state.lastPosition > 2 && currentTime + 1 < state.lastPosition) {
        state.replayCount += 1;
      }

      state.lastPosition = currentTime;
      state.maxPosition = Math.max(state.maxPosition, currentTime);

      if (durationSeconds > 0) {
        const watchedSecond = Math.min(durationSeconds - 1, Math.max(0, Math.floor(currentTime)));
        state.watchedSeconds.add(watchedSecond);

        const reachedPercent = Math.min(
          100,
          Math.max(0, (state.maxPosition / durationSeconds) * 100),
        );

        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          if (reachedPercent >= bucket) {
            state.retentionBuckets.add(bucket);
          }
        }

        state.milestones.milestone_25 ||= reachedPercent >= 25;
        state.milestones.milestone_50 ||= reachedPercent >= 50;
        state.milestones.milestone_75 ||= reachedPercent >= 75;
        state.milestones.milestone_100 ||= reachedPercent >= 98;
        state.completed ||= reachedPercent >= 98;
      }

      return state;
    },
    [activeVideoSource, ensureFeedVideoAnalyticsState, featuredPsychologistId],
  );

  const flushFeedVideoAnalytics = useCallback(
    (video: HTMLVideoElement | null, options?: { completed?: boolean; force?: boolean }) => {
      if (!video || !featuredPsychologistId || !activeVideoSource) return;
      if (accountTipsUserId && accountTipsUserId === featuredPsychologistId) return;

      const state = recordFeedVideoAnalyticsProgress(video);
      if (!state?.sessionKey) return;

      const now = Date.now();
      if (!options?.force && now - state.lastSentAt < VIDEO_ANALYTICS_HEARTBEAT_MS) return;

      if (options?.completed) {
        state.completed = true;
        state.milestones.milestone_100 = true;
        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          state.retentionBuckets.add(bucket);
        }
      }

      const durationSeconds = Number.isFinite(video.duration)
        ? Math.min(MAX_TRACKED_SECONDS, Math.max(0, Math.round(video.duration)))
        : 0;
      const payload: DirectoryPsychologistVideoWatchPayload = {
        session_key: state.sessionKey,
        duration_seconds: durationSeconds,
        watched_seconds: Math.max(0, state.watchedSeconds.size),
        max_position_seconds: Math.max(0, Math.round(state.maxPosition)),
        replay_count: state.replayCount,
        completed: state.completed,
        ...state.milestones,
      };

      if (
        payload.watched_seconds === 0 &&
        payload.max_position_seconds === 0 &&
        !payload.completed
      ) {
        return;
      }

      state.lastSentAt = now;
      trackFeaturedVideoWatch(payload);
    },
    [
      accountTipsUserId,
      activeVideoSource,
      featuredPsychologistId,
      recordFeedVideoAnalyticsProgress,
      trackFeaturedVideoWatch,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncAttentionBoundary = (options?: { flush?: boolean }) => {
      const video = backgroundVideoRef.current;
      if (!video || !featuredPsychologistId || !activeVideoSource) return;

      const state = ensureFeedVideoAnalyticsState(featuredPsychologistId, activeVideoSource);
      state.lastPosition = Math.max(0, video.currentTime || state.lastPosition);

      if (options?.flush) {
        flushFeedVideoAnalytics(video, { force: true });
      }
    };

    const handleVisibilityChange = () => {
      syncAttentionBoundary({ flush: !documentHasUserAttention() });
    };
    const handleFocus = () => syncAttentionBoundary();
    const handleBlur = () => syncAttentionBoundary({ flush: true });
    const handlePageHide = () => syncAttentionBoundary({ flush: true });

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [
    activeVideoSource,
    backgroundVideoRef,
    ensureFeedVideoAnalyticsState,
    featuredPsychologistId,
    flushFeedVideoAnalytics,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const frame = window.requestAnimationFrame(() => {
      recalculateInfoOverlayLayout();
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [recalculateInfoOverlayLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      recalculateInfoOverlayLayout();
    };

    const bioNode = bioTextRef.current;
    const resizeObserver = bioNode
      ? new ResizeObserver(() => recalculateInfoOverlayLayout())
      : null;

    if (bioNode) {
      resizeObserver?.observe(bioNode);
    }

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
  }, [bioTextRef, recalculateInfoOverlayLayout]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasActiveVideoChanged = lastActiveVideoResetKeyRef.current !== activeVideoResetKey;
    const nextPlaybackRate = hasActiveVideoChanged
      ? DEFAULT_VIDEO_PLAYBACK_RATE
      : videoPlaybackRate;
    const nextVolume = clampNumber(videoVolume, 0, 1);
    let activeVideo: HTMLVideoElement | null = null;

    const videos = document.querySelectorAll<HTMLVideoElement>(
      PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR,
    );

    for (const video of videos) {
      const isActiveVideo =
        video.dataset.psychologistsSlideIndex === String(activePsychologistIndex);
      video.muted = isVideoMuted;
      video.volume = nextVolume;
      video.playbackRate = nextPlaybackRate;

      if (!isActiveVideo || !activeVideoSource) {
        resetVideoElementToStart(video);
        continue;
      }

      activeVideo = video;

      if (hasActiveVideoChanged) {
        resetVideoElementToStart(video);
      }
    }

    backgroundVideoRef.current = activeVideo;

    if (hasActiveVideoChanged) {
      const nextProgress = {
        currentTime: 0,
        duration: activeVideo ? getReadableVideoDuration(activeVideo) : 0,
      };

      setIsVideoPaused(false);
      setVideoPlaybackRate(DEFAULT_VIDEO_PLAYBACK_RATE);
      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
      applyVideoProgressRatio(0);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      videoSeekPreviewRatioRef.current = null;
      feedVideoAnalyticsRef.current = createEmptyFeedVideoAnalyticsState();
    }

    lastActiveVideoResetKeyRef.current = activeVideoResetKey;

    if (!activeVideo || !activeVideoSource || isVideoPaused) {
      activeVideo?.pause();
      return;
    }

    void activeVideo.play().catch(() => {
      setIsVideoPaused(true);
    });
  }, [
    activeVideoResetKey,
    activeVideoSource,
    activePsychologistIndex,
    applyVideoProgressRatio,
    backgroundVideoRef,
    feedVideoAnalyticsRef,
    isVideoMuted,
    isVideoPaused,
    isVideoProgressSeekingRef,
    lastActiveVideoResetKeyRef,
    setIsVideoPaused,
    setIsVideoProgressSeeking,
    setVideoPlaybackRate,
    setVideoProgress,
    videoPlaybackRate,
    videoProgressStateRef,
    videoSeekPreviewRatioRef,
    videoVolume,
    wasVideoPlayingBeforeProgressScrubRef,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeVideoSource || !featuredPsychologistId) return;

    if (isVideoProgressSeeking) {
      return;
    }

    if (isVideoPaused) {
      syncActiveVideoProgress(undefined, {
        forceState: true,
      });
      return;
    }

    const tick = () => {
      syncActiveVideoProgress();
      progressAnimationFrameRef.current = window.requestAnimationFrame(tick);
    };

    progressAnimationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (progressAnimationFrameRef.current) {
        window.cancelAnimationFrame(progressAnimationFrameRef.current);
        progressAnimationFrameRef.current = null;
      }
    };
  }, [
    activeVideoSource,
    featuredPsychologistId,
    isVideoPaused,
    isVideoProgressSeeking,
    progressAnimationFrameRef,
    syncActiveVideoProgress,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    document
      .querySelectorAll<HTMLVideoElement>(PSYCHOLOGISTS_BACKGROUND_VIDEO_SELECTOR)
      .forEach((video) => {
        video.muted = isVideoMuted;
      });
  }, [isVideoMuted]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!featuredPsychologistId) return;

    const frame = window.requestAnimationFrame(() => {
      const nextProgress = {
        currentTime: 0,
        duration: 0,
      };

      resetVideoInteractionState();
      setIsVideoPlaybackFailed(false);
      setIsVideoPaused(false);
      videoProgressStateRef.current = nextProgress;
      setVideoProgress(nextProgress);
      applyVideoProgressRatio(0);
      setIsVideoProgressSeeking(false);
      isVideoProgressSeekingRef.current = false;
      wasVideoPlayingBeforeProgressScrubRef.current = false;
      videoSeekPreviewRatioRef.current = null;
      setShareFeedback(false);
      setActionColumnTranslateY(0);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [
    applyVideoProgressRatio,
    featuredPsychologistId,
    isVideoProgressSeekingRef,
    resetVideoInteractionState,
    setActionColumnTranslateY,
    setIsVideoPaused,
    setIsVideoPlaybackFailed,
    setIsVideoProgressSeeking,
    setShareFeedback,
    setVideoProgress,
    videoProgressStateRef,
    videoSeekPreviewRatioRef,
    wasVideoPlayingBeforeProgressScrubRef,
  ]);

  return {
    applyVideoProgressRatio,
    flushFeedVideoAnalytics,
    syncActiveVideoProgress,
  };
};

export type PsychologistsVideoAnalytics = ReturnType<typeof usePsychologistsVideoAnalytics>;
