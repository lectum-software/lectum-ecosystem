"use client";

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { playVideoWithActiveDocument } from "@/lib/video-playback";
import {
  getVideoSoundEnabled,
  getVideoSoundPreferenceRevision,
  subscribeVideoSoundPreference,
} from "@/lib/video-sound-preference";

export type FeedVideoCommands = {
  play: () => Promise<void>;
  pause: () => void;
  canPlay: () => boolean;
};

/** One activation/audio policy for reels and presentation videos. */
export function useFeedVideoPlayback({
  videoRef,
  active,
  canPlay,
  onMuted,
  commandsRef,
}: {
  videoRef: RefObject<HTMLVideoElement | null>;
  active: boolean;
  canPlay: () => boolean;
  onMuted: (muted: boolean) => void;
  commandsRef?: RefObject<FeedVideoCommands | null>;
}) {
  const latest = useRef({ active, canPlay, onMuted });
  const attemptRef = useRef(0);
  const blockedRevision = useRef<number | null>(null);
  const manuallyPaused = useRef(false);
  useLayoutEffect(() => {
    latest.current = { active, canPlay, onMuted };
  });
  const pause = useCallback(() => videoRef.current?.pause(), [videoRef]);
  useLayoutEffect(() => {
    blockedRevision.current = null;
    manuallyPaused.current = false;
    if (!active) pause();
    return () => {
      attemptRef.current += 1;
      pause();
    };
  }, [active, pause]);
  const play = useCallback(async () => {
    const video = videoRef.current;
    const eligible = () =>
      latest.current.active &&
      !manuallyPaused.current &&
      latest.current.canPlay() &&
      videoRef.current === video;
    if (!video || !eligible()) return;
    const attempt = ++attemptRef.current;
    const revision = getVideoSoundPreferenceRevision();
    video.muted = !getVideoSoundEnabled() || blockedRevision.current === revision;
    latest.current.onMuted(video.muted);
    let autoplayBlocked = false;
    const started = await playVideoWithActiveDocument(video, {
      onAutoplayBlocked: () => {
        autoplayBlocked = true;
      },
    });
    if (!eligible()) {
      if (videoRef.current === video) video.pause();
      return;
    }
    if (attempt !== attemptRef.current || revision !== getVideoSoundPreferenceRevision()) return;
    if (!started && autoplayBlocked && video.paused && !video.muted) {
      blockedRevision.current = revision;
      video.muted = true;
      latest.current.onMuted(true);
      await playVideoWithActiveDocument(video);
      if (!eligible() && videoRef.current === video) video.pause();
    }
  }, [videoRef]);
  useLayoutEffect(() => {
    if (!active || !commandsRef) return;
    const commands: FeedVideoCommands = {
      canPlay: () => latest.current.active && !manuallyPaused.current && latest.current.canPlay(),
      play: () => {
        manuallyPaused.current = false;
        return play();
      },
      pause: () => {
        manuallyPaused.current = true;
        attemptRef.current += 1;
        pause();
      },
    };
    commandsRef.current = commands;
    return () => {
      if (commandsRef.current === commands) commandsRef.current = null;
    };
  }, [active, commandsRef, pause, play]);
  useEffect(
    () =>
      subscribeVideoSoundPreference((enabled) => {
        attemptRef.current += 1;
        if (videoRef.current) videoRef.current.muted = !enabled;
        latest.current.onMuted(!enabled);
        if (enabled) void play();
      }),
    [play, videoRef],
  );
  useEffect(() => {
    if (active) void play();
    else pause();
    return pause;
  }, [active, play, pause]);
  return play;
}
