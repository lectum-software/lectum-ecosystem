import prisma from "@/infra/database/prisma";
import { videoAssetPlaybackReference } from "@/infra/video-stream";
import type { VideoAssetRecord } from "../types";
import { canReconcileVideoUpload, type VideoUploadReconciliationUpdate } from "./policy";
import type { ReconcileVideoUploadOptions } from "./types";

export class VideoUploadReconciliationRepository {
  list(options: ReconcileVideoUploadOptions) {
    return prisma.video_asset.findMany({
      where: options.assetId ? { id: options.assetId } : { owner_id: options.ownerId },
      include: { owner: { select: { active: true, deleted: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: options.assetId ? 1 : options.limit + 1,
      skip: options.offset,
    });
  }

  async associations(asset: VideoAssetRecord) {
    const reference = videoAssetPlaybackReference(asset.id);
    const [profile, post, reply, originalPost] = await Promise.all([
      prisma.psychologist_profile.findFirst({
        where: { video_url: reference, deleted: false },
        select: { id: true, user_id: true },
      }),
      prisma.community_post.findFirst({
        where: {
          deleted: false,
          OR: [
            { media_type: "video", media_url: reference },
            {
              media_items: { some: { deleted: false, media_type: "video", media_url: reference } },
            },
          ],
        },
        select: {
          author_id: true,
          status: true,
          author: { select: { active: true, deleted: true } },
          community: { select: { slug: true, active: true, deleted: true } },
        },
      }),
      prisma.post_reply.findFirst({
        where: { deleted: false, media_type: "video", media_url: reference },
        select: { author_id: true, post_id: true },
      }),
      asset.purpose === "community_reply" && asset.context_id
        ? prisma.community_post.findUnique({
            where: { id: asset.context_id },
            select: {
              author_id: true,
              status: true,
              deleted: true,
              author: { select: { active: true, deleted: true } },
              community: { select: { active: true, deleted: true } },
            },
          })
        : null,
    ]);
    const parent = asset.purpose === "community_reply" ? originalPost : post;
    return {
      profileAssociated: Boolean(profile),
      postAssociated: Boolean(post),
      replyAssociated: Boolean(reply),
      canonicalProfileAssociation: Boolean(
        profile &&
          asset.purpose === "profile_presentation" &&
          profile.id === asset.context_id &&
          profile.user_id === asset.owner_id,
      ),
      canonicalPostAssociation: Boolean(
        post &&
          asset.purpose === "community_post" &&
          post.author_id === asset.owner_id &&
          post.community.slug === asset.context_id,
      ),
      canonicalReplyAssociation: Boolean(
        reply &&
          asset.purpose === "community_reply" &&
          reply.author_id === asset.owner_id &&
          reply.post_id === asset.context_id,
      ),
      originalPostFound: Boolean(parent),
      originalPostPublished: parent ? parent.status === "publicado" : null,
      originalPostDeleted: originalPost?.deleted ?? (post ? false : null),
      originalPostAuthorActive: parent?.author.active ?? null,
      originalPostAuthorDeleted: parent?.author.deleted ?? null,
      ownerIsOriginalPostAuthor: parent ? parent.author_id === asset.owner_id : null,
      communityActive: parent?.community.active ?? null,
      communityDeleted: parent?.community.deleted ?? null,
    };
  }

  async apply(asset: VideoAssetRecord, update: VideoUploadReconciliationUpdate, now: Date) {
    if (!canReconcileVideoUpload(asset)) return false;
    const result = await prisma.video_asset.updateMany({
      where: {
        id: asset.id,
        provider_uid: asset.provider_uid,
        owner_id: asset.owner_id,
        context_id: asset.context_id,
        ready_at: asset.ready_at,
        provider: "cloudflare_stream",
        updatedAt: asset.updatedAt,
        status: asset.status,
        error_code: asset.error_code,
        deleted: false,
        purpose: asset.purpose,
        migration_key: null,
        source_provider: null,
      },
      data: {
        status: update.status,
        error_code: update.errorCode,
        duration_seconds: update.durationSeconds,
        height: update.height,
        width: update.width,
        last_provider_sync_at: now,
        ready_at: update.status === "ready" ? (asset.ready_at ?? now) : asset.ready_at,
      },
    });
    return result.count === 1;
  }
}
