import type { Metadata } from "next";
import { PostReplyThreadLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import { publicCommunityReplyThreadHref } from "@/utils/public-routes";

type PostReplyThreadPageProps = {
  params: Promise<{
    id: string;
    replyId: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({ params }: PostReplyThreadPageProps): Promise<Metadata> => {
  const { id, replyId, slug } = await params;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: publicCommunityReplyThreadHref(slug, id, replyId),
      description: "Discussão pública de uma resposta em comunidade na Lectum.",
      title: `Discussão da comunidade | ${SITE_NAME}`,
    },
    id,
    replyId,
    slug,
  });
};

export default function PostReplyThreadPage() {
  return <PostReplyThreadLogic />;
}
