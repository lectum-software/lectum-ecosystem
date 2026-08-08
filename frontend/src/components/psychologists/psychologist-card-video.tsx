"use client";

import { Pause, Play, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { playVideoWithSound } from "@/lib/video-playback";

import {
  globalSoundEnabled,
  setGlobalSoundEnabled,
  subscribeAudioPreference,
} from "./psychologist-card-support";

export const CardVideo = ({
  name,
  poster,
  url,
}: {
  name: string;
  poster?: string | null;
  url: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [focused, setFocused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(globalSoundEnabled);
  const [controlMode, setControlMode] = useState<"hidden" | "media">(
    globalSoundEnabled ? "hidden" : "media",
  );
  const [videoPoster, setVideoPoster] = useState<string | null>(null);
  const posterExtractionStarted = useRef(false);
  const userInitiatedPlayRef = useRef(false);
  const controlsAutoHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearControlsAutoHideTimeout = useCallback(() => {
    if (controlsAutoHideTimeoutRef.current) {
      clearTimeout(controlsAutoHideTimeoutRef.current);
      controlsAutoHideTimeoutRef.current = null;
    }
  }, []);

  const onPlay = () => {
    if (userInitiatedPlayRef.current) {
      setControlMode("hidden");
      userInitiatedPlayRef.current = false;
    }

    setPlaying(true);
  };

  const onPause = () => {
    clearControlsAutoHideTimeout();
    setPlaying(false);
  };

  const onEnded = () => {
    clearControlsAutoHideTimeout();
    setPlaying(false);
  };

  const unmuteVideo = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;
    if (soundEnabled && !currentVideo.muted && currentVideo.volume > 0) return;

    setControlMode("hidden");

    setSoundEnabled(true);
    setGlobalSoundEnabled(true);
    clearControlsAutoHideTimeout();

    userInitiatedPlayRef.current = true;
    void playVideoWithSound(currentVideo);
  };

  const togglePlayback = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    if (currentVideo.paused) {
      userInitiatedPlayRef.current = true;
      setControlMode("hidden");
      clearControlsAutoHideTimeout();
      void playVideoWithSound(currentVideo);
    } else {
      clearControlsAutoHideTimeout();
      currentVideo.pause();
    }
  };

  const handleVideoTap = () => {
    togglePlayback();
  };

  const handleVideoPosterExtraction = () => {
    const currentVideo = videoRef.current;
    if (!currentVideo || videoPoster || posterExtractionStarted.current) return;
    if (
      currentVideo.readyState < 1 ||
      !Number.isFinite(currentVideo.duration) ||
      currentVideo.duration <= 0
    )
      return;

    posterExtractionStarted.current = true;
    const currentTime = currentVideo.currentTime;
    const wasPlaying = !currentVideo.paused;
    const captureTime =
      currentVideo.duration > 1 ? 0.1 : Math.max(0.001, currentVideo.duration * 0.3);
    const restorePlayback = () => {
      if (Number.isFinite(currentTime)) {
        try {
          currentVideo.currentTime = currentTime;
        } catch {
          // ignore
        }
      }

      if (wasPlaying) {
        void currentVideo.play().catch(() => {});
      }
    };

    const onSeeked = () => {
      currentVideo.removeEventListener("seeked", onSeeked);
      posterExtractionStarted.current = false;

      try {
        const width = currentVideo.videoWidth;
        const height = currentVideo.videoHeight;

        if (!width || !height) return;

        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) return;

        canvas.width = width;
        canvas.height = height;
        context.drawImage(currentVideo, 0, 0, width, height);

        const nextPoster = canvas.toDataURL("image/jpeg", 0.74);
        setVideoPoster(nextPoster);
      } catch {
        // Ignore when browser/CORS restrictions prevent poster extraction.
      } finally {
        restorePlayback();
      }
    };

    currentVideo.addEventListener("seeked", onSeeked, { once: true });
    currentVideo.currentTime = captureTime;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(0);
        const ratio = entry?.intersectionRatio ?? 0;
        const nextFocused = Boolean(entry?.isIntersecting) && ratio >= 0.35;

        setFocused(nextFocused);
        setControlMode(nextFocused ? "media" : "hidden");
      },
      {
        threshold: [0, 0.35],
      },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return subscribeAudioPreference(setSoundEnabled);
  }, []);

  useEffect(() => {
    return () => {
      clearControlsAutoHideTimeout();
    };
  }, [clearControlsAutoHideTimeout]);

  useEffect(() => {
    const currentVideo = videoRef.current;
    if (!currentVideo) return;

    currentVideo.muted = !soundEnabled;

    if (!focused) {
      currentVideo.pause();
      return;
    }

    void currentVideo.play().catch(() => {
      setPlaying(false);
    });
  }, [focused, soundEnabled]);

  const showPlaybackControls = controlMode === "media";

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-surface-muted">
      <button
        aria-label={`Abrir controles do vídeo de ${name}`}
        className="absolute inset-0 z-[5] h-full w-full cursor-default border-0 bg-transparent p-0"
        onClick={handleVideoTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleVideoTap();
          }
        }}
        type="button"
      />
      <video
        aria-label={`Vídeo de apresentação de ${name}`}
        className="pointer-events-none h-full w-full bg-media-background object-cover object-top"
        controls={false}
        loop
        muted
        crossOrigin="anonymous"
        onLoadedMetadata={handleVideoPosterExtraction}
        poster={videoPoster || poster || undefined}
        onPause={onPause}
        onPlay={onPlay}
        onEnded={onEnded}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={url}
      />

      {focused && showPlaybackControls && (
        <div className="absolute left-1/2 top-[46%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-4">
          {!soundEnabled ? (
            <button
              aria-label={`Desmutar o vídeo de ${name}`}
              className="z-10 grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-media-foreground bg-media-background/25"
              onClick={(event) => {
                event.stopPropagation();
                unmuteVideo();
              }}
              type="button"
            >
              <VolumeX aria-hidden="true" className="ml-[1px] h-6 w-6 text-primary-foreground/90" />
            </button>
          ) : (
            <button
              aria-label={playing ? "Pausar vídeo" : "Retomar vídeo"}
              className="z-10 grid h-[52px] w-[52px] place-items-center rounded-full border-4 border-media-foreground bg-media-background/25"
              onClick={(event) => {
                event.stopPropagation();
                togglePlayback();
              }}
              type="button"
            >
              {playing ? (
                <Pause aria-hidden="true" className="h-6 w-6 text-primary-foreground/90" />
              ) : (
                <Play aria-hidden="true" className="ml-[1px] h-6 w-6 text-primary-foreground/90" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
