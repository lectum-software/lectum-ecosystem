"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  PersistentFeedVideo,
  PersistentFeedVideoProvider,
} from "@/components/ui/persistent-feed-video-player";
import { useFeedVideoPlayback } from "@/components/ui/use-feed-video-playback";
import { useFeedVideoReady } from "@/components/ui/use-feed-video-ready";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import { useDirectoryPlayerPoolEnabled } from "../../modules/directory-player-mode";
import type { PsychologistFeedSlide } from "../../modules/feed-loop";
import type { PsychologistsViewModel } from "../types";
import { DirectoryPlayerOverlay } from "./directory-player-overlay";
import { buildPsychologistSlideView } from "./slide-model";

const Experiment = createContext(false);

export function DirectoryPlayerExperiment({
  children,
  model,
  slides,
}: {
  children: ReactNode;
  model: PsychologistsViewModel;
  slides: PsychologistFeedSlide[];
}) {
  const enabled = useDirectoryPlayerPoolEnabled();
  const sourceAt = (index: number) => {
    const item = slides[index];
    if (!item) return undefined;
    const slide = buildPsychologistSlideView({ ...item, model });
    return slide.slideShouldShowVideo ? slide.slideVideoSrc || undefined : undefined;
  };
  if (!enabled) return children;
  return (
    <Experiment.Provider value>
      <PersistentFeedVideoProvider
        surface="directory"
        nextSource={sourceAt(model.setup.activePsychologistIndex + 1)}
        nextAfterSource={sourceAt(model.setup.activePsychologistIndex)}
      >
        {children}
      </PersistentFeedVideoProvider>
    </Experiment.Provider>
  );
}

export function DirectorySlideVideo({
  index,
  model,
  ...props
}: VerticalVideoPlayerProps & {
  index: number;
  model: PsychologistsViewModel;
}) {
  const enabled = useContext(Experiment);
  if (!enabled) return <VerticalVideoPlayer {...props} />;
  return <SharedDirectoryVideo index={index} model={model} {...props} />;
}

function SharedDirectoryVideo({
  index,
  model,
  ...props
}: VerticalVideoPlayerProps & {
  index: number;
  model: PsychologistsViewModel;
}) {
  const active = index === model.setup.activePsychologistIndex;
  const latest = useRef(model);
  const owned = useRef<HTMLVideoElement | null>(null);
  const tracking = useRef<{ video: HTMLVideoElement; model: PsychologistsViewModel } | null>(null);
  useLayoutEffect(() => {
    latest.current = model;
  });
  const play = useFeedVideoPlayback({
    videoRef: owned,
    active,
    onMuted: model.setup.setIsVideoMuted,
    canPlay: () =>
      latest.current.setup.activePsychologistIndex === index &&
      !latest.current.setup.isVideoPaused &&
      !latest.current.setup.isVideoProgressSeeking,
  });
  const trackVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      const current = latest.current;
      const previous = tracking.current;
      if (previous && previous.video !== video) {
        previous.model.analytics.flushFeedVideoAnalytics(previous.video, { force: true });
        if (current.setup.backgroundVideoRef.current === previous.video)
          current.setup.backgroundVideoRef.current = null;
      }
      tracking.current = video ? { video, model: current } : null;
      if (!video || current.setup.activePsychologistIndex !== index) return;
      current.setup.backgroundVideoRef.current = video;
      video.volume = current.setup.videoVolume;
      video.playbackRate = current.setup.videoPlaybackRate;
      current.analytics.syncActiveVideoProgress(video);
    },
    [index],
  );
  const syncProgress = useCallback(
    () => latest.current.analytics.syncActiveVideoProgress(owned.current),
    [],
  );
  const ready = useFeedVideoReady({
    videoRef: owned,
    trackVideo,
    initialTime: 0,
    play,
    setDuration: syncProgress,
    setTime: syncProgress,
  });
  const { isVideoMuted, videoVolume, videoPlaybackRate, isVideoPaused, isVideoProgressSeeking } =
    model.setup;
  useEffect(() => {
    const video = owned.current;
    if (!active || !video) return;
    video.muted = isVideoMuted;
    video.volume = videoVolume;
    video.playbackRate = videoPlaybackRate;
    if (isVideoPaused || isVideoProgressSeeking) video.pause();
    else void play();
  }, [
    active,
    isVideoMuted,
    videoVolume,
    videoPlaybackRate,
    isVideoPaused,
    isVideoProgressSeeking,
    play,
  ]);
  return (
    <div className="relative h-full w-full" data-directory-player-slot={index}>
      <PersistentFeedVideo
        className="relative h-full w-full"
        src={props.src}
        poster={props.poster}
        title={props.title}
        mediaKey={`${index}:${props.src}`}
        active={active}
        surface="directory"
        videoProps={{
          ...props.videoProps,
          onLoadedMetadata: (event) => {
            props.videoProps?.onLoadedMetadata?.(event);
            void play();
          },
          onCanPlay: () => {
            if (owned.current?.paused) void play();
          },
        }}
        onVideoElementReady={ready}
        onContentClick={props.onContentClick}
        overlay={<DirectoryPlayerOverlay model={model} title={props.title} source={props.src} />}
      />
    </div>
  );
}
