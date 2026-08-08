import type { CSSProperties, VideoHTMLAttributes } from "react";

export type VideoFit = "contain" | "cover";

export type ControlsVariant = "native" | "minimal" | "persistent";

export type VideoDataAttributes = {
  [key: `data-${string}`]: string | undefined;
};

export type VerticalVideoElementProps = Omit<
  VideoHTMLAttributes<HTMLVideoElement>,
  "children" | "className" | "controls" | "poster" | "preload" | "ref" | "src"
> &
  VideoDataAttributes;

export type VerticalVideoPlayerProps = {
  className?: string;
  controls?: boolean;
  controlsVariant?: ControlsVariant;
  fit?: VideoFit;
  fullscreenVariant?: "default" | "content";
  onContentClick?: () => void;
  onVideoElementReady?: (video: HTMLVideoElement | null) => void;
  poster?: string | null;
  preload?: "auto" | "metadata" | "none";
  src: string;
  style?: CSSProperties;
  title: string;
  videoClassName?: string;
  videoProps?: VerticalVideoElementProps;
};

export const fitClassName: Record<VideoFit, string> = {
  contain: "object-contain",
  cover: "object-cover",
};

export const formatVideoTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = String(totalSeconds % 60).padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
};

export const getReadableVideoDuration = (video: HTMLVideoElement) =>
  Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;

export const clampNumber = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const waitForVideoEvent = (
  video: HTMLVideoElement,
  eventName: keyof HTMLMediaElementEventMap,
) =>
  new Promise<void>((resolve) => {
    const timeout = window.setTimeout(() => {
      video.removeEventListener(eventName, handleEvent);
      resolve();
    }, 2500);

    const handleEvent = () => {
      window.clearTimeout(timeout);
      resolve();
    };

    video.addEventListener(eventName, handleEvent, {
      once: true,
    });
  });

export const MOBILE_FULLSCREEN_MEDIA_QUERY = "(max-width: 1023px)";

export const staticMobileContentFullscreenStyles = [
  ["position", "fixed"],
  ["inset", "0"],
  ["display", "block"],
  ["min-width", "0"],
  ["min-height", "0"],
  ["max-width", "100vw"],
  ["margin", "auto"],
  ["aspect-ratio", "9 / 16"],
  ["background", "var(--lectum-media-background)"],
  ["object-fit", "contain"],
  ["object-position", "center center"],
] as const;

export type StoredVideoStyle = {
  name: string;
  priority: string;
  value: string;
};
