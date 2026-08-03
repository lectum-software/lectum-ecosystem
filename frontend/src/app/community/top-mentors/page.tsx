import type { Metadata } from "next";
import { CommunityTopMentorsLogic } from "@/app/app/community/top-mentors/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async (): Promise<Metadata> =>
  resolveSeoMetadata("top_mentors", {
    canonical: "/community/top-mentors",
    description: "Ranking público de mentores das comunidades da Lectum.",
    title: `Top Mentores | ${SITE_NAME}`,
  });

export default function CommunityTopMentorsPage() {
  return <CommunityTopMentorsLogic />;
}
