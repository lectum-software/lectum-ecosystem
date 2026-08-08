"use client";
import { useCallback, useRef } from "react";
import { useDirectoryPsychologistVideoWatch } from "@/api/callers/directory";
import type {
  DirectoryPsychologistProfile,
  DirectoryPsychologistVideoWatchPayload,
} from "@/api/generator/types/directory";
import { documentHasUserAttention } from "@/components/analytics/attention";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { useAppSelector } from "@/hooks/redux";
import { resolvePublicMediaUrl } from "@/utils/media";

import {
  createVideoSessionKey,
  getPsychologistDisplayName,
  PRESENTATION_VIDEO_RETENTION_BUCKETS,
} from "../modules/support";

export const PresentationVideo = ({ profile }: { profile: DirectoryPsychologistProfile }) => {
  const currentUser = useAppSelector((state) => state.user);
  const { mutate: trackVideoWatch } = useDirectoryPsychologistVideoWatch(profile.id);
  const cleanupTrackingRef = useRef<(() => void) | null>(null);
  const completedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const lastPlaybackPositionRef = useRef(0);
  const lastSentAtRef = useRef(0);
  const maxPositionRef = useRef(0);
  const milestonesRef = useRef({
    milestone_25: false,
    milestone_50: false,
    milestone_75: false,
    milestone_100: false,
  });
  const replayCountRef = useRef(0);
  const retentionBucketsRef = useRef<Set<number>>(new Set());
  const sessionKeyRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef<Set<number>>(new Set());
  const videoSrc = resolvePublicMediaUrl(profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.video_cover_url);
  const shouldTrack = Boolean(videoSrc && currentUser?.id !== profile.id);
  const displayName = getPsychologistDisplayName(profile) || profile.name || "Profissional";

  const flushVideoAnalytics = useCallback(
    (video: HTMLVideoElement | null, completed = false, force = false) => {
      if (!shouldTrack || !video || !videoSrc) return;

      const now = Date.now();
      if (!force && now - lastSentAtRef.current < 5000) return;

      const durationSeconds = Number.isFinite(video.duration)
        ? Math.max(0, Math.round(video.duration))
        : 0;
      const maxPositionSeconds = Math.max(0, Math.round(maxPositionRef.current));
      const watchedSeconds = Math.max(0, watchedSecondsRef.current.size);

      if (watchedSeconds === 0 && maxPositionSeconds === 0 && !completed) return;

      sessionKeyRef.current ??= createVideoSessionKey(profile.id, videoSrc);

      if (completed) {
        completedRef.current = true;
        milestonesRef.current.milestone_100 = true;
      }

      const body: DirectoryPsychologistVideoWatchPayload = {
        session_key: sessionKeyRef.current,
        duration_seconds: durationSeconds,
        watched_seconds: watchedSeconds,
        max_position_seconds: maxPositionSeconds,
        replay_count: replayCountRef.current,
        completed: completedRef.current,
        ...milestonesRef.current,
      };

      lastSentAtRef.current = now;
      trackVideoWatch(body);
    },
    [profile.id, shouldTrack, trackVideoWatch, videoSrc],
  );

  const handleVideoReady = useCallback(
    (video: HTMLVideoElement | null) => {
      cleanupTrackingRef.current?.();
      cleanupTrackingRef.current = null;

      if (!video || !shouldTrack) return;

      const updateMilestones = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

        const retention = maxPositionRef.current / video.duration;
        const previous = { ...milestonesRef.current };
        milestonesRef.current = {
          milestone_25: previous.milestone_25 || retention >= 0.25,
          milestone_50: previous.milestone_50 || retention >= 0.5,
          milestone_75: previous.milestone_75 || retention >= 0.75,
          milestone_100: previous.milestone_100 || retention >= 0.98 || completedRef.current,
        };

        return (
          previous.milestone_25 !== milestonesRef.current.milestone_25 ||
          previous.milestone_50 !== milestonesRef.current.milestone_50 ||
          previous.milestone_75 !== milestonesRef.current.milestone_75 ||
          previous.milestone_100 !== milestonesRef.current.milestone_100
        );
      };

      const updateRetentionBuckets = () => {
        if (!Number.isFinite(video.duration) || video.duration <= 0) return false;

        const reachedPercent = Math.min(
          100,
          Math.max(0, (maxPositionRef.current / video.duration) * 100),
        );
        const previousCount = retentionBucketsRef.current.size;

        for (const bucket of PRESENTATION_VIDEO_RETENTION_BUCKETS) {
          if (reachedPercent >= bucket || (bucket === 100 && completedRef.current)) {
            retentionBucketsRef.current.add(bucket);
          }
        }

        return previousCount !== retentionBucketsRef.current.size;
      };

      const addWatchedRange = (from: number, to: number) => {
        if (!documentHasUserAttention()) return;

        const start = Math.max(0, Math.floor(Math.min(from, to)));
        const end = Math.max(0, Math.ceil(Math.max(from, to)));

        for (let second = start; second <= end; second += 1) {
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
        } else {
          watchedSecondsRef.current.add(Math.max(0, Math.floor(currentTime)));
        }

        maxPositionRef.current = Math.max(maxPositionRef.current, currentTime);
        lastPlaybackPositionRef.current = currentTime;

        const milestoneChanged = updateMilestones();
        const bucketChanged = updateRetentionBuckets();
        flushVideoAnalytics(video, false, milestoneChanged || bucketChanged);
      };

      const handleEnded = () => {
        if (!documentHasUserAttention()) {
          lastPlaybackPositionRef.current = video.currentTime || lastPlaybackPositionRef.current;
          flushVideoAnalytics(video, false, true);
          return;
        }

        if (Number.isFinite(video.duration) && video.duration > 0) {
          addWatchedRange(lastPlaybackPositionRef.current, video.duration);
          maxPositionRef.current = Math.max(maxPositionRef.current, video.duration);
        }

        completedRef.current = true;
        updateMilestones();
        updateRetentionBuckets();
        flushVideoAnalytics(video, true, true);
      };

      const handlePause = () => flushVideoAnalytics(video, false, true);
      const syncAttentionBoundary = () => {
        lastPlaybackPositionRef.current = video.currentTime || lastPlaybackPositionRef.current;
      };
      const handleVisibilityChange = () => {
        if (documentHasUserAttention()) {
          if (!video.paused) {
            hasStartedRef.current = true;
            syncAttentionBoundary();
          }
          return;
        }

        syncAttentionBoundary();
        flushVideoAnalytics(video, false, true);
      };
      const handleFocus = () => {
        if (!video.paused) syncAttentionBoundary();
      };
      const handleBlur = () => {
        syncAttentionBoundary();
        flushVideoAnalytics(video, false, true);
      };
      const handlePageHide = () => {
        syncAttentionBoundary();
        flushVideoAnalytics(video, false, true);
      };

      video.addEventListener("play", handlePlay);
      video.addEventListener("timeupdate", handleTimeUpdate);
      video.addEventListener("ended", handleEnded);
      video.addEventListener("pause", handlePause);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
      window.addEventListener("pagehide", handlePageHide);

      cleanupTrackingRef.current = () => {
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("timeupdate", handleTimeUpdate);
        video.removeEventListener("ended", handleEnded);
        video.removeEventListener("pause", handlePause);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("focus", handleFocus);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("pagehide", handlePageHide);
      };
    },
    [flushVideoAnalytics, shouldTrack],
  );

  if (!videoSrc) return null;

  return (
    <div className="mt-3">
      <div className="mx-auto grid w-full gap-3 sm:max-w-[260px]">
        <article
          className="box-border relative w-full overflow-hidden rounded-[18px] border border-border bg-surface-muted shadow-lectum-soft"
          data-presentation-video="true"
        >
          <VerticalVideoPlayer
            className="rounded-[18px] border-0"
            onVideoElementReady={handleVideoReady}
            poster={videoCoverSrc}
            src={videoSrc}
            title={`Vídeo de apresentação de ${displayName}`}
          />
        </article>
      </div>
    </div>
  );
};
