import type { Metadata } from "next";
import { CommunityFeedLogic } from "@/app/app/community/[slug]/views/community-feed";
import { COMMUNITY_FEED_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("home", {
    canonical: "/",
    description: COMMUNITY_FEED_DESCRIPTION,
    ogTitle: `${SITE_NAME} | Psicologia em comunidade`,
    title: `Início | ${SITE_NAME}`,
  });

export default function HomePage() {
  return <CommunityFeedLogic />;
}
