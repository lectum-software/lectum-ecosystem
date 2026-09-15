import type { Metadata } from "next";
import { CommunityLogic } from "@/app/app/community/logic";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";
import { PUBLIC_COMMUNITIES_HREF } from "@/utils/public-routes";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("community", {
    canonical: PUBLIC_COMMUNITIES_HREF,
    description: SITE_DESCRIPTION,
    title: `Comunidades | ${SITE_NAME}`,
  });

export default function CommunityPage() {
  return <CommunityLogic />;
}
