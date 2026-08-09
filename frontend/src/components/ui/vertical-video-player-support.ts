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

const MAX_SEEK_FALLBACK_VIDEO_BYTES = 64 * 1024 * 1024;

export const fetchBoundedVideoBlob = async (source: string, signal: AbortSignal) => {
  const response = await fetch(source, {
    cache: "force-cache",
    signal,
  });

  if (!response.ok || !response.body) return null;

  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SEEK_FALLBACK_VIDEO_BYTES) {
    await response.body.cancel().catch(() => undefined);
    return null;
  }

  const contentType = response.headers.get("Content-Type")?.split(";", 1)[0]?.trim() || "";
  if (
    contentType &&
    !contentType.startsWith("video/") &&
    contentType !== "application/octet-stream"
  ) {
    await response.body.cancel().catch(() => undefined);
    return null;
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_SEEK_FALLBACK_VIDEO_BYTES) {
        await reader.cancel().catch(() => undefined);
        return null;
      }

      const chunk = new Uint8Array(value.byteLength);
      chunk.set(value);
      chunks.push(chunk.buffer);
    }
  } finally {
    reader.releaseLock();
  }

  if (signal.aborted || receivedBytes === 0) return null;

  return new Blob(chunks, {
    type: contentType,
  });
};

export const waitForVideoEvent = (
  video: HTMLVideoElement,
  eventName: keyof HTMLMediaElementEventMap,
  signal?: AbortSignal,
) =>
  new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) return;

      settled = true;
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, finish);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    const timeout = window.setTimeout(() => {
      finish();
    }, 2500);

    if (signal?.aborted) {
      finish();
      return;
    }

    video.addEventListener(eventName, finish, {
      once: true,
    });
    signal?.addEventListener("abort", finish, { once: true });
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
