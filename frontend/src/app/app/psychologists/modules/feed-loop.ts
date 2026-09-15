import type { DirectoryPsychologist } from "@/api/generator/types/directory";

export const PSYCHOLOGISTS_FEED_INITIAL_LOOP_CYCLES = 3;
export const PSYCHOLOGISTS_FEED_MIN_CYCLES_AHEAD = 1;

export type PsychologistFeedSlide = {
  index: number;
  psychologist: DirectoryPsychologist;
  psychologistIndex: number;
};

export const getPsychologistsFeedLoopCycleCount = (
  psychologistsCount: number,
  loopCycleCount: number,
) => {
  if (psychologistsCount <= 1) return 1;

  return Math.max(PSYCHOLOGISTS_FEED_INITIAL_LOOP_CYCLES, Math.ceil(loopCycleCount));
};

export const getPsychologistsFeedCycleCountForIndex = ({
  currentCycleCount,
  index,
  psychologistsCount,
}: {
  currentCycleCount: number;
  index: number;
  psychologistsCount: number;
}) => {
  if (psychologistsCount <= 1) return 1;

  const targetCycle = Math.floor(Math.max(0, index) / psychologistsCount);

  return Math.max(
    getPsychologistsFeedLoopCycleCount(psychologistsCount, currentCycleCount),
    targetCycle + 1 + PSYCHOLOGISTS_FEED_MIN_CYCLES_AHEAD,
  );
};

export const getPsychologistsFeedSlideCount = (
  psychologistsCount: number,
  loopCycleCount = PSYCHOLOGISTS_FEED_INITIAL_LOOP_CYCLES,
) => {
  if (psychologistsCount <= 1) return Math.max(0, psychologistsCount);

  return (
    psychologistsCount * getPsychologistsFeedLoopCycleCount(psychologistsCount, loopCycleCount)
  );
};

export const getPsychologistFeedRealIndex = (index: number, psychologistsCount: number) => {
  if (psychologistsCount <= 0) return 0;

  const remainder = index % psychologistsCount;
  return remainder >= 0 ? remainder : remainder + psychologistsCount;
};

export const clampPsychologistFeedSlideIndex = (
  index: number,
  psychologistsCount: number,
  loopCycleCount = PSYCHOLOGISTS_FEED_INITIAL_LOOP_CYCLES,
) => {
  const slideCount = getPsychologistsFeedSlideCount(psychologistsCount, loopCycleCount);
  if (slideCount <= 0) return 0;

  return Math.max(0, Math.min(slideCount - 1, index));
};

export const buildPsychologistsFeedSlides = (
  psychologists: DirectoryPsychologist[],
  loopCycleCount = PSYCHOLOGISTS_FEED_INITIAL_LOOP_CYCLES,
): PsychologistFeedSlide[] => {
  if (psychologists.length <= 1) {
    return psychologists.map((psychologist, index) => ({
      index,
      psychologist,
      psychologistIndex: index,
    }));
  }

  return Array.from(
    { length: getPsychologistsFeedSlideCount(psychologists.length, loopCycleCount) },
    (_, index) => {
      const psychologistIndex = getPsychologistFeedRealIndex(index, psychologists.length);

      return {
        index,
        psychologist: psychologists[psychologistIndex],
        psychologistIndex,
      };
    },
  );
};
