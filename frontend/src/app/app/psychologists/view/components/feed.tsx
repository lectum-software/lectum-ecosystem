"use client";

import { cn } from "@/lib/utils";
import { buildPsychologistsFeedSlides } from "../../modules/feed-loop";
import type { PsychologistsViewModel } from "../types";
import { PsychologistSlide } from "./slide";

export const PsychologistsFeed = ({ model }: { model: PsychologistsViewModel }) => {
  const { feedContainerRef, feedLoopCycleCount, isSearchFocused, isVideoProgressSeeking } =
    model.setup;

  const { registerSwipeHintInteraction } = model.onboarding;

  const { handleFeedScroll } = model.feed;

  const { psychologists } = model.directory;
  const slides = buildPsychologistsFeedSlides(psychologists, feedLoopCycleCount);

  return (
    <div
      className={cn(
        "psychologists-video-feed h-full w-full snap-y snap-mandatory overscroll-contain lg:h-[100dvh]",
        isSearchFocused || isVideoProgressSeeking ? "overflow-hidden" : "overflow-y-auto",
      )}
      onPointerDownCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
      onScroll={isSearchFocused ? undefined : handleFeedScroll}
      onWheelCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
      ref={feedContainerRef}
    >
      {slides.map(({ index, psychologist }) => (
        <PsychologistSlide
          index={index}
          key={`${psychologist.id}:${index}`}
          model={model}
          psychologist={psychologist}
        />
      ))}
    </div>
  );
};
