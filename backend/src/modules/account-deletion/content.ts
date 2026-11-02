import { createHash } from "node:crypto";
import { PUBLIC_BUCKET } from "@/config/multer/s3";
import type { Prisma } from "@/external/generated/prisma/client";
import { isCloudflareStreamVideoUid } from "@/infra/video-stream";
import { publicFileKeyFromUrl } from "@/utils/public-origin";
import { REMOVED_ACCOUNT_CONTENT, retainedReplyAncestors } from "./content-policy";

export const ACCOUNT_MEDIA_PREFIXES = [
  "psychologist/avatar/",
  "psychologist/cover-image/",
  "psychologist/video/",
  "psychologist/video-cover/",
  "patient/avatar/",
  "posts/media/",
  "posts/share-artifacts/",
] as const;

export const mediaDeletionIdentity = (provider: string, namespace: string, key: string) =>
  createHash("sha256")
    .update(JSON.stringify([provider, namespace, key]))
    .digest("hex");

export const deleteAccountContent = async (
  tx: Prisma.TransactionClient,
  ownerId: string,
  now: Date,
) => {
  const [account, posts, ownReplies, assets, artifacts] = await Promise.all([
    tx.user.findUnique({ where: { id: ownerId }, include: { psychologist_profile: true } }),
    tx.community_post.findMany({ where: { author_id: ownerId }, include: { media_items: true } }),
    tx.post_reply.findMany({ where: { author_id: ownerId } }),
    tx.video_asset.findMany({ where: { owner_id: ownerId } }),
    tx.post_share_artifact.findMany({
      where: {
        OR: [{ reply_id: null, post: { author_id: ownerId } }, { reply: { author_id: ownerId } }],
      },
    }),
  ]);
  const postIds = [...new Set([...posts.map((p) => p.id), ...ownReplies.map((r) => r.post_id)])];
  const replies = await tx.post_reply.findMany({
    where: { post_id: { in: postIds } },
    select: { id: true, post_id: true, author_id: true, parent_reply_id: true, deleted: true },
  });
  const keepReplies = retainedReplyAncestors(replies, ownerId);
  const profile = account?.psychologist_profile;
  const urls = [
    account?.avatar,
    profile?.cover_image_url,
    profile?.video_url,
    profile?.video_cover_url,
    ...posts.flatMap((post) => [
      post.media_url,
      post.thumbnail_url,
      ...post.media_items.flatMap((media) => [media.media_url, media.thumbnail_url]),
    ]),
    ...ownReplies.flatMap((reply) => [reply.media_url, reply.thumbnail_url]),
    ...assets.flatMap((asset) => [asset.source_reference, asset.source_thumbnail_reference]),
    ...artifacts.map((artifact) => artifact.source_media_url),
  ];
  const keys = new Set(
    urls.flatMap((url) => {
      const key = publicFileKeyFromUrl(url, ACCOUNT_MEDIA_PREFIXES);
      return key ? [key] : [];
    }),
  );
  for (const artifact of artifacts) {
    const key = publicFileKeyFromUrl(`/public/files/${artifact.storage_key}`, [
      "posts/share-artifacts/",
    ]);
    if (key) keys.add(key);
  }
  const objects = [
    ...[...keys].map((key) => ({
      provider: "cloudflare_r2",
      storage_namespace: PUBLIC_BUCKET?.trim() || "unknown",
      object_key: key,
    })),
    ...assets
      .filter(
        (asset) =>
          asset.provider === "cloudflare_stream" && isCloudflareStreamVideoUid(asset.provider_uid),
      )
      .map((asset) => ({
        provider: "cloudflare_stream",
        storage_namespace: process.env.CLOUDFLARE_STREAM_ACCOUNT_ID?.trim() || "unknown",
        object_key: asset.provider_uid,
      })),
  ];
  if (objects.length) {
    await tx.account_media_deletion.createMany({
      data: objects.map((object) => ({
        ...object,
        owner_id: ownerId,
        identity_hash: mediaDeletionIdentity(
          object.provider,
          object.storage_namespace,
          object.object_key,
        ),
      })),
      skipDuplicates: true,
    });
  }

  // Remove the author's content even from previously soft-deleted records.
  for (const post of posts) {
    const keep =
      !post.deleted &&
      replies.some(
        (reply) => reply.post_id === post.id && !reply.deleted && reply.author_id !== ownerId,
      );
    await tx.community_post.update({
      where: { id: post.id },
      data: {
        title: REMOVED_ACCOUNT_CONTENT,
        content: REMOVED_ACCOUNT_CONTENT,
        media_url: null,
        media_type: null,
        thumbnail_url: null,
        anonymous: true,
        deleted: !keep,
        deletedAt: keep ? null : now,
      },
    });
  }
  await tx.community_post_media.updateMany({
    where: { post: { author_id: ownerId } },
    data: { deleted: true, deletedAt: now, media_url: "", thumbnail_url: null },
  });
  for (const reply of ownReplies) {
    const keep = !reply.deleted && keepReplies.has(reply.id);
    await tx.post_reply.update({
      where: { id: reply.id },
      data: {
        title: null,
        content: REMOVED_ACCOUNT_CONTENT,
        media_url: null,
        media_type: null,
        thumbnail_url: null,
        deleted: !keep,
        deletedAt: keep ? null : now,
      },
    });
  }
  for (const postId of postIds) {
    await tx.community_post.update({
      where: { id: postId },
      data: {
        replies_count: await tx.post_reply.count({ where: { post_id: postId, deleted: false } }),
      },
    });
  }
  await tx.video_asset.updateMany({
    where: { owner_id: ownerId },
    data: { deleted: true, deletedAt: now, status: "canceled" },
  });
  await tx.post_share_artifact.updateMany({
    where: { id: { in: artifacts.map((artifact) => artifact.id) } },
    data: { deleted: true, deletedAt: now, source_media_url: "", storage_key: "", file_name: null },
  });
  await tx.professional_review.updateMany({
    where: { author_id: ownerId },
    data: { comment: null },
  });
  await tx.professional_review.updateMany({
    where: { psychologist_id: ownerId },
    data: { response: null, responded_at: null },
  });
  await tx.community_suggestion.updateMany({
    where: { user_id: ownerId },
    data: { theme: REMOVED_ACCOUNT_CONTENT },
  });
};
