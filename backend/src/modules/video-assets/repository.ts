import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { type VideoAssetPurpose, videoAssetPlaybackReference } from "@/infra/video-stream";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { findReadyOwnedVideoAsset, findVideoAssetAssociations } from "./association-guard";
import { canViewVideoAsset } from "./authorization";
import { isR2MigrationAsset } from "./r2-migration/policy";
import { mutableVideoAssetStatusesFor } from "./status";
import type {
  ProfileVideoAssetAttachment,
  VideoAssetAssociationInput,
  VideoAssetCancelOptions,
  VideoAssetCancelResult,
  VideoAssetProviderUpdate,
  VideoAssetRecord,
} from "./types";

const activeAssetWhere = {
  deleted: false,
} as const;

export class VideoAssetRepository {
  reserveUpload(data: {
    contextId: string;
    expiresAt: Date;
    id: string;
    mimeType: string;
    ownerId: string;
    purpose: VideoAssetPurpose;
    sizeBytes: number;
  }) {
    return withSerializableTransaction(async (transaction) => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1_000);
      const [openUploads, recentUploads] = await Promise.all([
        transaction.video_asset.count({
          where: {
            ...activeAssetWhere,
            migration_key: null,
            owner_id: data.ownerId,
            status: { in: ["uploading", "processing"] },
            upload_expires_at: { gt: now },
          },
        }),
        transaction.video_asset.count({
          where: {
            ...activeAssetWhere,
            createdAt: { gte: oneHourAgo },
            migration_key: null,
            owner_id: data.ownerId,
          },
        }),
      ]);

      if (openUploads >= 3 || recentUploads >= 20) return null;

      return transaction.video_asset.create({
        data: {
          context_id: data.contextId,
          id: data.id,
          mime_type: data.mimeType,
          owner_id: data.ownerId,
          provider_uid: `reservation_${data.id}`,
          purpose: data.purpose,
          size_bytes: BigInt(data.sizeBytes),
          status: "uploading",
          upload_expires_at: data.expiresAt,
        },
      });
    });
  }

  async activateUploadReservation(assetId: string, ownerId: string, providerUid: string) {
    const activated = await prisma.video_asset.updateMany({
      where: {
        ...activeAssetWhere,
        id: assetId,
        owner_id: ownerId,
        provider_uid: `reservation_${assetId}`,
        status: "uploading",
      },
      data: { provider_uid: providerUid },
    });

    return activated.count === 1 ? this.findOwned(assetId, ownerId) : null;
  }

  findById(id: string) {
    return prisma.video_asset.findFirst({
      where: { ...activeAssetWhere, id },
    });
  }

  findOwned(id: string, ownerId: string) {
    return prisma.video_asset.findFirst({
      where: { ...activeAssetWhere, id, owner_id: ownerId },
    });
  }

  findByProviderUid(providerUid: string) {
    return prisma.video_asset.findFirst({
      where: { ...activeAssetWhere, provider_uid: providerUid },
    });
  }

  async applyProviderUpdate(
    asset: VideoAssetRecord,
    update: VideoAssetProviderUpdate,
    webhook?: { at: Date; digest: string },
  ) {
    const now = new Date();
    const data: Prisma.video_assetUpdateManyMutationInput = {
      duration_seconds: update.durationSeconds,
      error_code: update.status === "error" ? update.errorCode || "processing_failed" : null,
      height: update.height,
      last_provider_sync_at: now,
      ready_at: update.status === "ready" ? asset.ready_at || now : null,
      status: update.status,
      width: update.width,
      ...(webhook
        ? {
            last_webhook_at: webhook.at,
            last_webhook_digest: webhook.digest,
          }
        : {}),
    };

    const changed = await prisma.video_asset.updateMany({
      where: {
        ...activeAssetWhere,
        id: asset.id,
        status: { in: mutableVideoAssetStatusesFor(update.status) },
        ...(webhook
          ? {
              OR: [{ last_webhook_digest: null }, { last_webhook_digest: { not: webhook.digest } }],
            }
          : {}),
      },
      data,
    });

    if (changed.count === 0) return null;
    return this.findById(asset.id);
  }

  async markExpired(asset: VideoAssetRecord) {
    await prisma.video_asset.updateMany({
      where: {
        ...activeAssetWhere,
        id: asset.id,
        status: "uploading",
        upload_expires_at: { lte: new Date() },
      },
      data: {
        error_code: "upload_expired",
        status: "error",
      },
    });

    return this.findById(asset.id);
  }

  async attachReadyProfileAsset(asset: VideoAssetRecord) {
    const notAttached = (): ProfileVideoAssetAttachment => ({
      attached: false,
      previousVideoCoverUrl: null,
      previousVideoUrl: null,
      retiredProviderUids: [],
    });
    return withSerializableTransaction(async (transaction) => {
      const current = await findReadyOwnedVideoAsset(transaction, {
        contextId: asset.context_id ?? "",
        ownerId: asset.owner_id,
        purpose: "profile_presentation",
        reference: videoAssetPlaybackReference(asset.id),
      });
      if (!current?.context_id) return notAttached();
      const contextId = current.context_id;
      const newest = await transaction.video_asset.findFirst({
        where: {
          ...activeAssetWhere,
          owner_id: current.owner_id,
          purpose: "profile_presentation",
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { id: true },
      });
      if (newest?.id !== current.id) return notAttached();

      const profile = await transaction.psychologist_profile.findFirst({
        where: {
          deleted: false,
          id: contextId,
          user_id: current.owner_id,
        },
        select: {
          id: true,
          video_cover_url: true,
          video_url: true,
        },
      });
      if (!profile) return notAttached();

      const reference = videoAssetPlaybackReference(current.id);
      if (profile.video_url === reference) return notAttached();
      const isR2Migration = isR2MigrationAsset(current);
      if (isR2Migration && profile.video_url !== current.source_reference) return notAttached();

      const replacedAssets = await transaction.video_asset.findMany({
        where: {
          ...activeAssetWhere,
          id: { not: current.id },
          owner_id: current.owner_id,
          purpose: "profile_presentation",
        },
        select: { provider_uid: true },
      });
      const updated = await transaction.psychologist_profile.updateMany({
        where: {
          deleted: false,
          id: profile.id,
          user_id: current.owner_id,
          video_url: profile.video_url,
          ...(isR2Migration ? { video_cover_url: current.source_thumbnail_reference } : {}),
        },
        data: {
          video_cover_url: null,
          video_url: reference,
        },
      });
      if (updated.count === 0) return notAttached();

      if (replacedAssets.length > 0) {
        const now = new Date();
        await transaction.video_asset.updateMany({
          where: {
            ...activeAssetWhere,
            id: { not: current.id },
            owner_id: current.owner_id,
            purpose: "profile_presentation",
          },
          data: {
            deleted: true,
            deletedAt: now,
            error_code: null,
            status: "canceled",
          },
        });
      }

      if (isR2Migration) {
        await transaction.video_asset.update({
          where: { id: current.id },
          data: { migrated_at: new Date() },
        });
      }

      return {
        attached: true,
        previousVideoCoverUrl: profile.video_cover_url,
        previousVideoUrl: profile.video_url,
        retiredProviderUids: replacedAssets.map((item) => item.provider_uid),
      };
    });
  }

  async isReadyOwnedReference(input: VideoAssetAssociationInput) {
    return Boolean(await findReadyOwnedVideoAsset(prisma, input));
  }

  async isPlaybackAuthorized(asset: VideoAssetRecord, userId?: string | null) {
    if (
      canViewVideoAsset({
        hasPublishedAssociation: false,
        ownerId: asset.owner_id,
        viewerId: userId,
      })
    ) {
      return true;
    }

    if (!asset.context_id) return false;

    const reference = videoAssetPlaybackReference(asset.id);

    if (asset.purpose === "profile_presentation") {
      const profile = await prisma.psychologist_profile.findFirst({
        where: {
          deleted: false,
          id: asset.context_id,
          published: true,
          user_id: asset.owner_id,
          video_url: reference,
          user: { active: true, deleted: false },
        },
        select: { id: true },
      });
      return canViewVideoAsset({
        hasPublishedAssociation: Boolean(profile),
        ownerId: asset.owner_id,
        viewerId: userId,
      });
    }

    if (asset.purpose === "community_post") {
      const post = await prisma.community_post.findFirst({
        where: {
          OR: [
            { media_type: "video", media_url: reference },
            {
              media_items: {
                some: {
                  deleted: false,
                  media_type: "video",
                  media_url: reference,
                },
              },
            },
          ],
          author_id: asset.owner_id,
          deleted: false,
          status: "publicado",
          author: { active: true, deleted: false },
          community: {
            active: true,
            deleted: false,
            slug: asset.context_id,
          },
        },
        select: { id: true },
      });
      return canViewVideoAsset({
        hasPublishedAssociation: Boolean(post),
        ownerId: asset.owner_id,
        viewerId: userId,
      });
    }

    if (asset.purpose !== "community_reply") return false;

    const reply = await prisma.post_reply.findFirst({
      where: {
        author_id: asset.owner_id,
        deleted: false,
        media_type: "video",
        media_url: reference,
        author: { active: true, deleted: false },
        post: {
          deleted: false,
          id: asset.context_id,
          status: "publicado",
          author: { active: true, deleted: false },
          community: { active: true, deleted: false },
        },
      },
      select: { id: true },
    });

    return canViewVideoAsset({
      hasPublishedAssociation: Boolean(reply),
      ownerId: asset.owner_id,
      viewerId: userId,
    });
  }

  async isAttached(asset: VideoAssetRecord) {
    const { profile, post, reply } = await findVideoAssetAssociations(prisma, asset);
    return Boolean(profile || post || reply);
  }

  async cancel(
    identity: Pick<VideoAssetRecord, "id" | "owner_id">,
    options: VideoAssetCancelOptions = {},
  ): Promise<VideoAssetCancelResult> {
    return withSerializableTransaction(async (transaction): Promise<VideoAssetCancelResult> => {
      const asset = await transaction.video_asset.findFirst({
        where: { ...activeAssetWhere, id: identity.id, owner_id: identity.owner_id },
      });
      if (!asset) return { kind: "not_found" };

      const { profile, post, reply } = await findVideoAssetAssociations(transaction, asset);
      if (
        post ||
        reply ||
        (profile &&
          (options.onlyUnattached ||
            asset.purpose !== "profile_presentation" ||
            profile.user_id !== asset.owner_id))
      )
        return { kind: "attached" };

      const reference = videoAssetPlaybackReference(asset.id);
      await transaction.psychologist_profile.updateMany({
        where: { deleted: false, user_id: asset.owner_id, video_url: reference },
        data: { video_cover_url: null, video_url: null },
      });
      const canceled = await transaction.video_asset.updateMany({
        where: { ...activeAssetWhere, id: asset.id, owner_id: asset.owner_id },
        data: { deleted: true, deletedAt: new Date(), error_code: null, status: "canceled" },
      });
      return canceled.count === 1 ? { kind: "canceled", asset } : { kind: "not_found" };
    });
  }
}
