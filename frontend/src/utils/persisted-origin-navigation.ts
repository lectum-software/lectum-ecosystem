"use client";

import {
  getRememberedCommunityFeedHref,
  isCommunityNavigationHref,
} from "@/utils/community-feed-scroll-memory";
import { getPreviousAppNavigationHref, navigateBackWithFallback } from "@/utils/navigation-history";

type PersistedOriginRouter = {
  back: () => void;
  push: (href: string) => void;
  replace: (href: string, options?: { scroll?: boolean }) => void;
};

export const navigateBackToPersistedOrigin = (
  router: PersistedOriginRouter,
  fallbackHref = "/comunidades",
) => {
  const rememberedCommunityFeedHref = getRememberedCommunityFeedHref();
  const previousAppHref = getPreviousAppNavigationHref();

  if (
    rememberedCommunityFeedHref &&
    (!previousAppHref || isCommunityNavigationHref(previousAppHref))
  ) {
    router.replace(rememberedCommunityFeedHref, { scroll: false });
    return;
  }

  navigateBackWithFallback(router, fallbackHref);
};
