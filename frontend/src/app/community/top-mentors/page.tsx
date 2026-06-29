import type { Metadata } from "next";
import { CommunityTopMentorsLogic } from "@/app/app/community/top-mentors/logic";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Top Mentores | ${SITE_NAME}`,
  description: "Ranking público de mentores das comunidades da Lectum.",
  alternates: {
    canonical: "/community/top-mentors",
  },
};

export default function CommunityTopMentorsPage() {
  return <CommunityTopMentorsLogic />;
}
