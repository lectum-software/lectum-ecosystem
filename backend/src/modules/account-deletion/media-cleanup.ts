import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { isR2Configured, PUBLIC_BUCKET, S3 } from "@/config/multer/s3";
import type { account_media_deletion } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import {
  getVideoStreamProvider,
  isCloudflareStreamVideoUid,
  VideoStreamProviderError,
} from "@/infra/video-stream";
import { publicFileKeyFromUrl } from "@/utils/public-origin";
import { ACCOUNT_MEDIA_PREFIXES, mediaDeletionIdentity } from "./content";

const hasOtherReference = async (item: account_media_deletion) => {
  if (item.provider === "cloudflare_stream") return false; // Stream UID is unique and owner-bound.
  const url = { endsWith: `/public/files/${item.object_key}` };
  const [post, reply, profile, account, media, asset] = await Promise.all([
    prisma.community_post.count({
      where: {
        author_id: { not: item.owner_id },
        deleted: false,
        OR: [{ media_url: url }, { thumbnail_url: url }],
      },
    }),
    prisma.post_reply.count({
      where: {
        author_id: { not: item.owner_id },
        deleted: false,
        OR: [{ media_url: url }, { thumbnail_url: url }],
      },
    }),
    prisma.psychologist_profile.count({
      where: {
        user_id: { not: item.owner_id },
        deleted: false,
        OR: [{ video_url: url }, { video_cover_url: url }, { cover_image_url: url }],
      },
    }),
    prisma.user.count({ where: { id: { not: item.owner_id }, deleted: false, avatar: url } }),
    prisma.community_post_media.count({
      where: {
        deleted: false,
        post: { author_id: { not: item.owner_id }, deleted: false },
        OR: [{ media_url: url }, { thumbnail_url: url }],
      },
    }),
    prisma.video_asset.count({
      where: {
        deleted: false,
        owner_id: { not: item.owner_id },
        OR: [{ source_reference: url }, { source_thumbnail_reference: url }],
      },
    }),
  ]);
  return post + reply + profile + account + media + asset > 0;
};

export const deleteQueuedMediaObject = async (item: account_media_deletion) => {
  if (item.storage_namespace === "unknown") throw new Error("namespace_unavailable");
  const owner = await prisma.user.findUnique({
    where: { id: item.owner_id },
    select: { deleted: true },
  });
  if (!owner?.deleted) throw new Error("owner_not_deleted");
  if (await hasOtherReference(item)) throw new Error("shared_object");
  if (item.provider === "cloudflare_r2") {
    const key = publicFileKeyFromUrl(`/public/files/${item.object_key}`, ACCOUNT_MEDIA_PREFIXES);
    if (!isR2Configured() || item.storage_namespace !== PUBLIC_BUCKET || key !== item.object_key) {
      throw new Error("storage_mismatch");
    }
    await S3.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key }));
    return;
  }
  if (
    item.provider !== "cloudflare_stream" ||
    item.storage_namespace !== process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim() ||
    !isCloudflareStreamVideoUid(item.object_key)
  )
    throw new Error("storage_mismatch");
  const asset = await prisma.video_asset.findUnique({ where: { provider_uid: item.object_key } });
  if (!asset?.deleted || asset.owner_id !== item.owner_id) throw new Error("asset_not_deleted");
  const provider = getVideoStreamProvider();
  if (!provider) throw new Error("provider_unavailable");
  try {
    await provider.deleteVideo(item.object_key);
  } catch (error) {
    if (!(error instanceof VideoStreamProviderError && error.status === 404)) throw error;
  }
};

export const processAccountMediaDeletions = async (
  { ownerId, limit = 25 }: { ownerId?: string; limit?: number } = {},
  remove = deleteQueuedMediaObject,
) => {
  const now = new Date();
  const pending = await prisma.account_media_deletion.findMany({
    where: {
      completed_at: null,
      available_at: { lte: now },
      ...(ownerId ? { owner_id: ownerId } : {}),
    },
    orderBy: [{ available_at: "asc" }, { id: "asc" }],
    take: Math.max(1, Math.min(100, limit)),
  });
  let completed = 0;
  for (const item of pending) {
    const lease = new Date(Date.now() + 10 * 60_000);
    const claimed = await prisma.account_media_deletion.updateMany({
      where: {
        id: item.id,
        completed_at: null,
        available_at: { lte: now },
        attempts: item.attempts,
      },
      data: { available_at: lease, attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      await remove(item);
      await prisma.video_retention_record.updateMany({
        where: {
          provider: item.provider,
          storage_namespace: item.storage_namespace,
          object_key: item.object_key,
        },
        data: { deleted: true, deletedAt: new Date() },
      });
      await prisma.account_media_deletion.updateMany({
        where: { id: item.id, available_at: lease },
        data: { completed_at: new Date(), error_code: null },
      });
      completed++;
    } catch {
      await prisma.account_media_deletion.updateMany({
        where: { id: item.id, available_at: lease },
        data: {
          available_at: new Date(
            Date.now() + Math.min(24 * 60, 2 ** Math.min(item.attempts + 1, 10)) * 60_000,
          ),
          error_code: "media_cleanup_pending",
        },
      });
    }
  }
  return { completed, examined: pending.length };
};

export const isAccountMediaRemoved = async (key: string) => {
  if (!ACCOUNT_MEDIA_PREFIXES.some((prefix) => key.startsWith(prefix))) return false;
  const item = await prisma.account_media_deletion.findUnique({
    where: {
      identity_hash: mediaDeletionIdentity(
        "cloudflare_r2",
        PUBLIC_BUCKET?.trim() || "unknown",
        key,
      ),
    },
  });
  return Boolean(item && !(await hasOtherReference(item)));
};

export const drainAccountMediaDeletions = async (ownerId: string) => {
  // Failures are deferred by backoff; each successful batch makes forward progress.
  while ((await processAccountMediaDeletions({ ownerId })).examined === 25) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
export const startAccountMediaCleanup = () => {
  if (timer || process.env.ACCOUNT_MEDIA_CLEANUP_ENABLED !== "true") return;
  timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await processAccountMediaDeletions();
    } catch {
      console.error("[ACCOUNT MEDIA] Cleanup pending; will retry.");
    } finally {
      running = false;
    }
  }, 60_000);
  timer.unref();
};
export const stopAccountMediaCleanup = () => {
  if (timer) clearInterval(timer);
  timer = null;
};
