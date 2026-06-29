import type { Metadata } from "next";
import { CommunityLogic } from "@/app/app/community/logic";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Comunidades | ${SITE_NAME}`,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/community",
  },
};

export default function CommunityPage() {
  return <CommunityLogic />;
}
