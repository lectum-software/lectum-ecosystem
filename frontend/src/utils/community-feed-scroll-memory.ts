"use client";

import {
  getBrowserStorage,
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/browser-storage";

const COMMUNITY_FEED_SCROLL_MEMORY_KEY = "lectum.community.feedScroll.v1";
const COMMUNITY_FEED_SCROLL_MEMORY_MAX_AGE_MS = 30 * 60 * 1000;
const COMMUNITY_NAVIGATION_PATH_PATTERN = /^\/(?:app\/)?(?:comunidades|community)(?:\/|$)/;

const currentScrollY = () =>
  typeof window !== "undefined" && Number.isFinite(window.scrollY) ? window.scrollY : 0;

export type CommunityFeedScrollSnapshot = {
  createdAt: number;
  postId: string;
  postViewportTop: number | null;
  scrollY: number;
  sourceHref: string;
};

export const getCurrentInternalHref = () => {
  if (typeof window === "undefined") return null;

  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
};

export const normalizeInternalHref = (href: string) => {
  if (typeof window === "undefined") return href;

  try {
    const parsed = new URL(href, window.location.origin);

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
};

const parseCommunityFeedScrollSnapshot = (raw: string | null) => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CommunityFeedScrollSnapshot>;

    if (
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt) ||
      typeof parsed.postId !== "string" ||
      typeof parsed.scrollY !== "number" ||
      !Number.isFinite(parsed.scrollY) ||
      typeof parsed.sourceHref !== "string"
    ) {
      return null;
    }

    return {
      createdAt: parsed.createdAt,
      postId: parsed.postId,
      postViewportTop:
        typeof parsed.postViewportTop === "number" && Number.isFinite(parsed.postViewportTop)
          ? parsed.postViewportTop
          : null,
      scrollY: Math.max(0, parsed.scrollY),
      sourceHref: normalizeInternalHref(parsed.sourceHref),
    } satisfies CommunityFeedScrollSnapshot;
  } catch {
    return null;
  }
};

export const readCommunityFeedScrollSnapshot = () => {
  const storage = getBrowserStorage("sessionStorage");
  const snapshot = parseCommunityFeedScrollSnapshot(
    readStorageItem(storage, COMMUNITY_FEED_SCROLL_MEMORY_KEY),
  );

  if (!snapshot) return null;

  if (Date.now() - snapshot.createdAt > COMMUNITY_FEED_SCROLL_MEMORY_MAX_AGE_MS) {
    removeStorageItem(storage, COMMUNITY_FEED_SCROLL_MEMORY_KEY);
    return null;
  }

  return snapshot;
};

export const clearCommunityFeedScrollSnapshot = () => {
  removeStorageItem(getBrowserStorage("sessionStorage"), COMMUNITY_FEED_SCROLL_MEMORY_KEY);
};

const findCommunityFeedPostElement = (postId: string) => {
  if (typeof document === "undefined") return null;

  return Array.from(document.querySelectorAll<HTMLElement>("[data-community-feed-post-id]")).find(
    (element) => element.dataset.communityFeedPostId === postId,
  );
};

export const documentMaxScrollY = () => {
  if (typeof document === "undefined" || typeof window === "undefined") return 0;

  const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);

  return Math.max(0, scrollHeight - window.innerHeight);
};

export const resolveCommunityFeedRestoreScrollY = (snapshot: CommunityFeedScrollSnapshot) => {
  if (typeof window === "undefined") return snapshot.scrollY;

  const postElement = findCommunityFeedPostElement(snapshot.postId);

  if (postElement && snapshot.postViewportTop !== null) {
    const absolutePostTop = postElement.getBoundingClientRect().top + currentScrollY();

    return Math.max(0, absolutePostTop - snapshot.postViewportTop);
  }

  return snapshot.scrollY;
};

export const rememberCommunityFeedScrollPosition = (postId: string) => {
  if (typeof window === "undefined") return;

  const sourceHref = getCurrentInternalHref();
  if (!sourceHref) return;

  const postElement = findCommunityFeedPostElement(postId);
  const snapshot: CommunityFeedScrollSnapshot = {
    createdAt: Date.now(),
    postId,
    postViewportTop: postElement?.getBoundingClientRect().top ?? null,
    scrollY: Math.max(0, currentScrollY()),
    sourceHref,
  };

  writeStorageItem(
    getBrowserStorage("sessionStorage"),
    COMMUNITY_FEED_SCROLL_MEMORY_KEY,
    JSON.stringify(snapshot),
  );
};

export const getRememberedCommunityFeedHref = (postId?: string | null) => {
  const snapshot = readCommunityFeedScrollSnapshot();

  if (!snapshot) return null;
  if (postId && snapshot.postId !== postId) return null;

  return snapshot.sourceHref;
};

export const hasRememberedCommunityFeedScroll = (postId?: string | null) =>
  Boolean(getRememberedCommunityFeedHref(postId));

export const isCommunityPostDetailNavigationTarget = (
  target: EventTarget | null,
  postHref: string,
) => {
  const targetElement =
    target instanceof Element ? target : target instanceof Node ? target.parentElement : null;

  const link = targetElement?.closest<HTMLAnchorElement>("a[href]");
  if (!link) return false;

  return normalizeInternalHref(link.href) === normalizeInternalHref(postHref);
};

export const isCommunityNavigationHref = (href?: string | null) => {
  if (!href) return false;

  return COMMUNITY_NAVIGATION_PATH_PATTERN.test(normalizeInternalHref(href));
};
