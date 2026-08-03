import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({ params }: PostDetailPageProps): Promise<Metadata> => {
  const { id, slug } = await params;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: `/community/${slug}/post/${id}`,
      description:
        "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
      title: `Pergunta da comunidade | ${SITE_NAME}`,
    },
    id,
    slug,
  });
};

export default function PostDetailPage() {
  return <PostDetailLogic />;
}
