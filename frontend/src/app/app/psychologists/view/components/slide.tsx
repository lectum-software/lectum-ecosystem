"use client";

import { Play, VolumeX, X } from "lucide-react";
import Image from "next/image";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl } from "@/utils/media";
import {
  MOBILE_BOTTOM_NAV_OFFSET,
  VIDEO_PROGRESS_FILL_COLOR,
  VIDEO_PROGRESS_TRACK_COLOR,
} from "../../modules/onboarding";
import { getInitials } from "../../modules/profile-format";
import type { PsychologistsViewModel } from "../types";
import { PsychologistSlideDetails } from "./slide-details";
import { PsychologistSlideHeader } from "./slide-header";
import { buildPsychologistSlideView } from "./slide-model";

export const PsychologistSlide = ({
  index,
  model,
  psychologist,
}: {
  index: number;
  model: PsychologistsViewModel;
  psychologist: DirectoryPsychologist;
}) => {
  const {
    isLongPressing,
    isVideoMuted,
    isVideoPaused,
    isVideoProgressSeeking,
    metrics,
    progressFillRef,
    progressTrackRef,
    setIsVideoMuted,
    setIsVideoPaused,
    setIsVideoPlaybackFailed,
    setVideoPlaybackRate,
    setVideoVolume,
    shouldNudgeSwipeCard,
    videoProgress,
  } = model.setup;
  const { shouldRenderGlobalControls } = model.derived;
  const { canSwipeBetweenPsychologists } = model.directory;

  const { stopInteractionPropagation } = model.navigation;
  const { advanceToNextPsychologistVideo, handleImmersiveExit, revealUiFromImmersiveVideo } =
    model.feed;

  const { flushFeedVideoAnalytics, syncActiveVideoProgress } = model.analytics;

  const {
    handleLongPressEnd,
    handleLongPressMove,
    handleLongPressStart,
    handleVideoAreaTap,
    handleVideoControlTap,
    handleVideoProgressKeyDown,
    handleVideoProgressPointerDown,
    handleVideoProgressPointerEnd,
    handleVideoProgressPointerMove,
    handleVideoProgressTouchEnd,
    handleVideoProgressTouchMove,
    handleVideoProgressTouchStart,
  } = model.gestures;
  const slide = buildPsychologistSlideView({ index, model, psychologist });
  const {
    isActiveSlide,
    slideVideoSrc,
    slidePosterSrc,
    slideShouldShowVideo,
    slideIsUiHidden,
    slideUsesNativeVideoControls,
    slideShouldRenderProgress,
    slideUiVisibilityClass,
    slideOverlayVisibilityClass,
    slideProgressRatio,
    slideProgressBottom,
    slideCanSeekProgress,
    slideVideoAreaLabel,
  } = slide;

  return (
    <section
      aria-label={`Psicólogo ${psychologist.name}`}
      className={cn(
        "relative h-[100dvh] w-full snap-start snap-always overflow-hidden lg:h-[var(--psychologists-desktop-slide-height)] lg:overflow-visible",
        isActiveSlide && shouldNudgeSwipeCard ? "psychologists-swipe-nudge" : null,
      )}
      data-psychologists-slide-index={index}
    >
      <div className="absolute inset-0 overflow-hidden lg:inset-x-0 lg:top-[var(--psychologists-desktop-card-top)] lg:bottom-auto lg:h-[var(--psychologists-desktop-card-height)] lg:rounded-[22px] lg:bg-media-background">
        <div className="relative h-full w-full overflow-hidden">
          {shouldRenderGlobalControls ? (
            <PsychologistSlideHeader model={model} slide={slide} />
          ) : null}
          {slideShouldShowVideo ? (
            <VerticalVideoPlayer
              className="h-full w-full rounded-none border-0 shadow-none"
              controls={slideUsesNativeVideoControls}
              controlsVariant={slideUsesNativeVideoControls ? "persistent" : "native"}
              fit="cover"
              onContentClick={slideUsesNativeVideoControls ? revealUiFromImmersiveVideo : undefined}
              poster={slidePosterSrc || undefined}
              preload={isActiveSlide ? "auto" : "metadata"}
              src={slideVideoSrc ?? ""}
              title={`Vídeo de apresentação de ${psychologist.name}`}
              videoClassName="h-full w-full bg-media-background object-cover"
              videoProps={{
                "data-psychologist-id": psychologist.id,
                "data-psychologists-background": "true",
                "data-psychologists-slide-index": String(index),
                autoPlay: isActiveSlide && !isVideoPaused,
                controlsList: "nodownload",
                loop: !canSwipeBetweenPsychologists,
                muted: isVideoMuted,
                onDurationChange: (event) => {
                  if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                },
                onEnded: (event) => {
                  if (!isActiveSlide) return;

                  setIsVideoPaused(false);
                  syncActiveVideoProgress(event.currentTarget);
                  flushFeedVideoAnalytics(event.currentTarget, {
                    completed: true,
                    force: true,
                  });
                  advanceToNextPsychologistVideo();
                },
                onError: () => {
                  if (isActiveSlide) setIsVideoPlaybackFailed(true);
                },
                onLoadedData: () => {
                  if (!isActiveSlide) return;

                  setIsVideoPlaybackFailed(false);
                  setIsVideoPaused(false);
                  syncActiveVideoProgress();
                },
                onLoadedMetadata: (event) => {
                  if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
                },
                onPause: (event) => {
                  if (!isActiveSlide) return;

                  setIsVideoPaused(true);
                  syncActiveVideoProgress();
                  flushFeedVideoAnalytics(event.currentTarget, {
                    force: true,
                  });
                },
                onPlay: () => {
                  if (!isActiveSlide) return;

                  setIsVideoPaused(false);
                  syncActiveVideoProgress();
                },
                onRateChange: (event) => {
                  if (!isActiveSlide) return;

                  setVideoPlaybackRate(event.currentTarget.playbackRate);
                },
                onTimeUpdate: (event) => {
                  if (!isActiveSlide) return;

                  syncActiveVideoProgress(event.currentTarget);
                  flushFeedVideoAnalytics(event.currentTarget);
                },
                onVolumeChange: (event) => {
                  if (!isActiveSlide) return;

                  setIsVideoMuted(event.currentTarget.muted);
                  setVideoVolume(event.currentTarget.volume);
                },
                tabIndex: slideUsesNativeVideoControls ? 0 : -1,
              }}
            />
          ) : slidePosterSrc ? (
            <Image
              alt={psychologist.name}
              className="h-full w-full object-cover"
              fill
              priority={isActiveSlide}
              sizes="(min-width: 768px) 430px, 100vw"
              src={slidePosterSrc}
              unoptimized={isPublicMediaUrl(psychologist.video_cover_url)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-surface-muted text-3xl font-extrabold text-subtle">
              {getInitials(psychologist.name)}
            </div>
          )}

          <div
            className={cn(
              "media-bottom-overlay pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
              slideOverlayVisibilityClass,
            )}
          />

          <button
            aria-hidden={slideUsesNativeVideoControls ? true : undefined}
            aria-label={slideVideoAreaLabel}
            className={cn(
              "absolute inset-0 z-10 h-full w-full cursor-default border-0 bg-transparent p-0",
              slideUsesNativeVideoControls && "pointer-events-none",
            )}
            disabled={slideUsesNativeVideoControls}
            onClick={
              isActiveSlide
                ? () => handleVideoAreaTap(psychologist, slideIsUiHidden)
                : stopInteractionPropagation
            }
            onPointerCancel={isActiveSlide ? handleLongPressEnd : undefined}
            onPointerDown={isActiveSlide ? handleLongPressStart : undefined}
            onPointerLeave={isActiveSlide ? handleLongPressEnd : undefined}
            onPointerMove={isActiveSlide ? handleLongPressMove : undefined}
            onPointerUp={isActiveSlide ? handleLongPressEnd : undefined}
            tabIndex={slideUsesNativeVideoControls ? -1 : undefined}
            type="button"
          />

          {isActiveSlide &&
          slideShouldShowVideo &&
          !slideIsUiHidden &&
          !isLongPressing &&
          !isVideoProgressSeeking &&
          (isVideoMuted || isVideoPaused) ? (
            <button
              aria-label={
                isVideoPaused
                  ? `Retomar vídeo de ${psychologist.name}`
                  : `Ativar som do vídeo de ${psychologist.name}`
              }
              className="absolute top-1/2 left-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-media-foreground/35 bg-media-background/30 text-primary-foreground shadow-lectum-soft backdrop-blur-sm transition hover:bg-media-background/40"
              onClick={handleVideoControlTap}
              type="button"
            >
              {isVideoPaused ? (
                <Play className="ml-0.5 h-5 w-5" aria-hidden="true" />
              ) : isVideoMuted ? (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              ) : null}
            </button>
          ) : null}

          {slideShouldRenderProgress ? (
            <div
              aria-label={`Progresso do vídeo de ${psychologist.name}`}
              aria-valuemax={isActiveSlide ? Math.round(videoProgress.duration) : 0}
              aria-valuemin={0}
              aria-valuenow={isActiveSlide ? Math.round(videoProgress.currentTime) : 0}
              className={cn(
                "absolute z-50 flex h-7 items-end outline-none",
                slideCanSeekProgress ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
              )}
              data-psychologists-scroll-lock="true"
              onClick={slideCanSeekProgress ? stopInteractionPropagation : undefined}
              onKeyDown={slideCanSeekProgress ? handleVideoProgressKeyDown : undefined}
              onPointerCancel={slideCanSeekProgress ? handleVideoProgressPointerEnd : undefined}
              onPointerDown={slideCanSeekProgress ? handleVideoProgressPointerDown : undefined}
              onPointerMove={slideCanSeekProgress ? handleVideoProgressPointerMove : undefined}
              onPointerUp={slideCanSeekProgress ? handleVideoProgressPointerEnd : undefined}
              onTouchCancel={slideCanSeekProgress ? handleVideoProgressTouchEnd : undefined}
              onTouchEnd={slideCanSeekProgress ? handleVideoProgressTouchEnd : undefined}
              onTouchMove={slideCanSeekProgress ? handleVideoProgressTouchMove : undefined}
              onTouchStart={slideCanSeekProgress ? handleVideoProgressTouchStart : undefined}
              ref={(node) => {
                if (isActiveSlide) {
                  progressTrackRef.current = node;
                } else if (progressTrackRef.current === node) {
                  progressTrackRef.current = null;
                }
              }}
              role="slider"
              style={{
                bottom: slideProgressBottom,
                left: 0,
                right: 0,
                touchAction: "none",
              }}
              tabIndex={slideCanSeekProgress ? 0 : -1}
            >
              <div
                className="relative w-full overflow-hidden transition-[height] duration-150 ease-out"
                style={{
                  backgroundColor: VIDEO_PROGRESS_TRACK_COLOR,
                  boxShadow:
                    "0 0 14px color-mix(in srgb, var(--lectum-media-foreground) 28%, transparent)",
                  height: isActiveSlide && isVideoProgressSeeking ? "6px" : "4px",
                }}
              >
                <div
                  className={cn(
                    "h-full origin-left",
                    isActiveSlide && isVideoProgressSeeking
                      ? null
                      : "transition-transform duration-75 ease-linear",
                  )}
                  ref={(node) => {
                    if (isActiveSlide) {
                      progressFillRef.current = node;

                      if (node) {
                        node.style.transform = `scaleX(${slideProgressRatio})`;
                      }
                    } else if (progressFillRef.current === node) {
                      progressFillRef.current = null;
                    }
                  }}
                  style={{
                    backgroundColor: VIDEO_PROGRESS_FILL_COLOR,
                    transform: `scaleX(${slideProgressRatio})`,
                    willChange: "transform",
                    width: "100%",
                  }}
                />
              </div>
            </div>
          ) : null}

          {isActiveSlide && slideShouldShowVideo && slideIsUiHidden ? (
            <button
              aria-label="Mostrar interface do video"
              className="pointer-events-auto absolute left-4 z-[70] grid h-12 w-12 place-items-center rounded-full border border-media-foreground/10 bg-media-background/55 text-primary-foreground shadow-lectum-soft backdrop-blur-md transition hover:bg-media-background/65 active:scale-95"
              data-psychologists-scroll-lock="true"
              onClick={handleImmersiveExit}
              onPointerDown={stopInteractionPropagation}
              style={{
                top: "calc(env(safe-area-inset-top) + 16px)",
              }}
              type="button"
            >
              <X className="h-6 w-6" aria-hidden="true" strokeWidth={2.3} />
            </button>
          ) : null}

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-auto absolute inset-x-0 z-[35] transition-opacity duration-200 ease-out",
              slideUiVisibilityClass,
            )}
            style={{
              bottom: metrics.isDesktopLayout ? "0px" : MOBILE_BOTTOM_NAV_OFFSET,
              height: `${metrics.bioBottomOffset}px`,
            }}
          />

          <PsychologistSlideDetails model={model} slide={slide} />
        </div>
      </div>
    </section>
  );
};
