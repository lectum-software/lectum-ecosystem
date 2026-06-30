import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { absoluteUrl, COMMUNITY_FEED_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: {
    absolute: `Início | ${SITE_NAME}`,
  },
  description: COMMUNITY_FEED_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} | Psicologia em comunidade`,
    description: COMMUNITY_FEED_DESCRIPTION,
    url: absoluteUrl("/"),
  },
  twitter: {
    title: `${SITE_NAME} | Psicologia em comunidade`,
    description: COMMUNITY_FEED_DESCRIPTION,
  },
};

export default function HomePage() {
  return <CommunityRouteLogic />;
}
