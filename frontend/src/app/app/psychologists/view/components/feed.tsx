"use client";

import { type ReactNode, useCallback } from "react";
import { useFeedVideoScroll } from "@/components/ui/use-feed-video-scroll";
import { cn } from "@/lib/utils";
import { useDirectoryPlayerPoolEnabled } from "../../modules/directory-player-mode";
import {
  buildPsychologistsFeedSlides,
  getPsychologistsFeedCycleCountForIndex,
} from "../../modules/feed-loop";
import type { PsychologistsViewModel } from "../types";
import { DirectoryPlayerExperiment } from "./directory-player-pool";
import { PsychologistSlide } from "./slide";

export const PsychologistsFeed = ({ model }: { model: PsychologistsViewModel }) => {
  const pooled = useDirectoryPlayerPoolEnabled();
  const { feedLoopCycleCount } = model.setup;

  const { canLoopPsychologistsFeed, psychologists } = model.directory;
  const slides = buildPsychologistsFeedSlides(
    psychologists,
    feedLoopCycleCount,
    canLoopPsychologistsFeed,
  );

  return (
    <DirectoryPlayerExperiment model={model} slides={slides}>
      <FeedContainer pooled={pooled} model={model} count={slides.length}>
        {slides.map(({ index, psychologist }) => (
          <PsychologistSlide
            index={index}
            key={`${psychologist.id}:${index}`}
            model={model}
            psychologist={psychologist}
          />
        ))}
      </FeedContainer>
    </DirectoryPlayerExperiment>
  );
};

function FeedContainer({
  pooled,
  model,
  count,
  children,
}: {
  pooled: boolean;
  model: PsychologistsViewModel;
  count: number;
  children: ReactNode;
}) {
  if (pooled)
    return (
      <SharedFeedContainer model={model} count={count}>
        {children}
      </SharedFeedContainer>
    );
  const { isSearchFocused, isVideoProgressSeeking, feedContainerRef } = model.setup;
  const { registerSwipeHintInteraction } = model.onboarding;
  return (
    <div
      className={cn(
        "psychologists-video-feed h-full w-full snap-y snap-mandatory overscroll-contain lg:h-[100dvh]",
        isSearchFocused || isVideoProgressSeeking ? "overflow-hidden" : "overflow-y-auto",
      )}
      onPointerDownCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
      onScroll={isSearchFocused ? undefined : model.feed.handleFeedScroll}
      onWheelCapture={isSearchFocused ? undefined : registerSwipeHintInteraction}
      ref={feedContainerRef}
    >
      {children}
    </div>
  );
}

function SharedFeedContainer({
  model,
  count,
  children,
}: {
  model: PsychologistsViewModel;
  count: number;
  children: ReactNode;
}) {
  const { setup, directory, onboarding } = model;
  const {
    activePsychologistIndex,
    isSearchFocused,
    isFiltersOpen,
    isVideoProgressSeeking,
    feedLoopCycleCount,
    setFeedLoopCycleCount,
    setActivePsychologistIndex,
    feedContainerRef: containerRef,
  } = setup;
  const scroll = useFeedVideoScroll({
    index: activePsychologistIndex,
    count,
    locked: isSearchFocused || isFiltersOpen || isVideoProgressSeeking,
    slideAttribute: "data-psychologists-slide-index",
    onSelect: (index) => {
      setFeedLoopCycleCount(
        getPsychologistsFeedCycleCountForIndex({
          canLoop: directory.canLoopPsychologistsFeed,
          currentCycleCount: feedLoopCycleCount,
          index,
          psychologistsCount: directory.psychologists.length,
        }),
      );
      onboarding.markSwipeHintSeen();
      setActivePsychologistIndex(index);
    },
  });
  const sharedRef = scroll.feedRef;
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      sharedRef(node);
    },
    [containerRef, sharedRef],
  );
  return (
    <div
      ref={ref}
      className="psychologists-video-feed h-full w-full snap-y snap-mandatory overflow-y-auto overscroll-contain lg:h-[100dvh]"
      onScroll={scroll.onScroll}
      onPointerDownCapture={onboarding.registerSwipeHintInteraction}
      onWheelCapture={onboarding.registerSwipeHintInteraction}
    >
      {children}
    </div>
  );
}
