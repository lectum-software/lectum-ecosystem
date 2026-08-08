"use client";

import { Play, VolumeX, X } from "lucide-react";
import Image from "next/image";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { cn } from "@/lib/utils";
import { isPublicMediaUrl } from "@/utils/media";
import { VIDEO_PROGRESS_FILL_COLOR, VIDEO_PROGRESS_TRACK_COLOR } from "../../modules/onboarding";
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

  const { stopInteractionPropagation } = model.navigation;
  const { handleImmersiveExit, revealUiFromImmersiveVideo } = model.feed;

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
      key={psychologist.id}
    >
      <div className="absolute inset-0 overflow-hidden lg:inset-x-0 lg:top-[var(--psychologists-desktop-card-top)] lg:bottom-auto lg:h-[var(--psychologists-desktop-card-height)] lg:rounded-[22px] lg:bg-black">
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
              videoClassName="h-full w-full bg-black object-cover"
              videoProps={{
                "data-psychologist-id": psychologist.id,
                "data-psychologists-background": "true",
                autoPlay: isActiveSlide && !isVideoPaused,
                controlsList: "nodownload",
                loop: true,
                muted: isVideoMuted,
                onDurationChange: (event) => {
                  if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
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
              priority={index === 0}
              sizes="(min-width: 768px) 430px, 100vw"
              src={slidePosterSrc}
              unoptimized={isPublicMediaUrl(psychologist.video_cover_url)}
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[#e2e8f0] text-3xl font-extrabold text-[#94a3b8]">
              {getInitials(psychologist.name)}
            </div>
          )}

          <div
            className={cn(
              "pointer-events-none absolute inset-0 transition-opacity duration-200 ease-out",
              slideOverlayVisibilityClass,
            )}
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.7) 17%, rgba(0,0,0,0.42) 31%, rgba(0,0,0,0.16) 43%, rgba(0,0,0,0) 58%)",
            }}
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
              className="absolute top-1/2 left-1/2 z-20 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/35 bg-black/30 text-white shadow-[0_10px_30px_rgba(0,0,0,0.22)] backdrop-blur-sm transition hover:bg-black/40"
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
                "absolute z-50 flex h-6 items-end outline-none",
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
                  height: isActiveSlide && isVideoProgressSeeking ? "5px" : "3px",
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
              className="pointer-events-auto absolute left-4 z-[70] grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-black/55 text-white shadow-[0_12px_30px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:bg-black/65 active:scale-95"
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
              bottom: `calc(${metrics.navBarHeight}px + env(safe-area-inset-bottom))`,
              height: `${metrics.bioBottomOffset}px`,
            }}
          />

          <PsychologistSlideDetails model={model} slide={slide} />
        </div>
      </div>
    </section>
  );
};
