import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { COMMUNITY_FEED_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import { resolveCommunitySeoMetadata, resolveSeoMetadata } from "@/lib/seo-metadata";
import { COMMUNITY_FEED_SLUG } from "@/utils/community";
import { PUBLIC_COMMUNITIES_HREF, publicCommunityHref } from "@/utils/public-routes";

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

  const canonical = slug ? publicCommunityHref(slug) : PUBLIC_COMMUNITIES_HREF;

  return resolveCommunitySeoMetadata({
    fallback: {
      canonical,
      description: "Comunidade pública da Lectum com perguntas, relatos e respostas de psicólogos.",
      title: `Comunidade | ${SITE_NAME}`,
    },
    slug: slug ?? "",
  });
}

export default function CommunityRoutePage() {
  return <CommunityRouteLogic />;
}
