import { createHash } from "node:crypto";
import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";

export const POST_SHARE_ARTIFACT_LAYOUT_VERSION = "lectum-share-v6-2026-08-23-android-video-frame";
export const POST_SHARE_ARTIFACT_TTL_DAYS = 7;

const shareAuthorSelect = {
  id: true,
  name: true,
  role: true,
  updatedAt: true,
  psychologist_profile: {
    select: {
      professional_first_name: true,
      professional_last_name: true,
      gender: true,
      cfp_verified_at: true,
      crp_status: true,
      subscriptions: {
        where: activeProfessionalEntitlementWhere(),
        select: {
          id: true,
          source: true,
        },
      },
    },
  },
} satisfies Prisma.userSelect;

const postShareArtifactTargetSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  edited_at: true,
  updatedAt: true,
  media_items: {
    where: {
      deleted: false,
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      media_url: true,
      media_type: true,
      updatedAt: true,
      position: true,
    },
  },
  author: {
    select: shareAuthorSelect,
  },
} satisfies Prisma.community_postSelect;

const replyShareArtifactTargetSelect = {
  id: true,
  content: true,
  media_url: true,
  media_type: true,
  edited_at: true,
  updatedAt: true,
  parent_reply_id: true,
  parent_reply: {
    select: {
      content: true,
      edited_at: true,
      updatedAt: true,
    },
  },
  post: {
    select: {
      id: true,
      title: true,
      edited_at: true,
      updatedAt: true,
    },
  },
  author: {
    select: shareAuthorSelect,
  },
} satisfies Prisma.post_replySelect;

type PostShareArtifactTarget = Prisma.community_postGetPayload<{
  select: typeof postShareArtifactTargetSelect;
}>;

type ReplyShareArtifactTarget = Prisma.post_replyGetPayload<{
  select: typeof replyShareArtifactTargetSelect;
}>;

export type ShareArtifactTarget = {
  cacheKey: string;
  layoutVersion: string;
  postId: string;
  replyId: string | null;
  sourceFingerprint: string;
  sourceMediaUrl: string;
  storageKeyPrefix: string;
  targetType: "post" | "reply";
};

export type ShareArtifactRecord = {
  artifact_url: string;
  content_type: string;
  expires_at: Date;
  file_name: string | null;
  size_bytes: number;
  storage_key: string;
};

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const serializeDate = (value?: Date | null) => value?.toISOString() ?? null;

const createSourceFingerprint = (value: unknown) => sha256(JSON.stringify(value));

const createCacheKey = (target: {
  postId: string;
  replyId?: string | null;
  sourceFingerprint: string;
  sourceMediaUrl: string;
  targetType: "post" | "reply";
}) =>
  sha256(
    JSON.stringify({
      layoutVersion: POST_SHARE_ARTIFACT_LAYOUT_VERSION,
      postId: target.postId,
      replyId: target.replyId ?? null,
      sourceFingerprint: target.sourceFingerprint,
      sourceMediaUrl: target.sourceMediaUrl,
      targetType: target.targetType,
    }),
  ).slice(0, 40);

const isProfessionalVideoPost = (post: PostShareArtifactTarget) => {
  if (post.author.role !== "psicologo") return null;

  const firstMedia = post.media_items[0];
  if (firstMedia) {
    return firstMedia.media_type === "video" && firstMedia.media_url
      ? {
          mediaUpdatedAt: firstMedia.updatedAt,
          sourceMediaUrl: firstMedia.media_url,
        }
      : null;
  }

  return post.media_type === "video" && post.media_url
    ? {
        mediaUpdatedAt: post.updatedAt,
        sourceMediaUrl: post.media_url,
      }
    : null;
};

const toPostShareArtifactTarget = (post: PostShareArtifactTarget): ShareArtifactTarget | null => {
  const media = isProfessionalVideoPost(post);
  if (!media) return null;

  const sourceFingerprint = createSourceFingerprint({
    author: post.author,
    content: post.content,
    editedAt: serializeDate(post.edited_at),
    mediaUpdatedAt: serializeDate(media.mediaUpdatedAt),
    title: post.title,
    updatedAt: serializeDate(post.updatedAt),
  });
  const cacheKey = createCacheKey({
    postId: post.id,
    sourceFingerprint,
    sourceMediaUrl: media.sourceMediaUrl,
    targetType: "post",
  });

  return {
    cacheKey,
    layoutVersion: POST_SHARE_ARTIFACT_LAYOUT_VERSION,
    postId: post.id,
    replyId: null,
    sourceFingerprint,
    sourceMediaUrl: media.sourceMediaUrl,
    storageKeyPrefix: `posts/share-artifacts/${cacheKey}`,
    targetType: "post",
  };
};

