"use client";

import { useState } from "react";
import { useFeedVideoMedia } from "@/components/ui/persistent-feed-video-player";
import { VerticalVideoPlayerPersistentControls } from "@/components/ui/vertical-video-player-persistent-controls";
import { PlayerCaptions } from "@/components/video-captions/player-captions";
import { setVideoSoundEnabledByUser } from "@/lib/video-sound-preference";
import type { PsychologistsViewModel } from "../types";

export function DirectoryPlayerOverlay({
  model,
  title,
  source,
}: {
  model: PsychologistsViewModel;
  title: string;
  source: string;
}) {
  const { videoRef, captions, revision } = useFeedVideoMedia();
  const [captionTarget, setCaptionTarget] = useState<HTMLSpanElement | null>(null);
  const { isUiHidden, videoProgress, isVideoMuted, isVideoPaused, progressTrackRef } = model.setup;
  const gestures = model.gestures;
  return (
    <>
      {captions ? (
        <PlayerCaptions
          key={source}
          captions={captions}
          directory
          videoRef={videoRef}
          version={revision}
          controlTarget={isUiHidden ? captionTarget : null}
        />
      ) : null}
      {isUiHidden ? (
        <VerticalVideoPlayerPersistentControls
          captionControlRef={setCaptionTarget}
          videoRef={videoRef}
          currentTime={videoProgress.currentTime}
          duration={videoProgress.duration}
          isMuted={isVideoMuted}
          isPaused={isVideoPaused}
          title={title}
          onPlayPause={() => {
            const video = videoRef.current;
            if (video?.paused) void model.setup.feedVideoCommandsRef.current?.play();
            else model.setup.feedVideoCommandsRef.current?.pause();
          }}
          onMuteToggle={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
            setVideoSoundEnabledByUser(!video.muted);
          }}
          onProgressKeyDown={gestures.handleVideoProgressKeyDown}
          onProgressPointerDown={gestures.handleVideoProgressPointerDown}
          onProgressPointerMove={gestures.handleVideoProgressPointerMove}
          onProgressPointerEnd={gestures.handleVideoProgressPointerEnd}
          progressRatio={
            videoProgress.duration ? videoProgress.currentTime / videoProgress.duration : 0
          }
          progressTrackRef={progressTrackRef}
        />
      ) : null}
    </>
  );
}
