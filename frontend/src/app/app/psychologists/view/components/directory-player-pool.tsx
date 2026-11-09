"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import {
  PersistentFeedVideo,
  PersistentFeedVideoProvider,
} from "@/components/ui/persistent-feed-video-player";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import { playVideoWithActiveDocument } from "@/lib/video-playback";
import type { PsychologistFeedSlide } from "../../modules/feed-loop";
import type { PsychologistsViewModel } from "../types";
import { DirectoryPlayerOverlay } from "./directory-player-overlay";
import { buildPsychologistSlideView } from "./slide-model";

const Experiment = createContext(false);
const subscribe = () => () => {};
const serverSnapshot = () => false;
const clientSnapshot = () =>
  new URLSearchParams(window.location.search).get("directoryPlayer") === "pooled";

export function DirectoryPlayerExperiment({
  children,
  model,
  slides,
}: {
  children: ReactNode;
  model: PsychologistsViewModel;
  slides: PsychologistFeedSlide[];
}) {
  const enabled = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
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
  useLayoutEffect(() => {
    latest.current = model;
  });
  const play = useCallback(async () => {
    const video = owned.current;
    const eligible = () =>
      owned.current === video &&
      latest.current.setup.activePsychologistIndex === index &&
      !latest.current.setup.isVideoPaused &&
      !latest.current.setup.isVideoProgressSeeking;
    if (!video || !eligible()) return;
    await playVideoWithActiveDocument(video);
    if (owned.current === video && !eligible()) video.pause();
  }, [index]);
  const ready = useCallback(
    (video: HTMLVideoElement | null) => {
      const current = latest.current;
      if (owned.current && owned.current !== video) {
        current.analytics.flushFeedVideoAnalytics(owned.current, { force: true });
        if (current.setup.backgroundVideoRef.current === owned.current)
          current.setup.backgroundVideoRef.current = null;
      }
      owned.current = video;
      if (!video || current.setup.activePsychologistIndex !== index) return;
      current.setup.backgroundVideoRef.current = video;
      video.muted = current.setup.isVideoMuted;
      video.volume = current.setup.videoVolume;
      video.playbackRate = current.setup.videoPlaybackRate;
      current.analytics.syncActiveVideoProgress(video);
      requestAnimationFrame(() => {
        if (owned.current === video) void play();
      });
    },
    [index, play],
  );
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
          onLoadedData: (event) => {
            props.videoProps?.onLoadedData?.(event);
            requestAnimationFrame(() => void play());
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
