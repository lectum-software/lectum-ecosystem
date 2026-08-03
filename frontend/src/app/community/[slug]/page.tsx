import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { COMMUNITY_FEED_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveSeoMetadata } from "@/lib/seo-metadata";
import { COMMUNITY_FEED_SLUG } from "@/utils/community";

type CommunityRoutePageProps = {
  params: Promise<{
    slug?: string;
  }>;
};

export async function generateMetadata({ params }: CommunityRoutePageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === COMMUNITY_FEED_SLUG) {
    return resolveSeoMetadata("home", {
      canonical: "/",
      description: COMMUNITY_FEED_DESCRIPTION,
      ogTitle: `${SITE_NAME} | Psicologia em comunidade`,
      title: `Início | ${SITE_NAME}`,
    });
  }

  return resolveSeoMetadata("community", {
    canonical: slug ? `/community/${slug}` : "/community",
    description: "Comunidade pública da Lectum com perguntas, relatos e respostas de psicólogos.",
    title: `Comunidade | ${SITE_NAME}`,
  });
}

export default function CommunityRoutePage() {
  return <CommunityRouteLogic />;
}
