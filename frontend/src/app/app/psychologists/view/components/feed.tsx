"use client";

import { type ReactNode, useCallback, useLayoutEffect } from "react";
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
        {slides.map(({ index, psychologist }) =>
          pooled && Math.abs(index - model.setup.activePsychologistIndex) > 1 ? (
            <section
              key={`${psychologist.id}:${index}`}
              data-psychologists-slide-index={index}
              aria-hidden
              className="relative h-[100dvh] w-full snap-start snap-always overflow-hidden lg:h-[var(--psychologists-desktop-slide-height)] lg:overflow-visible"
            />
          ) : (
            <PsychologistSlide
              index={index}
              key={`${psychologist.id}:${index}`}
              model={model}
              psychologist={psychologist}
            />
          ),
        )}
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
  const {
    feedRef: sharedRef,
    onScroll,
    scrollTo,
  } = useFeedVideoScroll({
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
  const scrollRef = setup.feedVideoScrollRef;
  useLayoutEffect(() => {
    const commands = { scrollTo };
    scrollRef.current = commands;
    return () => {
      if (scrollRef.current === commands) scrollRef.current = null;
    };
  });
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
      onScroll={onScroll}
      onPointerDownCapture={onboarding.registerSwipeHintInteraction}
      onWheelCapture={onboarding.registerSwipeHintInteraction}
    >
      {children}
    </div>
  );
}
