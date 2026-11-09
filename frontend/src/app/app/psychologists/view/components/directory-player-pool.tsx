"use client";

import Image from "next/image";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import {
  type PlayerPool,
  type PoolEntry,
  selectDirectoryPool,
} from "../../modules/directory-player-pool";
import type { PsychologistFeedSlide } from "../../modules/feed-loop";
import type { PsychologistsViewModel } from "../types";
import { buildPsychologistSlideView } from "./slide-model";
import { buildSlideVideoProps } from "./slide-video-props";

type RegisterSlot = (index: number, node: HTMLDivElement | null) => void;
const Slots = createContext<RegisterSlot | null>(null);
const subscribe = () => () => {};
const serverSnapshot = () => false;
const clientSnapshot = () =>
  new URLSearchParams(window.location.search).get("directoryPlayer") === "pooled";

export function DirectoryPlayerExperiment({
  children,
  ...props
}: {
  children: ReactNode;
  model: PsychologistsViewModel;
  slides: PsychologistFeedSlide[];
}) {
  const enabled = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return enabled ? <DirectoryPlayerPool {...props}>{children}</DirectoryPlayerPool> : children;
}

export function DirectorySlideVideo({
  index,
  ...props
}: VerticalVideoPlayerProps & { index: number }) {
  const register = useContext(Slots);
  const ref = useCallback(
    (node: HTMLDivElement | null) => register?.(index, node),
    [index, register],
  );
  if (!register) return <VerticalVideoPlayer {...props} />;
  return (
    <div ref={ref} className="relative h-full w-full" data-directory-player-slot={index}>
      {props.poster ? (
        <Image
          alt=""
          fill
          unoptimized
          sizes="(min-width: 768px) 430px, 100vw"
          src={props.poster}
          className="object-cover"
        />
      ) : null}
    </div>
  );
}

function DirectoryPlayerPool({
  children,
  model,
  slides,
}: {
  children: ReactNode;
  model: PsychologistsViewModel;
  slides: PsychologistFeedSlide[];
}) {
  const [hosts] = useState(() =>
    [0, 1].map(() => {
      const node = document.createElement("div");
      node.style.cssText = "position:absolute;inset:0";
      return node;
    }),
  );
  const slots = useRef(new Map<number, HTMLDivElement>());
  const parking = useRef<HTMLDivElement | null>(null);
  const register = useCallback<RegisterSlot>((index, node) => {
    if (node) slots.current.set(index, node);
    else slots.current.delete(index);
  }, []);
  const [assignment, setAssignment] = useState<{ pool: PlayerPool; activeKey: string | null }>({
    pool: [null, null],
    activeKey: null,
  });
  const { pool } = assignment;
  const [started, setStarted] = useState<string | null>(null);
  const [prepare] = useState(() => {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    return !connection?.saveData && !["2g", "slow-2g"].includes(connection?.effectiveType ?? "");
  });
  const entryFor = (index: number): PoolEntry | null => {
    const item = slides[index];
    if (!item) return null;
    const slide = buildPsychologistSlideView({ ...item, model });
    return slide.slideShouldShowVideo && slide.slideVideoSrc
      ? {
          key: `${item.psychologist.id}:${index}:${slide.slideVideoSrc}`,
          index,
          src: slide.slideVideoSrc,
        }
      : null;
  };
  const active = entryFor(model.setup.activePsychologistIndex);
  const next = entryFor(model.setup.activePsychologistIndex + 1);
  const updated = selectDirectoryPool(
    pool,
    active,
    next,
    prepare && started === active?.key,
    assignment.activeKey,
  );
  if (
    assignment.activeKey !== (active?.key ?? null) ||
    updated.some((entry, i) => entry?.key !== pool[i]?.key)
  ) {
    setAssignment({ pool: updated, activeKey: active?.key ?? null });
  }
  const activeSlot = pool.findIndex((entry) => entry?.key === active?.key);
  const flush = model.analytics.flushFeedVideoAnalytics;
  const flushRef = useRef(flush);
  const owner = useRef<{ key: string; video: HTMLVideoElement; flush: typeof flush } | null>(null);
  useLayoutEffect(() => {
    flushRef.current = flush;
  });

  useLayoutEffect(() => {
    hosts.forEach((host, i) => {
      const entry = pool[i];
      const valid = entry && entryFor(entry.index)?.key === entry.key;
      const destination = valid ? slots.current.get(entry.index) : null;
      (destination ?? parking.current)?.appendChild(host);
    });
  });

  useLayoutEffect(() => {
    const previous = owner.current;
    if (previous?.key === active?.key) return;
    if (previous) {
      previous.flush(previous.video, { force: true });
      previous.video.pause();
    }
    const video = activeSlot < 0 ? null : hosts[activeSlot].querySelector("video");
    owner.current =
      active?.key && video ? { key: active.key, video, flush: flushRef.current } : null;
  }, [active?.key, activeSlot, hosts]);

  useEffect(
    () => () => {
      const videos = hosts.map((host) => ({ host, video: host.querySelector("video") }));
      // Strict Mode immediately reconnects the same hosts; only dispose a real unmount.
      queueMicrotask(() => {
        videos.forEach(({ host, video }) => {
          if (host.isConnected) return;
          video?.pause();
          video?.removeAttribute("src");
          video?.load();
          host.remove();
        });
      });
    },
    [hosts],
  );

  return (
    <Slots.Provider value={register}>
      {children}
      <div hidden ref={parking} data-directory-player-model="pooled" />
      {pool.map((entry, i) => {
        if (!entry) return null;
        const item = slides[entry.index];
        if (!item || entryFor(entry.index)?.key !== entry.key) return null;
        const isActive = entry.key === active?.key;
        const props = buildSlideVideoProps(model, buildPsychologistSlideView({ ...item, model }));
        return createPortal(
          <VerticalVideoPlayer
            {...props}
            playbackMode={isActive ? "active" : "standby"}
            captions={isActive ? undefined : null}
            preload="auto"
            videoProps={
              isActive
                ? {
                    ...props.videoProps,
                    onPlaying: () => setStarted(entry.key),
                  }
                : {
                    muted: true,
                    autoPlay: false,
                    tabIndex: -1,
                    "data-directory-prepared-player": "true",
                    onPlay: (event) => event.currentTarget.pause(),
                  }
            }
          />,
          hosts[i],
          String(i),
        );
      })}
    </Slots.Provider>
  );
}
