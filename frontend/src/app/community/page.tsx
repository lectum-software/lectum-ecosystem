import type { Metadata } from "next";
import { CommunityLogic } from "@/app/app/community/logic";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("community", {
    canonical: "/community",
    description: SITE_DESCRIPTION,
    title: `Comunidades | ${SITE_NAME}`,
  });

export default function CommunityPage() {
  return <CommunityLogic />;
}
