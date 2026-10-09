import prisma from "@/infra/database/prisma";
import { videoAssetIdFromReference } from "@/infra/video-stream/reference";
import type { PostResult } from "./community-feed";
import {
  type ReadyFeedVideoAsset,
  readyFeedVideoAssetWhere,
  withAvailableProfessionalReplies,
} from "./community-feed-eligibility";

export const loadAvailableProfessionalReplies = async (items: PostResult[]) => {
  const ids = [
    ...new Set(
      items.flatMap((post) =>
        post.replies.flatMap((reply) => {
          const id = videoAssetIdFromReference(reply.media_url);
          return id ? [id] : [];
        }),
      ),
    ),
  ];
  const readyAssets = new Map<string, ReadyFeedVideoAsset>();
  for (let start = 0; start < ids.length; start += 500) {
    const assets = await prisma.video_asset.findMany({
      where: { ...readyFeedVideoAssetWhere, id: { in: ids.slice(start, start + 500) } },
      select: { id: true, owner_id: true, context_id: true },
    });
    for (const asset of assets) readyAssets.set(asset.id, asset);
  }
  return withAvailableProfessionalReplies(items, readyAssets);
};
