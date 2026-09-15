import type { Prisma, video_asset } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type { VideoStreamDetails } from "@/infra/video-stream";
import { videoAssetPlaybackReference } from "@/infra/video-stream";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { VideoAssetRepository } from "../repository";
import type { VideoAssetRecord } from "../types";
import {
  type InspectedLegacyVideoSource,
  type LegacyVideoCandidate,
  R2_MIGRATION_SOURCE_PROVIDER,
} from "./types";

type MigrationIdentity = {
  assetId: string;
  migrationKey: string;
};

export type MigrationReservation =
  | { asset: video_asset; state: "created" | "existing" }
  | { reason: "profile_stream_asset_exists" | "source_changed"; state: "blocked" };

export type MigrationAttachment =
  | { retiredProviderUids: string[]; state: "attached" }
  | { retiredProviderUids: []; state: "already_attached" | "invalid" | "source_changed" };

const reservationProviderUid = (assetId: string) => `migration_reservation_${assetId}`;

const isMatchingReservation = (
  asset: video_asset,
  candidate: LegacyVideoCandidate,
  source: InspectedLegacyVideoSource,
  identity: MigrationIdentity,
) =>
  !asset.deleted &&
  asset.id === identity.assetId &&
  asset.migration_key === identity.migrationKey &&
  asset.owner_id === candidate.ownerId &&
  asset.purpose === candidate.purpose &&
  asset.context_id === candidate.contextId &&
  asset.source_provider === R2_MIGRATION_SOURCE_PROVIDER &&
  asset.source_reference === candidate.sourceReference &&
  asset.source_thumbnail_reference === candidate.sourceThumbnailReference &&
  asset.mime_type === source.mimeType &&
  asset.size_bytes === BigInt(source.sizeBytes);

const isCandidateCurrent = async (
  transaction: Prisma.TransactionClient,
  candidate: LegacyVideoCandidate,
) => {
  if (candidate.purpose === "profile_presentation") {
    return Boolean(
      await transaction.psychologist_profile.findFirst({
        where: {
          deleted: false,
          id: candidate.targetId,
          user_id: candidate.ownerId,
          video_cover_url: candidate.sourceThumbnailReference,
          video_url: candidate.sourceReference,
          user: { deleted: false },
        },
        select: { id: true },
      }),
    );
  }

  if (candidate.purpose === "community_post") {
    return Boolean(
      await transaction.community_post.findFirst({
        where: {
          author_id: candidate.ownerId,
          community: { deleted: false, slug: candidate.contextId },
          deleted: false,
          id: candidate.targetId,
          media_type: "video",
          media_url: candidate.sourceReference,
          thumbnail_url: candidate.sourceThumbnailReference,
        },
        select: { id: true },
      }),
    );
  }

  return Boolean(
    await transaction.post_reply.findFirst({
      where: {
        author_id: candidate.ownerId,
        deleted: false,
        id: candidate.targetId,
        media_type: "video",
        media_url: candidate.sourceReference,
        post_id: candidate.contextId,
        post: { deleted: false },
        thumbnail_url: candidate.sourceThumbnailReference,
      },
      select: { id: true },
    }),
  );
};

