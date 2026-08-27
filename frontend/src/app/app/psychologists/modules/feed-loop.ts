import type { DirectoryPsychologist } from "@/api/generator/types/directory";

export const PSYCHOLOGISTS_FEED_LOOP_CYCLES = 3;
export const PSYCHOLOGISTS_FEED_LOOP_ANCHOR_CYCLE = 1;

export type PsychologistFeedSlide = {
  index: number;
  psychologist: DirectoryPsychologist;
  psychologistIndex: number;
};

export const getPsychologistsFeedSlideCount = (psychologistsCount: number) => {
  if (psychologistsCount <= 1) return Math.max(0, psychologistsCount);

  return psychologistsCount * PSYCHOLOGISTS_FEED_LOOP_CYCLES;
};

export const getPsychologistFeedRealIndex = (index: number, psychologistsCount: number) => {
  if (psychologistsCount <= 0) return 0;

  const remainder = index % psychologistsCount;
  return remainder >= 0 ? remainder : remainder + psychologistsCount;
};

export const getAnchoredPsychologistFeedIndex = (index: number, psychologistsCount: number) => {
  const realIndex = getPsychologistFeedRealIndex(index, psychologistsCount);

  if (psychologistsCount <= 1) return realIndex;

  return psychologistsCount * PSYCHOLOGISTS_FEED_LOOP_ANCHOR_CYCLE + realIndex;
};

export const normalizePsychologistFeedLoopIndex = (index: number, psychologistsCount: number) => {
  if (psychologistsCount <= 1) return getPsychologistFeedRealIndex(index, psychologistsCount);

  const slideCount = getPsychologistsFeedSlideCount(psychologistsCount);
  const realIndex = getPsychologistFeedRealIndex(index, psychologistsCount);
  const anchoredIndex = getAnchoredPsychologistFeedIndex(index, psychologistsCount);

  if (index < 0 || index >= slideCount) return anchoredIndex;
  if (index < psychologistsCount) return anchoredIndex;
  if (index >= psychologistsCount * (PSYCHOLOGISTS_FEED_LOOP_ANCHOR_CYCLE + 1)) {
    return anchoredIndex;
  }

  return psychologistsCount * PSYCHOLOGISTS_FEED_LOOP_ANCHOR_CYCLE + realIndex;
};

export const clampPsychologistFeedSlideIndex = (index: number, psychologistsCount: number) => {
  const slideCount = getPsychologistsFeedSlideCount(psychologistsCount);
  if (slideCount <= 0) return 0;

  return Math.max(0, Math.min(slideCount - 1, index));
};

export const buildPsychologistsFeedSlides = (
  psychologists: DirectoryPsychologist[],
): PsychologistFeedSlide[] => {
  if (psychologists.length <= 1) {
    return psychologists.map((psychologist, index) => ({
      index,
      psychologist,
      psychologistIndex: index,
    }));
  }

  return Array.from(
    { length: getPsychologistsFeedSlideCount(psychologists.length) },
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
