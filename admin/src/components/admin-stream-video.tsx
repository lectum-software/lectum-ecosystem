"use client";

import { LoaderCircle } from "lucide-react";
import {
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAdminVideoAssetPlayback } from "@/api/callers/video-assets";
import { isAdminVideoAssetReference, resolveAdminMediaUrl } from "@/lib/admin-media";
import { cn } from "@/lib/utils";

const PLAYBACK_REFRESH_ADVANCE_MS = 2 * 60 * 1_000;

type AdminStreamVideoProps = Omit<ComponentPropsWithoutRef<"video">, "poster" | "src"> & {
  poster?: string | null;
  src: string;
  statusClassName?: string;
};

const assignForwardedRef = (
  ref: ForwardedRef<HTMLVideoElement>,
  value: HTMLVideoElement | null,
) => {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) ref.current = value;
};

export const AdminStreamVideo = forwardRef<HTMLVideoElement, AdminStreamVideoProps>(
  ({ className, poster, src, statusClassName, ...videoProps }, forwardedRef) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isStream = isAdminVideoAssetReference(src);
    const [activeStreamSource, setActiveStreamSource] = useState<string | null>(null);
    const streamPlaybackEnabled = !isStream || activeStreamSource === src;
    const playback = useAdminVideoAssetPlayback(isStream ? src : null, streamPlaybackEnabled);
    const refetchPlayback = playback.refetch;
    const playbackExpiresAt = new Date(playback.data?.expires_at ?? "").getTime();
    const hasFreshPlayback =
      Number.isFinite(playbackExpiresAt) && playbackExpiresAt > Date.now() + 15_000;
    const source = isStream
      ? streamPlaybackEnabled && hasFreshPlayback
        ? (playback.data?.hls_url ?? "")
        : ""
      : (resolveAdminMediaUrl(src) ?? "");
    const effectivePoster = isStream
      ? hasFreshPlayback
        ? (playback.data?.thumbnail_url ?? poster ?? undefined)
        : (poster ?? undefined)
      : (poster ?? undefined);
    const [failedSource, setFailedSource] = useState<string | null>(null);

    const setVideoRef = useCallback(
      (video: HTMLVideoElement | null) => {
        videoRef.current = video;
        assignForwardedRef(forwardedRef, video);
      },
      [forwardedRef],
    );

    useEffect(() => {
      if (!isStream) return;

      const video = videoRef.current;
      if (!video || typeof IntersectionObserver === "undefined") {
        setActiveStreamSource(src);
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => {
          setActiveStreamSource((current) => {
            if (entry?.isIntersecting) return src;
            return current === src ? null : current;
          });
        },
        { rootMargin: "300px 0px" },
      );
      observer.observe(video);

      return () => observer.disconnect();
    }, [isStream, src]);

    useEffect(() => {
      const expiresAt = playback.data?.expires_at;
      if (!isStream || !streamPlaybackEnabled || !expiresAt) return;

      const expiresAtMs = new Date(expiresAt).getTime();
      if (!Number.isFinite(expiresAtMs)) return;

      const timeout = window.setTimeout(
        () => void refetchPlayback(),
        Math.max(1_000, expiresAtMs - Date.now() - PLAYBACK_REFRESH_ADVANCE_MS),
      );

      return () => window.clearTimeout(timeout);
    }, [isStream, playback.data?.expires_at, refetchPlayback, streamPlaybackEnabled]);

    useEffect(() => {
      if (!isStream || !source) return;

      const video = videoRef.current;
      if (!video) return;

      let active = true;
      let destroyPlayer: (() => void) | null = null;
      let mediaRecoveryAttempts = 0;
      let networkRecoveryAttempts = 0;
      setFailedSource(null);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source;
        video.load();

        return () => {
          video.removeAttribute("src");
          video.load();
        };
      }

      void import("hls.js")
        .then(({ default: Hls }) => {
          if (!active) return;
          if (!Hls.isSupported()) {
            setFailedSource(source);
            return;
          }

          const player = new Hls({
            enableWorker: true,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
          });
          destroyPlayer = () => player.destroy();
          player.on(Hls.Events.ERROR, (_event, data) => {
            if (!data.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRecoveryAttempts < 1) {
              networkRecoveryAttempts += 1;
              player.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 1) {
              mediaRecoveryAttempts += 1;
              player.recoverMediaError();
              return;
            }

            setFailedSource(source);
            player.destroy();
          });
          player.loadSource(source);
          player.attachMedia(video);
        })
        .catch(() => {
          if (active) setFailedSource(source);
        });

      return () => {
        active = false;
        destroyPlayer?.();
        video.removeAttribute("src");
        video.load();
      };
    }, [isStream, source]);

    const isLoading = isStream && streamPlaybackEnabled && !playback.error && !hasFreshPlayback;
    const isUnavailable =
      (isStream &&
        Boolean((!hasFreshPlayback && playback.error) || (source && failedSource === source))) ||
      (!isStream && !source);

    return (
      <>
        <video
          {...videoProps}
          className={className}
          data-video-state={isLoading ? "loading" : isUnavailable ? "unavailable" : "ready"}
          poster={effectivePoster}
          ref={setVideoRef}
          src={isStream ? undefined : source}
        />
        {isLoading ? (
          <span
            className={cn(
              "pointer-events-none absolute inset-0 z-10 grid place-items-center bg-media-background/55 text-xs font-bold text-media-foreground",
              statusClassName,
            )}
          >
            <span className="flex items-center gap-2 rounded-full bg-media-background/75 px-3 py-2">
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
              Preparando vídeo
            </span>
          </span>
        ) : null}
        {isUnavailable ? (
          <span
            className={cn(
              "pointer-events-none absolute inset-0 z-10 grid place-items-center bg-media-background/75 px-4 text-center text-xs font-bold text-media-foreground",
              statusClassName,
            )}
          >
            Vídeo indisponível no momento.
          </span>
        ) : null}
      </>
    );
  },
);

AdminStreamVideo.displayName = "AdminStreamVideo";
