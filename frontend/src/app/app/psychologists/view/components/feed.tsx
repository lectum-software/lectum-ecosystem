"use client";

import { cn } from "@/lib/utils";
import type { PsychologistsViewModel } from "../types";
import { PsychologistSlide } from "./slide";

export const PsychologistsFeed = ({ model }: { model: PsychologistsViewModel }) => {
  const { feedContainerRef, isSearchFocused, isVideoProgressSeeking } = model.setup;

  const { registerSwipeHintInteraction } = model.onboarding;

  const { handleFeedScroll } = model.feed;

  const { psychologists } = model.directory;
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
      {psychologists.map((psychologist, index) => (
        <PsychologistSlide
          index={index}
          key={psychologist.id}
          model={model}
          psychologist={psychologist}
        />
      ))}
    </div>
  );
};
