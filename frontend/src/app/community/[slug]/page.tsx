import type { Metadata } from "next";
import { CommunityRouteLogic } from "@/app/app/community/[slug]/logic";
import { COMMUNITY_FEED_DESCRIPTION } from "@/lib/seo";
import { COMMUNITY_FEED_SLUG } from "@/utils/community";

type CommunityRoutePageProps = {
  params: Promise<{
    slug?: string;
  }>;
};

export async function generateMetadata({ params }: CommunityRoutePageProps): Promise<Metadata> {
  const { slug } = await params;

  if (slug === COMMUNITY_FEED_SLUG) {
    return {
      title: "Início",
      description: COMMUNITY_FEED_DESCRIPTION,
      alternates: {
        canonical: "/",
      },
    };
  }

  return {
    title: "Comunidade",
    description: "Comunidade pública da Lectum com perguntas, relatos e respostas de psicólogos.",
    alternates: {
      canonical: slug ? `/community/${slug}` : "/community",
    },
  };
}

export default function CommunityRoutePage() {
  return <CommunityRouteLogic />;
}