export class R2VideoMigrationRepository {
  async findOrReserve(
    candidate: LegacyVideoCandidate,
    source: InspectedLegacyVideoSource,
    identity: MigrationIdentity,
  ): Promise<MigrationReservation> {
    return withSerializableTransaction(async (transaction) => {
      if (!(await isCandidateCurrent(transaction, candidate))) {
        return { reason: "source_changed", state: "blocked" };
      }

      const existing = await transaction.video_asset.findUnique({
        where: { migration_key: identity.migrationKey },
      });
      if (existing) {
        if (!isMatchingReservation(existing, candidate, source, identity)) {
          throw new Error("R2_MIGRATION_RESERVATION_CONFLICT");
        }
        return { asset: existing, state: "existing" };
      }

      if (candidate.purpose === "profile_presentation") {
        const competingAsset = await transaction.video_asset.findFirst({
          where: {
            deleted: false,
            migration_key: null,
            owner_id: candidate.ownerId,
            purpose: "profile_presentation",
            status: { in: ["uploading", "processing", "ready"] },
          },
          select: { id: true },
        });
        if (competingAsset) {
          return { reason: "profile_stream_asset_exists", state: "blocked" };
        }
      }

      const asset = await transaction.video_asset.create({
        data: {
          context_id: candidate.contextId,
          id: identity.assetId,
          migration_key: identity.migrationKey,
          mime_type: source.mimeType,
          owner_id: candidate.ownerId,
          provider_uid: reservationProviderUid(identity.assetId),
          purpose: candidate.purpose,
          size_bytes: BigInt(source.sizeBytes),
          source_provider: R2_MIGRATION_SOURCE_PROVIDER,
          source_reference: candidate.sourceReference,
          source_thumbnail_reference: candidate.sourceThumbnailReference,
          status: "uploading",
          upload_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1_000),
        },
      });

      return { asset, state: "created" };
    });
  }

  async activateProvider(
    asset: VideoAssetRecord,
    details: VideoStreamDetails,
  ): Promise<VideoAssetRecord | null> {
    const now = new Date();
    const updated = await prisma.video_asset.updateMany({
      where: {
        deleted: false,
        id: asset.id,
        migration_key: asset.migration_key,
        provider_uid: reservationProviderUid(asset.id),
      },
      data: {
        duration_seconds: details.durationSeconds,
        error_code: details.status === "error" ? details.errorCode || "processing_failed" : null,
        height: details.height,
        last_provider_sync_at: now,
        provider_uid: details.providerUid,
        ready_at: details.status === "ready" ? now : null,
        status: details.status,
        width: details.width,
      },
    });

    if (updated.count !== 1) return null;
    return prisma.video_asset.findFirst({ where: { deleted: false, id: asset.id } });
  }

  findByMigrationKey(migrationKey: string) {
    return prisma.video_asset.findUnique({ where: { migration_key: migrationKey } });
  }

  async attachReadyCandidate(
    candidate: LegacyVideoCandidate,
    asset: VideoAssetRecord,
  ): Promise<MigrationAttachment> {
    if (candidate.purpose === "profile_presentation") {
      const attachment = await new VideoAssetRepository().attachReadyProfileAsset(asset);
      if (attachment.attached) {
        return {
          retiredProviderUids: attachment.retiredProviderUids,
          state: "attached",
        };
      }

      const profile = await prisma.psychologist_profile.findFirst({
        where: {
          deleted: false,
          id: candidate.targetId,
          user_id: candidate.ownerId,
        },
        select: { video_url: true },
      });
      return {
        retiredProviderUids: [],
        state:
          profile?.video_url === videoAssetPlaybackReference(asset.id)
            ? "already_attached"
            : "source_changed",
      };
    }

    return withSerializableTransaction(async (transaction) => {
      const currentAsset = await transaction.video_asset.findFirst({
        where: {
          deleted: false,
          id: asset.id,
          migration_key: asset.migration_key,
          source_reference: candidate.sourceReference,
          status: "ready",
        },
      });
      if (!currentAsset) return { retiredProviderUids: [], state: "invalid" };

      const reference = videoAssetPlaybackReference(asset.id);
      if (candidate.purpose === "community_post") {
        const post = await transaction.community_post.findFirst({
          where: {
            author_id: candidate.ownerId,
            community: { deleted: false, slug: candidate.contextId },
            deleted: false,
            id: candidate.targetId,
          },
          select: { media_url: true, thumbnail_url: true },
        });
        if (post?.media_url === reference) {
          await transaction.video_asset.update({
            where: { id: asset.id },
            data: { migrated_at: currentAsset.migrated_at ?? new Date() },
          });
          return { retiredProviderUids: [], state: "already_attached" };
        }
        if (
          post?.media_url !== candidate.sourceReference ||
          post.thumbnail_url !== candidate.sourceThumbnailReference
        ) {
          return { retiredProviderUids: [], state: "source_changed" };
        }

        const updated = await transaction.community_post.updateMany({
          where: {
            author_id: candidate.ownerId,
            community: { deleted: false, slug: candidate.contextId },
            deleted: false,
            id: candidate.targetId,
            media_type: "video",
            media_url: candidate.sourceReference,
            thumbnail_url: candidate.sourceThumbnailReference,
          },
          data: { media_url: reference, thumbnail_url: null },
        });
        if (updated.count !== 1) {
          return { retiredProviderUids: [], state: "source_changed" };
        }

        await transaction.community_post_media.updateMany({
          where: {
            deleted: false,
            media_type: "video",
            media_url: candidate.sourceReference,
            post_id: candidate.targetId,
            thumbnail_url: candidate.sourceThumbnailReference,
          },
          data: { media_url: reference, thumbnail_url: null },
        });
      } else {
        const reply = await transaction.post_reply.findFirst({
          where: {
            author_id: candidate.ownerId,
            deleted: false,
            id: candidate.targetId,
            post_id: candidate.contextId,
            post: { deleted: false },
          },
          select: { media_url: true, thumbnail_url: true },
        });
        if (reply?.media_url === reference) {
          await transaction.video_asset.update({
            where: { id: asset.id },
            data: { migrated_at: currentAsset.migrated_at ?? new Date() },
          });
          return { retiredProviderUids: [], state: "already_attached" };
        }
        if (
          reply?.media_url !== candidate.sourceReference ||
          reply.thumbnail_url !== candidate.sourceThumbnailReference
        ) {
          return { retiredProviderUids: [], state: "source_changed" };
        }

        const updated = await transaction.post_reply.updateMany({
          where: {
            author_id: candidate.ownerId,
            deleted: false,
            id: candidate.targetId,
            media_type: "video",
            media_url: candidate.sourceReference,
            post_id: candidate.contextId,
            post: { deleted: false },
            thumbnail_url: candidate.sourceThumbnailReference,
          },
          data: { media_url: reference, thumbnail_url: null },
        });
        if (updated.count !== 1) {
          return { retiredProviderUids: [], state: "source_changed" };
        }
      }

      await transaction.video_asset.update({
        where: { id: asset.id },
        data: { migrated_at: new Date() },
      });
      return { retiredProviderUids: [], state: "attached" };
    });
  }
}
