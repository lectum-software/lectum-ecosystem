import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import { publicCommunityPostHref } from "@/utils/public-routes";

type PostWhatsappSharePageProps = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: PostWhatsappSharePageProps): Promise<Metadata> => {
  const { id, slug } = await params;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: publicCommunityPostHref(slug, id),
      description:
        "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
      title: `Pergunta da comunidade | ${SITE_NAME}`,
    },
    id,
    shareTarget: "whatsapp",
    slug,
  });
};

export default function PostWhatsappSharePage() {
  return <PostDetailLogic />;
}