const toReplyShareArtifactTarget = (
  reply: ReplyShareArtifactTarget,
): ShareArtifactTarget | null => {
  if (reply.author.role !== "psicologo" || reply.media_type !== "video" || !reply.media_url) {
    return null;
  }

  const sourceFingerprint = createSourceFingerprint({
    author: reply.author,
    content: reply.content,
    editedAt: serializeDate(reply.edited_at),
    parentReply: reply.parent_reply
      ? {
          content: reply.parent_reply.content,
          editedAt: serializeDate(reply.parent_reply.edited_at),
          updatedAt: serializeDate(reply.parent_reply.updatedAt),
        }
      : null,
    post: {
      editedAt: serializeDate(reply.post.edited_at),
      title: reply.post.title,
      updatedAt: serializeDate(reply.post.updatedAt),
    },
    updatedAt: serializeDate(reply.updatedAt),
  });
  const cacheKey = createCacheKey({
    postId: reply.post.id,
    replyId: reply.id,
    sourceFingerprint,
    sourceMediaUrl: reply.media_url,
    targetType: "reply",
  });

  return {
    cacheKey,
    layoutVersion: POST_SHARE_ARTIFACT_LAYOUT_VERSION,
    postId: reply.post.id,
    replyId: reply.id,
    sourceFingerprint,
    sourceMediaUrl: reply.media_url,
    storageKeyPrefix: `posts/share-artifacts/${cacheKey}`,
    targetType: "reply",
  };
};

export class PostShareArtifactRepository {
  async getTarget(input: {
    postId: string;
    replyId?: string | null;
  }): Promise<ShareArtifactTarget | null> {
    if (input.replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: input.replyId,
          post_id: input.postId,
          deleted: false,
          post: {
            deleted: false,
            status: "publicado",
            community: {
              active: true,
              deleted: false,
            },
          },
        },
        select: replyShareArtifactTargetSelect,
      });

      return reply ? toReplyShareArtifactTarget(reply) : null;
    }

    const post = await prisma.community_post.findFirst({
      where: {
        id: input.postId,
        deleted: false,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
      select: postShareArtifactTargetSelect,
    });

    return post ? toPostShareArtifactTarget(post) : null;
  }

  async findValidByCacheKey(cacheKey: string, now: Date): Promise<ShareArtifactRecord | null> {
    const artifact = await prisma.post_share_artifact.findFirst({
      where: {
        cache_key: cacheKey,
        deleted: false,
        expires_at: {
          gt: now,
        },
      },
      select: {
        content_type: true,
        expires_at: true,
        file_name: true,
        size_bytes: true,
        storage_key: true,
      },
    });

    if (!artifact) return null;

    return {
      artifact_url: "",
      content_type: artifact.content_type,
      expires_at: artifact.expires_at,
      file_name: artifact.file_name,
      size_bytes: artifact.size_bytes,
      storage_key: artifact.storage_key,
    };
  }

  async findStorageKeyByCacheKey(cacheKey: string) {
    return prisma.post_share_artifact.findUnique({
      where: {
        cache_key: cacheKey,
      },
      select: {
        storage_key: true,
      },
    });
  }

  async upsertArtifact(
    input: ShareArtifactTarget & {
      contentType: string;
      expiresAt: Date;
      fileName?: string | null;
      sizeBytes: number;
      storageKey: string;
    },
  ): Promise<ShareArtifactRecord> {
    const accessedAt = new Date();
    const artifact = await prisma.post_share_artifact.upsert({
      where: {
        cache_key: input.cacheKey,
      },
      create: {
        cache_key: input.cacheKey,
        content_type: input.contentType,
        expires_at: input.expiresAt,
        file_name: input.fileName ?? null,
        layout_version: input.layoutVersion,
        last_accessed_at: accessedAt,
        post_id: input.postId,
        reply_id: input.replyId,
        size_bytes: input.sizeBytes,
        source_fingerprint: input.sourceFingerprint,
        source_media_url: input.sourceMediaUrl,
        storage_key: input.storageKey,
        target_type: input.targetType,
      },
      update: {
        content_type: input.contentType,
        deleted: false,
        deletedAt: null,
        expires_at: input.expiresAt,
        file_name: input.fileName ?? null,
        layout_version: input.layoutVersion,
        last_accessed_at: accessedAt,
        post_id: input.postId,
        reply_id: input.replyId,
        size_bytes: input.sizeBytes,
        source_fingerprint: input.sourceFingerprint,
        source_media_url: input.sourceMediaUrl,
        storage_key: input.storageKey,
        target_type: input.targetType,
      },
      select: {
        content_type: true,
        expires_at: true,
        file_name: true,
        size_bytes: true,
        storage_key: true,
      },
    });

    return {
      artifact_url: "",
      content_type: artifact.content_type,
      expires_at: artifact.expires_at,
      file_name: artifact.file_name,
      size_bytes: artifact.size_bytes,
      storage_key: artifact.storage_key,
    };
  }

  async renewArtifact(
    input: ShareArtifactTarget & {
      accessedAt: Date;
      expiresAt: Date;
    },
  ) {
    await prisma.post_share_artifact.updateMany({
      where: {
        cache_key: input.cacheKey,
        deleted: false,
        layout_version: input.layoutVersion,
        source_fingerprint: input.sourceFingerprint,
        source_media_url: input.sourceMediaUrl,
      },
      data: {
        expires_at: input.expiresAt,
        last_accessed_at: input.accessedAt,
      },
    });
  }

  async listExpired(now: Date, limit: number) {
    return prisma.post_share_artifact.findMany({
      where: {
        deleted: false,
        expires_at: {
          lte: now,
        },
      },
      orderBy: [{ expires_at: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        storage_key: true,
      },
      take: limit,
    });
  }

  async markDeleted(id: string, now: Date) {
    await prisma.post_share_artifact.update({
      where: { id },
      data: {
        deleted: true,
        deletedAt: now,
      },
    });
  }
}
