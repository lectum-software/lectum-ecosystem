import type { VerticalVideoPlayerProps } from "@/components/ui/vertical-video-player-support";
import { setVideoSoundEnabledByUser } from "@/lib/video-sound-preference";
import type { PsychologistsViewModel } from "../types";
import type { PsychologistSlideView } from "./slide-model";

export function buildSlideVideoProps(
  model: PsychologistsViewModel,
  slide: PsychologistSlideView,
): VerticalVideoPlayerProps {
  const { isActiveSlide, slideUsesNativeVideoControls, slideDisplayName, index, psychologist } =
    slide;
  const setup = model.setup;
  const { syncActiveVideoProgress, flushFeedVideoAnalytics } = model.analytics;
  return {
    directoryCaptions: true,
    className: "h-full w-full rounded-none border-0 shadow-none",
    controls: slideUsesNativeVideoControls,
    controlsVariant: slideUsesNativeVideoControls ? "persistent" : "native",
    persistentControlsVisibility: "always",
    onSoundEnabledChange: setVideoSoundEnabledByUser,
    fit: "cover",
    onContentClick: slideUsesNativeVideoControls
      ? model.feed.revealUiFromImmersiveVideo
      : undefined,
    poster: slide.slidePosterSrc || undefined,
    preload: isActiveSlide || index === setup.activePsychologistIndex + 1 ? "auto" : "metadata",
    src: slide.slideVideoSrc ?? "",
    title: `Vídeo de apresentação de ${slideDisplayName}`,
    videoClassName: "h-full w-full bg-media-background object-cover",
    videoProps: {
      "data-psychologist-id": psychologist.id,
      "data-psychologists-background": "true",
      "data-psychologists-slide-index": String(index),
      autoPlay: false,
      controlsList: "nodownload",
      loop: !model.directory.canSwipeBetweenPsychologists,
      muted: setup.isVideoMuted,
      onDurationChange: (event) => {
        if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
      },
      onEnded: (event) => {
        if (!isActiveSlide) return;
        setup.setIsVideoPaused(false);
        syncActiveVideoProgress(event.currentTarget);
        flushFeedVideoAnalytics(event.currentTarget, { completed: true, force: true });
        model.feed.advanceToNextPsychologistVideo();
      },
      onError: () => {
        if (isActiveSlide) setup.setIsVideoPlaybackFailed(true);
      },
      onLoadedData: () => {
        if (!isActiveSlide) return;
        setup.setIsVideoPlaybackFailed(false);
        setup.setIsVideoPaused(false);
        syncActiveVideoProgress();
      },
      onLoadedMetadata: (event) => {
        if (isActiveSlide) syncActiveVideoProgress(event.currentTarget);
      },
      onPause: (event) => {
        if (!isActiveSlide) return;
        setup.setIsVideoPaused(true);
        syncActiveVideoProgress();
        flushFeedVideoAnalytics(event.currentTarget, { force: true });
      },
      onPlay: () => {
        if (!isActiveSlide) return;
        setup.setIsVideoPaused(false);
        syncActiveVideoProgress();
      },
      onRateChange: (event) => {
        if (isActiveSlide) setup.setVideoPlaybackRate(event.currentTarget.playbackRate);
      },
      onTimeUpdate: (event) => {
        if (!isActiveSlide) return;
        syncActiveVideoProgress(event.currentTarget);
        flushFeedVideoAnalytics(event.currentTarget);
      },
      onVolumeChange: (event) => {
        if (!isActiveSlide) return;
        setup.setIsVideoMuted(event.currentTarget.muted);
        setup.setVideoVolume(event.currentTarget.volume);
      },
      tabIndex: slideUsesNativeVideoControls ? 0 : -1,
    },
  };
}
