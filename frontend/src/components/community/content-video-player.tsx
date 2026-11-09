"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { VerticalVideoStreamStatus } from "@/components/ui/vertical-video-player-stream";
import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import { VideoStartupCover } from "@/components/ui/video-startup-cover";
import { PlayerCaptions } from "@/components/video-captions/player-captions";
import { useAttachVideoSource, useVideoPlaybackSource } from "@/hooks/video-stream";
import { useActiveVideoPlaybackGuard } from "@/lib/video-playback";

type PlayerProps = Pick<
  VerticalVideoPlayerProps,
  "className" | "src" | "title" | "videoProps" | "onVideoElementReady" | "onContentClick"
> & { mediaKey: string; active: boolean };
type Selection = { slot: HTMLDivElement | null; props: PlayerProps; revision: number };
type Registration = (slot: HTMLDivElement, props: PlayerProps | null) => void;
const PlayerContext = createContext<Registration | null>(null);

function PersistentMedia({
  selection,
  onStarted,
}: {
  selection: Selection;
  onStarted: (source: string) => void;
}) {
  const { slot, props, revision } = selection;
  const { onVideoElementReady } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const owner = useRef<typeof onVideoElementReady>(undefined);
  const playback = useVideoPlaybackSource(props.src);
  const [retryVersion, retryAttachment] = useReducer((version: number) => version + 1, 0);

  // Clear the previous source before its events can be attributed to a new reel.
  useLayoutEffect(() => {
    void props.src;
    const video = videoRef.current;
    if (!video) return;
    // Flush the old owner's tracking while its duration/source are still intact.
    owner.current?.(null);
    owner.current = undefined;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [props.src]);

  const adaptivePlaybackFailed = useAttachVideoSource({
    adaptive: playback.isStream,
    source: playback.source,
    standby: !slot,
    videoElementVersion: retryVersion,
    videoRef,
  });

  const retryPreparedPlayback = useEffectEvent(() => {
    if (playback.error) void playback.refetch();
    if (adaptivePlaybackFailed) retryAttachment();
    else if (videoRef.current?.error) videoRef.current.load();
  });
  useEffect(() => {
    // Retry a failed preparation once on activation, never reset a healthy buffer.
    if (slot) retryPreparedPlayback();
  }, [slot]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Run after the old HLS adapter has detached, including HLS -> MP4 transitions.
    if (!playback.isStream && playback.source) {
      video.src = playback.source;
      video.load();
    }
  }, [playback.isStream, playback.source]);

  useLayoutEffect(() => {
    void revision;
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    if (!slot) return;
    owner.current = onVideoElementReady;
    onVideoElementReady?.(video);
    return () => {
      if (owner.current === onVideoElementReady) {
        owner.current?.(null);
        owner.current = undefined;
      }
      video.pause();
      if (video.readyState >= 1) video.currentTime = 0;
    };
  }, [slot, revision, onVideoElementReady]);

  useActiveVideoPlaybackGuard({ videoElementVersion: revision, videoRef });

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      video?.pause();
      video?.removeAttribute("src");
      video?.load();
    };
  }, []);

  return (
    <>
      <video
        {...(slot ? props.videoProps : { muted: true })}
        ref={videoRef}
        aria-label={props.title}
        className="h-full w-full bg-media-background object-cover"
        data-lectum-video-player="true"
        data-reels-persistent-player={slot ? "true" : undefined}
        data-reels-prepared-player={!slot ? "true" : undefined}
        onPlaying={(event) => {
          if (!slot) {
            event.currentTarget.pause();
            return;
          }
          props.videoProps?.onPlaying?.(event);
          onStarted(props.src);
        }}
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="auto"
        poster={playback.poster || undefined}
        tabIndex={-1}
      />
      <VideoStartupCover
        key={playback.source}
        poster={playback.poster}
        src={playback.source}
        videoRef={videoRef}
      />
      <VerticalVideoStreamStatus
        adaptivePlaybackFailed={adaptivePlaybackFailed}
        error={playback.error}
        isLoading={playback.isLoading}
      />
      {playback.captions && slot ? (
        <PlayerCaptions
          key={props.src}
          captions={playback.captions}
          videoRef={videoRef}
          version={revision}
        />
      ) : null}
    </>
  );
}

