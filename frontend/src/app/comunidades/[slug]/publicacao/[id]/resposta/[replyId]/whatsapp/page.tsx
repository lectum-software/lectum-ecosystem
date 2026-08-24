import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import { publicCommunityPostFocusedReplyHref } from "@/utils/public-routes";

type ReplyWhatsappSharePageProps = {
  params: Promise<{
    id: string;
    replyId: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
}: ReplyWhatsappSharePageProps): Promise<Metadata> => {
  const { id, replyId, slug } = await params;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: publicCommunityPostFocusedReplyHref(slug, id, replyId),
      description: "Discussão pública de uma resposta em comunidade na Lectum.",
      title: `Discussão da comunidade | ${SITE_NAME}`,
    },
    id,
    replyId,
    shareTarget: "whatsapp",
    slug,
  });
};

export default async function ReplyWhatsappSharePage({ params }: ReplyWhatsappSharePageProps) {
  const { replyId } = await params;

  return <PostDetailLogic initialFocusReplyId={replyId} />;
}
