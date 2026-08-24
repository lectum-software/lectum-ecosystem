import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import {
  normalizePublicCommunityFocusReplyId,
  publicCommunityPostFocusedReplyHref,
} from "@/utils/public-routes";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
  searchParams: Promise<{
    focusReplyId?: string | string[];
  }>;
};

export const generateMetadata = async ({
  params,
  searchParams,
}: PostDetailPageProps): Promise<Metadata> => {
  const { id, slug } = await params;
  const query = await searchParams;
  const focusReplyId = normalizePublicCommunityFocusReplyId(query.focusReplyId);
  const focusedSharePath = focusReplyId
    ? publicCommunityPostFocusedReplyHref(slug, id, focusReplyId)
    : undefined;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: focusedSharePath ?? `/comunidades/${slug}/publicacao/${id}`,
      description:
        "Pergunta ou relato público de comunidade na Lectum, com respostas e contexto responsável.",
      title: `Pergunta da comunidade | ${SITE_NAME}`,
    },
    canonicalOverride: focusedSharePath,
    id,
    openGraphUrlOverride: focusedSharePath,
    replyId: focusReplyId,
    slug,
  });
};

export default function PostDetailPage() {
  return <PostDetailLogic forceBackToFeed />;
}
