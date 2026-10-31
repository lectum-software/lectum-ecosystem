"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { VerticalVideoStreamStatus } from "@/components/ui/vertical-video-player-stream";
import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import { useAttachVideoSource, useVideoPlaybackSource } from "@/hooks/video-stream";
import { useActiveVideoPlaybackGuard } from "@/lib/video-playback";

type PlayerProps = Pick<
  VerticalVideoPlayerProps,
  "className" | "src" | "title" | "videoProps" | "onVideoElementReady" | "onContentClick"
> & { mediaKey: string; active: boolean };
type Selection = { slot: HTMLDivElement | null; props: PlayerProps; revision: number };
type Registration = (slot: HTMLDivElement, props: PlayerProps | null) => void;
const PlayerContext = createContext<Registration | null>(null);

function PersistentMedia({ selection }: { selection: Selection }) {
  const { slot, props, revision } = selection;
  const { onVideoElementReady } = props;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const owner = useRef<typeof onVideoElementReady>(undefined);
  const playback = useVideoPlaybackSource(props.src, undefined, Boolean(slot));

  // Clear the previous source before its events can be attributed to a new reel.
  useLayoutEffect(() => {
    void revision;
    const video = videoRef.current;
    if (!video) return;
    // Flush the old owner's tracking while its duration/source are still intact.
    owner.current?.(null);
    owner.current = undefined;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }, [revision]);

  const adaptivePlaybackFailed = useAttachVideoSource({
    adaptive: playback.isStream,
    source: slot ? playback.source : "",
    videoElementVersion: revision,
    videoRef,
  });

  useEffect(() => {
    void revision;
    const video = videoRef.current;
    if (!video || !slot) return;
    // Run after the old HLS adapter has detached, including HLS -> MP4 transitions.
    if (!playback.isStream && playback.source) {
      video.src = playback.source;
      video.load();
    }
    owner.current = onVideoElementReady;
    onVideoElementReady?.(video);
    return () => {
      if (owner.current === onVideoElementReady) {
        owner.current?.(null);
        owner.current = undefined;
      }
      video.pause();
    };
  }, [slot, revision, playback.isStream, playback.source, onVideoElementReady]);

  useActiveVideoPlaybackGuard({ videoElementVersion: revision, videoRef });

  return (
    <>
      <video
        {...props.videoProps}
        ref={videoRef}
        aria-label={props.title}
        className="h-full w-full bg-media-background object-cover"
        data-lectum-video-player="true"
        data-reels-persistent-player="true"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        playsInline
        preload="auto"
        poster={playback.poster || undefined}
        tabIndex={-1}
      />
      <VerticalVideoStreamStatus
        adaptivePlaybackFailed={adaptivePlaybackFailed}
        error={playback.error}
        isLoading={playback.isLoading}
      />
    </>
  );
}

export function ContentVideoPlayerProvider({ children }: { children: ReactNode }) {
  const [host] = useState(() => {
    const node = document.createElement("div");
    node.style.cssText = "position:absolute;inset:0;pointer-events:none";
    return node;
  });
  const parking = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
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
    // The portal container and video stay identical; only their visual slot moves.
    (selection?.slot ?? parking.current)?.appendChild(host);
  }, [host, selection?.slot]);

  useEffect(() => () => host.remove(), [host]);

  return (
    <PlayerContext.Provider value={register}>
      {children}
      <div ref={parking} hidden aria-hidden="true" />
      {selection ? createPortal(<PersistentMedia selection={selection} />, host) : null}
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
