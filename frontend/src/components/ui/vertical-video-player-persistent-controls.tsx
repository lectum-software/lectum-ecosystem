import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { KeyboardEventHandler, PointerEventHandler, Ref, RefObject } from "react";
import { useContentVideoProgress } from "../community/use-content-video-progress";
import { formatVideoTime, type PersistentControlsLayout } from "./vertical-video-player-support";

type VerticalVideoPlayerPersistentControlsProps = {
  captionControlRef?: Ref<HTMLSpanElement>;
  videoRef: RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  hidden?: boolean;
  isMuted: boolean;
  isPaused: boolean;
  layout?: PersistentControlsLayout;
  fullscreenActive?: boolean;
  onFullscreen?: () => void;
  onInteraction?: () => void;
  onMuteToggle: () => void;
  onPlayPause: () => void;
  onProgressKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onProgressPointerDown: PointerEventHandler<HTMLDivElement>;
  onProgressPointerEnd: PointerEventHandler<HTMLDivElement>;
  onProgressPointerMove: PointerEventHandler<HTMLDivElement>;
  progressRatio: number;
  progressTrackRef: Ref<HTMLDivElement>;
  title: string;
};

export const VerticalVideoPlayerPersistentControls = ({
  captionControlRef,
  videoRef,
  currentTime,
  duration,
  hidden = false,
  isMuted,
  isPaused,
  layout = "stacked",
  fullscreenActive = false,
  onFullscreen,
  onInteraction,
  onMuteToggle,
  onPlayPause,
  onProgressKeyDown,
  onProgressPointerDown,
  onProgressPointerEnd,
  onProgressPointerMove,
  progressRatio,
  progressTrackRef,
  title,
}: VerticalVideoPlayerPersistentControlsProps) => {
  const progressFill = useContentVideoProgress(
    videoRef,
    layout === "progress" && !isPaused,
    currentTime,
    duration,
  );
  const progressSlider = (
    <div
      aria-label={`Progresso do vídeo: ${title}`}
      aria-valuemax={Math.round(duration)}
      aria-valuemin={0}
      aria-valuenow={Math.round(currentTime)}
      className="relative flex h-7 w-full cursor-pointer items-center outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/70"
      onKeyDown={onProgressKeyDown}
      onPointerCancel={onProgressPointerEnd}
      onPointerDown={onProgressPointerDown}
      onPointerMove={onProgressPointerMove}
      onPointerUp={onProgressPointerEnd}
      ref={progressTrackRef}
      role="slider"
      tabIndex={hidden ? -1 : 0}
      style={{ touchAction: "none" }}
    >
      <span
        aria-hidden="true"
        className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-media-background/35"
      />
      <span
        aria-hidden="true"
        className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface"
        style={{ width: `${progressRatio * 100}%` }}
      />
      <span
        aria-hidden="true"
        className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface shadow-lectum-soft"
        style={{ left: `${progressRatio * 100}%` }}
      />
    </div>
  );

  if (layout === "progress") {
    return (
      <div
        className="absolute inset-x-0 z-[3] h-7 w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-media-foreground"
        data-lectum-video-player-controls="true"
        style={{ bottom: "env(safe-area-inset-bottom, 0px)", touchAction: "none" }}
        aria-label={`Progresso do vídeo: ${title}`}
        aria-valuemax={Math.round(duration)}
        aria-valuemin={0}
        aria-valuenow={Math.round(currentTime)}
        role="slider"
        tabIndex={0}
        ref={progressTrackRef}
        onKeyDown={onProgressKeyDown}
        onPointerCancel={onProgressPointerEnd}
        onPointerDown={onProgressPointerDown}
        onPointerMove={onProgressPointerMove}
        onPointerUp={onProgressPointerEnd}
      >
        <div
          className="absolute bottom-0 h-1 w-full overflow-hidden bg-media-foreground/35"
          aria-hidden="true"
        >
          <span
            className="block h-full w-full origin-left bg-media-foreground"
            ref={progressFill}
          />
        </div>
      </div>
    );
  }

  if (layout === "media") {
    return (
      <div
        aria-hidden={hidden ? true : undefined}
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-media-background/88 via-media-background/44 to-transparent px-3 pt-12 text-primary-foreground transition-opacity duration-200 sm:px-4 ${hidden ? "opacity-0" : "opacity-100"}`}
        data-lectum-video-player-controls="true"
        onFocusCapture={onInteraction}
        onPointerDownCapture={onInteraction}
        onPointerMoveCapture={onInteraction}
        style={{
          paddingBottom: "var(--lectum-bottom-fixed-padding)",
        }}
      >
        <div
          className={`${hidden ? "pointer-events-none" : "pointer-events-auto"} [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.78))]`}
          style={{ touchAction: "none" }}
        >
          <div className="flex min-h-8 items-center gap-2">
            <span className="min-w-0 flex-1 text-[12px] font-semibold tabular-nums text-primary-foreground">
              {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
            </span>

            {captionControlRef ? <span ref={captionControlRef} /> : null}
            <button
              aria-label={isMuted ? `Ativar som do vídeo: ${title}` : `Mutar vídeo: ${title}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
              onClick={onMuteToggle}
              onPointerDown={(event) => event.stopPropagation()}
              tabIndex={hidden ? -1 : undefined}
              type="button"
            >
              {isMuted ? (
                <VolumeX className="h-[18px] w-[18px]" />
              ) : (
                <Volume2 className="h-[18px] w-[18px]" />
              )}
            </button>

            {onFullscreen ? (
              <button
                aria-label={`${fullscreenActive ? "Reduzir" : "Ampliar"} vídeo: ${title}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
                onClick={onFullscreen}
                onPointerDown={(event) => event.stopPropagation()}
                tabIndex={hidden ? -1 : undefined}
                type="button"
              >
                {fullscreenActive ? (
                  <Minimize2 className="h-[18px] w-[18px]" />
                ) : (
                  <Maximize2 className="h-[18px] w-[18px]" />
                )}
              </button>
            ) : null}
          </div>

          {progressSlider}
        </div>
      </div>
    );
  }

  return (
    <div
      aria-hidden={hidden ? true : undefined}
      className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-4 text-primary-foreground transition-opacity duration-200 ${hidden ? "opacity-0" : "opacity-100"}`}
      data-lectum-video-player-controls="true"
      onFocusCapture={onInteraction}
      onPointerDownCapture={onInteraction}
      onPointerMoveCapture={onInteraction}
      style={{
        paddingBottom: "var(--lectum-bottom-fixed-padding)",
      }}
    >
      <div
        className={`${hidden ? "pointer-events-none" : "pointer-events-auto"} [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.78))]`}
        style={{ touchAction: "none" }}
      >
        {progressSlider}

        <div className="flex items-center gap-2">
          <button
            aria-label={isPaused ? `Reproduzir vídeo: ${title}` : `Pausar vídeo: ${title}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
            onClick={onPlayPause}
            onPointerDown={(event) => event.stopPropagation()}
            tabIndex={hidden ? -1 : undefined}
            type="button"
          >
            {isPaused ? (
              <Play className="ml-0.5 h-[18px] w-[18px] fill-current" />
            ) : (
              <Pause className="h-[18px] w-[18px] fill-current" />
            )}
          </button>

          <span className="min-w-0 flex-1 text-[12px] font-semibold tabular-nums text-primary-foreground">
            {formatVideoTime(currentTime)} / {formatVideoTime(duration)}
          </span>

          {captionControlRef ? <span ref={captionControlRef} /> : null}
          <button
            aria-label={isMuted ? `Ativar som do vídeo: ${title}` : `Mutar vídeo: ${title}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-transparent text-primary-foreground transition hover:bg-media-foreground/10 active:scale-95"
            onClick={onMuteToggle}
            onPointerDown={(event) => event.stopPropagation()}
            tabIndex={hidden ? -1 : undefined}
            type="button"
          >
            {isMuted ? (
              <VolumeX className="h-[18px] w-[18px]" />
            ) : (
              <Volume2 className="h-[18px] w-[18px]" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
