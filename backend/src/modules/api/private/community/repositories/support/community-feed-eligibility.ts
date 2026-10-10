import type { Prisma } from "@/external/generated/prisma/client";
import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import { publicFileKeyFromUrl } from "@/utils/public-origin";
import { isDirectVerifiedProfessionalReply } from "./community-featured";
import type { PostResult, ProfessionalReplyResult } from "./community-feed";

export const readyFeedVideoAssetWhere = {
  deleted: false,
  provider: "cloudflare_stream",
  status: "ready",
  purpose: "community_reply",
  owner: { active: true, deleted: false },
} satisfies Prisma.video_assetWhereInput;

export type ReadyFeedVideoAsset = { id: string; owner_id: string; context_id: string | null };

export const isAvailableProfessionalVideoReply = (
  reply: ProfessionalReplyResult,
  postId: string,
  readyAssets: ReadonlyMap<string, ReadyFeedVideoAsset>,
) => {
  if (!isDirectVerifiedProfessionalReply(reply) || reply.media_type !== "video") return false;
  const assetId = videoAssetIdFromReference(reply.media_url);
  if (assetId) {
    const asset = readyAssets.get(assetId);
    return asset?.owner_id === reply.author.id && asset.context_id === postId;
  }
  return Boolean(publicFileKeyFromUrl(reply.media_url, ["posts/media/"]));
};

// Keep text contributions for ranking, but never use unavailable videos as previews/admission.
export const withAvailableProfessionalReplies = (
  items: PostResult[],
  readyAssets: ReadonlyMap<string, ReadyFeedVideoAsset>,
) =>
  items.map((post) => ({
    ...post,
    replies: post.replies.filter(
      (reply) =>
        isDirectVerifiedProfessionalReply(reply) &&
        (reply.media_type !== "video" ||
          isAvailableProfessionalVideoReply(reply, post.id, readyAssets)),
    ),
  }));

export const hasFeedVideoReply = (post: PostResult) =>
  post.status === "publicado" &&
  post.replies.some(
    (reply) =>
      isDirectVerifiedProfessionalReply(reply) &&
      reply.media_type === "video" &&
      Boolean(reply.media_url?.trim()),
  );