export function ContentVideoPlayerProvider({
  children,
  nextSource,
  nextAfterSource,
}: {
  children: ReactNode;
  nextSource?: string;
  nextAfterSource?: string;
}) {
  const [hosts] = useState(() =>
    [0, 1].map(() => {
      const node = document.createElement("div");
      node.style.cssText = "position:absolute;inset:0;pointer-events:none";
      return node;
    }),
  );
  const parking = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [startedSource, setStartedSource] = useState<string | null>(null);
  const [prepareNext] = useState(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    return !connection?.saveData && !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
  });
  const [sources, setSources] = useState<[string, string]>(["", ""]);
  const currentSource = selection?.props.src ?? "";
  const activeIndex = Math.max(0, sources.indexOf(currentSource));
  const updated: [string, string] = [...sources];
  if (currentSource && !sources.includes(currentSource)) updated[activeIndex] = currentSource;
  // Only one standby item, after the foreground video has started. Never autoplay it.
  const standbyIndex = 1 - activeIndex;
  if (
    selection?.slot &&
    prepareNext &&
    nextAfterSource === currentSource &&
    startedSource === currentSource &&
    nextSource &&
    nextSource !== currentSource
  ) {
    updated[standbyIndex] = nextSource;
  }
  if (updated[0] !== sources[0] || updated[1] !== sources[1]) setSources(updated);
  const register = useCallback<Registration>((slot, props) => {
    setSelection((current) => {
      if (!props) {
        return current?.slot === slot
          ? { ...current, slot: null, revision: current.revision + 1 }
          : current;
      }
      const changed =
        current?.slot !== slot ||
        current.props.mediaKey !== props.mediaKey ||
        current.props.src !== props.src;
      return { slot, props, revision: (current?.revision ?? 0) + Number(changed) };
    });
  }, []);

  useLayoutEffect(() => {
    // Promote the prepared element by moving its host, preserving its media buffer.
    hosts.forEach((host, index) => {
      (index === activeIndex ? (selection?.slot ?? parking.current) : parking.current)?.appendChild(
        host,
      );
    });
  }, [hosts, selection?.slot, activeIndex]);

  useEffect(
    () => () => {
      hosts.forEach((host) => {
        host.remove();
      });
    },
    [hosts],
  );

  return (
    <PlayerContext.Provider value={register}>
      {children}
      <div ref={parking} hidden aria-hidden="true" />
      {selection
        ? sources.map((source, index) =>
            source
              ? createPortal(
                  <PersistentMedia
                    selection={
                      index === activeIndex
                        ? selection
                        : {
                            slot: null,
                            revision: 0,
                            props: { src: source, mediaKey: source, active: false, title: "" },
                          }
                    }
                    onStarted={setStartedSource}
                  />,
                  hosts[index],
                  String(index),
                )
              : null,
          )
        : null}
    </PlayerContext.Provider>
  );
}

export function ContentVideoPlayer(props: PlayerProps) {
  const register = useContext(PlayerContext);
  const slot = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    if (slot.current) register?.(slot.current, props.active ? props : null);
  });
  useLayoutEffect(() => {
    const node = slot.current;
    return () => {
      if (node) register?.(node, null);
    };
  }, [register]);

  return (
    <div className={props.className} ref={slot}>
      <button
        type="button"
        data-lectum-video-surface="true"
        aria-label={`Mostrar interface do v\u00eddeo: ${props.title}`}
        className="absolute inset-0 z-[1] cursor-pointer border-0 bg-transparent p-0 focus-visible:ring-2 focus-visible:ring-media-foreground/50"
        onClick={props.onContentClick}
      />
    </div>
  );
}
