import type { Metadata } from "next";
import { CommunityTopMentorsLogic } from "@/app/app/community/top-mentors/logic";
import { resolveTopMentorsSeoMetadata } from "@/lib/seo-metadata";

export const generateMetadata = async ({
  searchParams,
}: {
  searchParams: Promise<{ community?: string | string[] }>;
}): Promise<Metadata> => {
  const { community } = await searchParams;
  return resolveTopMentorsSeoMetadata(Array.isArray(community) ? community[0] : community);
};

export default function CommunityTopMentorsPage() {
  return <CommunityTopMentorsLogic />;
}
