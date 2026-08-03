import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
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
  return <CommunityRouteLogic />;
}
