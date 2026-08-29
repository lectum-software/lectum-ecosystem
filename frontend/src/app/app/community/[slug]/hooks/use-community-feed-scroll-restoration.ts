"use client";

import { useEffect, useRef } from "react";
import {
  clearCommunityFeedScrollSnapshot,
  documentMaxScrollY,
  getCurrentInternalHref,
  normalizeInternalHref,
  readCommunityFeedScrollSnapshot,
  resolveCommunityFeedRestoreScrollY,
} from "@/utils/community-feed-scroll-memory";

export {
  getRememberedCommunityFeedHref,
  hasRememberedCommunityFeedScroll,
  isCommunityPostDetailNavigationTarget,
  rememberCommunityFeedScrollPosition,
} from "@/utils/community-feed-scroll-memory";

const RESTORE_HEIGHT_BUFFER_PX = 96;
const RESTORE_SETTLE_DELAY_MS = 80;

type UseCommunityFeedScrollRestorationOptions = {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  itemCount: number;
  onLoadMore: () => void;
  ready: boolean;
};

export const useCommunityFeedScrollRestoration = ({
  canLoadMore,
  isLoadingMore,
  itemCount,
  onLoadMore,
  ready,
}: UseCommunityFeedScrollRestorationOptions) => {
  const lastItemCountRef = useRef(itemCount);
  const requestedLoadMoreRef = useRef(false);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (lastItemCountRef.current !== itemCount) {
      lastItemCountRef.current = itemCount;
      requestedLoadMoreRef.current = false;
    }

    if (!ready || restoredRef.current || typeof window === "undefined") return;

    const snapshot = readCommunityFeedScrollSnapshot();
    const currentHref = getCurrentInternalHref();

    if (!snapshot || !currentHref || normalizeInternalHref(snapshot.sourceHref) !== currentHref) {
      return;
    }

    let settleTimer: number | null = null;
    let cancelled = false;

    const tryRestore = () => {
      if (cancelled) return false;

      const targetScrollY = resolveCommunityFeedRestoreScrollY(snapshot);
      const maxScrollY = documentMaxScrollY();
      const needsMoreContent = targetScrollY > maxScrollY + RESTORE_HEIGHT_BUFFER_PX;

      if (needsMoreContent && canLoadMore) {
        if (!isLoadingMore && !requestedLoadMoreRef.current) {
          requestedLoadMoreRef.current = true;
          onLoadMore();
        }

        return false;
      }

      window.scrollTo({
        behavior: "auto",
        top: Math.min(targetScrollY, maxScrollY),
      });

      return true;
    };

    const frame = window.requestAnimationFrame(() => {
      if (!tryRestore()) return;

      settleTimer = window.setTimeout(() => {
        tryRestore();
        restoredRef.current = true;
        clearCommunityFeedScrollSnapshot();
      }, RESTORE_SETTLE_DELAY_MS);
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
    };
  }, [canLoadMore, isLoadingMore, itemCount, onLoadMore, ready]);
};
