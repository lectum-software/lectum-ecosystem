"use client";

import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getPreviousAppNavigationHref, navigateBackWithFallback } from "@/utils/navigation-history";

export const navigateBackFromCommunityPost = (
  router: Parameters<typeof navigateBackWithFallback>[0],
  rememberedFeedHref: string | null,
  forceBackToFeed = false,
) => {
  // Public URLs also open from personal lists; retain that in-app history.
  if (forceBackToFeed && !rememberedFeedHref && !getPreviousAppNavigationHref()) {
    router.push(DEFAULT_COMMUNITY_FEED_HREF);
    return;
  }

  navigateBackWithFallback(router, rememberedFeedHref ?? DEFAULT_COMMUNITY_FEED_HREF);
};
