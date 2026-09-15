import type { Prisma, video_retention_record } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { isCloudflareStreamVideoUid } from "@/infra/video-stream";
import {
  type VideoRetentionProvider,
  type VideoRetentionReason,
  videoRetentionIdentity,
} from "./policy";

type RetentionClient = Pick<Prisma.TransactionClient, "video_retention_record">;

export type RetainedVideoInput = {
  provider: VideoRetentionProvider;
  namespace: string;
  objectKey: string;
  reason: VideoRetentionReason;
  sizeBytes?: bigint;
  etag?: string;
  reviewAfter?: Date;
};

export const retainVideoObject = async (
  input: RetainedVideoInput,
  client: RetentionClient = prisma,
) => {
  const identityHash = videoRetentionIdentity(input.provider, input.namespace, input.objectKey);
  // createMany skipDuplicates is atomic; reruns never release hold or extend retention.
  const result = await client.video_retention_record.createMany({
    data: {
      identity_hash: identityHash,
      provider: input.provider,
      storage_namespace: input.namespace,
      object_key: input.objectKey,
      reason: input.reason,
      size_bytes: input.sizeBytes,
      source_etag: input.etag,
      review_after: input.reviewAfter,
      deletion_hold: true,
    },
    skipDuplicates: true,
  });
  return result.count === 1;
};

export const retainStreamVideo = async (
  client: RetentionClient,
  asset: { provider_uid: string; size_bytes: bigint },
  reason: "removed" | "replaced",
) => {
  if (!isCloudflareStreamVideoUid(asset.provider_uid)) return;
  // Unknown namespace holds the object for manual reconciliation; it is not a fallback account.
  await retainVideoObject(
    {
      provider: "cloudflare_stream",
      namespace: process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim() || "unknown",
      objectKey: asset.provider_uid,
      reason,
      sizeBytes: asset.size_bytes,
    },
    client,
  );
};

export class VideoRetentionRepository {
  findR2Object(namespace: string, key: string) {
    return prisma.video_retention_record.findUnique({
      where: { identity_hash: videoRetentionIdentity("cloudflare_r2", namespace, key) },
    });
  }

  list({ after, limit }: { after?: string; limit: number }) {
    return prisma.video_retention_record.findMany({
      where: { deleted: false, ...(after ? { identity_hash: { gt: after } } : {}) },
      orderBy: { identity_hash: "asc" },
      take: limit,
    });
  }
}

export const retentionRecordMatchesObject = (
  record: Pick<video_retention_record, "source_etag" | "size_bytes" | "deleted" | "deletion_hold">,
  etag: string,
  sizeBytes: bigint,
) =>
  !record.deleted &&
  record.deletion_hold &&
  record.source_etag === etag &&
  record.size_bytes === sizeBytes;
