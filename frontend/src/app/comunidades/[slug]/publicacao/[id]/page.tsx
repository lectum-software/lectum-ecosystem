import type { Metadata } from "next";
import { PostDetailLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { ContentVideoHost } from "@/components/community/content-video-host";
import { PublicReelPage } from "@/components/community/public-reel-page";
import { PublicTranscript } from "@/components/video-captions/public-transcript";
import { getPublicReel, type ReelQuery, reelMetadata } from "@/lib/reel-seo";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import {
  normalizePublicCommunityFocusReplyId,
  publicCommunityPostFocusedReplyHref,
  publicCommunityPostHref,
} from "@/utils/public-routes";

type PostDetailPageProps = {
  params: Promise<{
    id: string;
    slug: string;
  }>;
  searchParams: Promise<
    ReelQuery & {
      focusReplyId?: string | string[];
    }
  >;
};

export const generateMetadata = async ({
  params,
  searchParams,
}: PostDetailPageProps): Promise<Metadata> => {
  const { id, slug } = await params;
  const query = await searchParams;
  if (query.reel !== undefined) return reelMetadata(await getPublicReel(slug, id, query));
  const focusReplyId = normalizePublicCommunityFocusReplyId(query.focusReplyId);
  const focusedSharePath = focusReplyId
    ? publicCommunityPostFocusedReplyHref(slug, id, focusReplyId)
    : undefined;

  return resolveCommunityPostSeoMetadata({
    fallback: {
      canonical: focusedSharePath ?? publicCommunityPostHref(slug, id),
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

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
  const { id, slug } = await params;
  const query = await searchParams;
  if (query.reel !== undefined)
    return (
      <ContentVideoHost directLink>
        <PublicReelPage slug={slug} id={id} query={query} />
      </ContentVideoHost>
    );
  return (
    <>
      <PostDetailLogic forceBackToFeed />
      <PublicTranscript id={id} slug={slug} />
    </>
  );
}
