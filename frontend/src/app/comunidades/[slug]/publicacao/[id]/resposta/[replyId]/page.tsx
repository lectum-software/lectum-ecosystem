import type { Metadata } from "next";
import { PostReplyThreadLogic } from "@/app/app/community/[slug]/post/[id]/logic";
import { ContentVideoHost } from "@/components/community/content-video-host";
import { PublicReelPage } from "@/components/community/public-reel-page";
import { PublicTranscript } from "@/components/video-captions/public-transcript";
import { getPublicReel, type ReelQuery, reelMetadata } from "@/lib/reel-seo";
import { SITE_NAME } from "@/lib/seo";
import { resolveCommunityPostSeoMetadata } from "@/lib/seo-metadata";
import { publicCommunityReplyThreadHref } from "@/utils/public-routes";

type PostReplyThreadPageProps = {
  searchParams: Promise<ReelQuery>;
  params: Promise<{
    id: string;
    replyId: string;
    slug: string;
  }>;
};

export const generateMetadata = async ({
  params,
  searchParams,
}: PostReplyThreadPageProps): Promise<Metadata> => {
  const { id, replyId, slug } = await params;
  const query = await searchParams;
  if (query.reel !== undefined) return reelMetadata(await getPublicReel(slug, id, query));

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

export default async function PostReplyThreadPage({
  params,
  searchParams,
}: PostReplyThreadPageProps) {
  const { id, slug, replyId } = await params;
  const query = await searchParams;
  if (query.reel !== undefined)
    return (
      <ContentVideoHost>
        <PublicReelPage slug={slug} id={id} query={query} />
      </ContentVideoHost>
    );
  return (
    <>
      <PostReplyThreadLogic forceBackToFeed />
      <PublicTranscript id={id} slug={slug} replyId={replyId} />
    </>
  );
}
