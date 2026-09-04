"use client";

import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "./browser-storage";
import { normalizeSafeInternalRedirect } from "./safe-redirect";

export const PSYCHOLOGISTS_FEED_RETURN_MEMORY_KEY = "lectum.psychologists.feedReturn.v1";
const PSYCHOLOGISTS_FEED_RETURN_MAX_AGE_MS = 30 * 60 * 1000;
const PSYCHOLOGISTS_FEED_RETURN_MAX_INDEX = 100_000;
const PSYCHOLOGISTS_FEED_PATH_PATTERN = /^\/(?:app\/)?(?:psicologos|psychologists)\/?$/;

export type PsychologistsFeedReturnSnapshot = {
  activeIndex: number;
  createdAt: number;
  feedLoopCycleCount: number;
  psychologistId: string;
  scrollTop: number;
  sourceHref: string;
};

export type RememberPsychologistsFeedReturnPositionInput = {
  activeIndex: number;
  feedLoopCycleCount: number;
  psychologistId: string | null | undefined;
  scrollTop?: number | null;
  sourceHref?: string | null;
};

export const getCurrentInternalHref = () => {
  if (typeof window === "undefined") return null;

  return normalizeSafeInternalRedirect(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
    null,
  );
};

const getPathnameFromInternalHref = (href: string) => {
  const normalizedHref = normalizeSafeInternalRedirect(href, null);
  if (!normalizedHref) return null;

  const separatorIndex = normalizedHref.search(/[?#]/);

  return separatorIndex >= 0 ? normalizedHref.slice(0, separatorIndex) : normalizedHref;
};

export const isPsychologistsFeedHref = (href: string | null | undefined) => {
  if (!href) return false;

  const pathname = getPathnameFromInternalHref(href);

  return Boolean(pathname && PSYCHOLOGISTS_FEED_PATH_PATTERN.test(pathname));
};

const parseNonNegativeInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null;
  if (value > PSYCHOLOGISTS_FEED_RETURN_MAX_INDEX) return null;

  return value;
};

const parseNonNegativeNumber = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;

  return value;
};

const parsePsychologistsFeedReturnSnapshot = (
  raw: string | null,
): PsychologistsFeedReturnSnapshot | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PsychologistsFeedReturnSnapshot>;
    const activeIndex = parseNonNegativeInteger(parsed.activeIndex);
    const feedLoopCycleCount = parseNonNegativeInteger(parsed.feedLoopCycleCount);
    const scrollTop = parseNonNegativeNumber(parsed.scrollTop);
    const sourceHref = normalizeSafeInternalRedirect(parsed.sourceHref, null);
    const psychologistId = parsed.psychologistId?.trim();

    if (
      activeIndex === null ||
      feedLoopCycleCount === null ||
      scrollTop === null ||
      !sourceHref ||
      !isPsychologistsFeedHref(sourceHref) ||
      !psychologistId ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt)
    ) {
      return null;
    }

    return {
      activeIndex,
      createdAt: parsed.createdAt,
      feedLoopCycleCount: Math.max(1, feedLoopCycleCount),
      psychologistId,
      scrollTop,
      sourceHref,
    };
  } catch {
    return null;
  }
};

export const clearPsychologistsFeedReturnSnapshot = () => {
  removeStorageItem(getBrowserStorage("sessionStorage"), PSYCHOLOGISTS_FEED_RETURN_MEMORY_KEY);
};

export const readPsychologistsFeedReturnSnapshot = () => {
  const storage = getBrowserStorage("sessionStorage");
  const snapshot = parsePsychologistsFeedReturnSnapshot(
    readStorageItem(storage, PSYCHOLOGISTS_FEED_RETURN_MEMORY_KEY),
  );

  if (!snapshot) return null;

  if (Date.now() - snapshot.createdAt > PSYCHOLOGISTS_FEED_RETURN_MAX_AGE_MS) {
    clearPsychologistsFeedReturnSnapshot();
    return null;
  }

  return snapshot;
};

export const shouldRestorePsychologistsFeedReturnSnapshot = (
  snapshot: PsychologistsFeedReturnSnapshot,
  currentHref = getCurrentInternalHref(),
) =>
  Boolean(currentHref && normalizeSafeInternalRedirect(currentHref, null) === snapshot.sourceHref);

export const rememberPsychologistsFeedReturnPosition = ({
  activeIndex,
  feedLoopCycleCount,
  psychologistId,
  scrollTop = 0,
  sourceHref = getCurrentInternalHref(),
}: RememberPsychologistsFeedReturnPositionInput) => {
  const normalizedActiveIndex = parseNonNegativeInteger(activeIndex);
  const normalizedLoopCycleCount = parseNonNegativeInteger(feedLoopCycleCount);
  const normalizedScrollTop = parseNonNegativeNumber(scrollTop);
  const normalizedSourceHref = normalizeSafeInternalRedirect(sourceHref, null);
  const normalizedPsychologistId = psychologistId?.trim();

  if (
    normalizedActiveIndex === null ||
    normalizedLoopCycleCount === null ||
    normalizedScrollTop === null ||
    !normalizedSourceHref ||
    !isPsychologistsFeedHref(normalizedSourceHref) ||
    !normalizedPsychologistId
  ) {
    return false;
  }

  const snapshot: PsychologistsFeedReturnSnapshot = {
    activeIndex: normalizedActiveIndex,
    createdAt: Date.now(),
    feedLoopCycleCount: Math.max(1, normalizedLoopCycleCount),
    psychologistId: normalizedPsychologistId,
    scrollTop: normalizedScrollTop,
    sourceHref: normalizedSourceHref,
  };

  return writeStorageItem(
    getBrowserStorage("sessionStorage"),
    PSYCHOLOGISTS_FEED_RETURN_MEMORY_KEY,
    JSON.stringify(snapshot),
  );
};

export const getRememberedPsychologistsFeedHref = (psychologistId?: string | null) => {
  const snapshot = readPsychologistsFeedReturnSnapshot();
  if (!snapshot) return null;

  const normalizedPsychologistId = psychologistId?.trim();
  if (normalizedPsychologistId && snapshot.psychologistId !== normalizedPsychologistId) {
    return null;
  }

  return snapshot.sourceHref;
};

export const resolvePsychologistsFeedReturnIndex = (
  snapshot: PsychologistsFeedReturnSnapshot,
  psychologistIds: readonly string[],
  maxRenderedSlideCount?: number,
) => {
  if (psychologistIds.length === 0) return null;

  const realIndexFromSnapshot = snapshot.activeIndex % psychologistIds.length;
  const canUseSnapshotIndex =
    psychologistIds[realIndexFromSnapshot] === snapshot.psychologistId &&
    (maxRenderedSlideCount === undefined || snapshot.activeIndex < maxRenderedSlideCount);

  if (canUseSnapshotIndex) return snapshot.activeIndex;

  const currentIndex = psychologistIds.indexOf(snapshot.psychologistId);

  return currentIndex >= 0 ? currentIndex : null;
};
