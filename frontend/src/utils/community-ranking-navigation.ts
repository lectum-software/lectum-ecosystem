"use client";

import { DEFAULT_COMMUNITY_FEED_HREF } from "@/utils/community";
import { getPreviousAppNavigationHref, navigateBackWithFallback } from "@/utils/navigation-history";

type Router = {
  back: () => void;
  push: (href: string) => void;
  replace: (href: string) => void;
};

const rankingPath = /^\/(?:app\/)?(?:comunidades\/top-mentores|community\/top-mentors)\/?$/;

export const navigateBackFromTopMentors = (router: Router, community?: string) => {
  const previous = getPreviousAppNavigationHref();
  const slug = community ? encodeURIComponent(community) : null;
  const communityPaths = slug
    ? [
        `/comunidades/${slug}`,
        `/community/${slug}`,
        `/app/comunidades/${slug}`,
        `/app/community/${slug}`,
      ]
    : [];

  if (previous && communityPaths.includes(previous)) {
    navigateBackWithFallback(router, communityPaths[0]);
    return;
  }

  // Direct/shared entry must not add a ranking -> community -> ranking cycle.
  router.replace(communityPaths[0] ?? "/comunidades");
};

export const navigateBackFromCommunity = (router: Router) => {
  const previous = getPreviousAppNavigationHref();
  if (previous && rankingPath.test(previous)) {
    router.replace(DEFAULT_COMMUNITY_FEED_HREF);
    return;
  }
  navigateBackWithFallback(router);
};
