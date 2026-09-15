"use client";

import { useParams } from "next/navigation";
import { COMMUNITY_FEED_SLUG } from "@/utils/community";

import { CommunityDetailLogic, type CommunityRouteLogicProps } from "./views/community-detail";

import { CommunityFeedLogic } from "./views/community-feed";

export const CommunityRouteLogic = ({
  suppressPublishOnboarding = false,
}: CommunityRouteLogicProps = {}) => {
  const params = useParams<{ slug: string }>();
  const routeSlug = typeof params.slug === "string" ? params.slug : COMMUNITY_FEED_SLUG;

  if (routeSlug === COMMUNITY_FEED_SLUG) {
    return <CommunityFeedLogic suppressPublishOnboarding={suppressPublishOnboarding} />;
  }

  return (
    <CommunityDetailLogic slug={routeSlug} suppressPublishOnboarding={suppressPublishOnboarding} />
  );
};

export { CommunityFeedLogic } from "./views/community-feed";
