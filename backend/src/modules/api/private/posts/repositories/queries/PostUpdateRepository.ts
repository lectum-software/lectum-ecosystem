import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { canAssociateVideoAssetReferences } from "@/modules/video-assets/association-guard";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  IPostUpdateDTO,
  IPostUpdateReplyDTO,
  PostDetailResponse,
  PostMutationResult,
  PostReplyDTO,
} from "../../DTOs/IPostDTO";
import {
  type CurrentVote,
  normalizeVoteValue,
  replyBaseSelect,
  toReplyResponse,
} from "../support/post-response";
import { findPublishedPost } from "../support/reply-tree";

import type { PostCoreRepository } from "./PostCoreRepository";
import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostUpdateRepository extends PostRepositoryContext {
  constructor(private readonly coreRepository: PostCoreRepository) {
    super();
  }
  async updatePost(data: IPostUpdateDTO): Promise<PostMutationResult<PostDetailResponse["post"]>> {
    const result = await withSerializableTransaction(
      async (transaction): Promise<PostMutationResult<true>> => {
        const post = await findPublishedPost(data.p.id, transaction);
        if (!post) return { kind: "not_found" };
        if (post.author_id !== data.auth.id) return { kind: "forbidden" };
        const author = await transaction.user.findFirst({
          where: { id: post.author_id, active: true, deleted: false },
          select: { id: true },
        });
        if (!author) return { kind: "forbidden" };
        const community = await transaction.community.findUnique({
          where: { id: post.community_id },
          select: { slug: true },
        });
        if (!community) return { kind: "not_found" };
        if (
          !(await canAssociateVideoAssetReferences(transaction, {
            ownerId: author.id,
            contextId: community.slug,
            purpose: "community_post",
            references: [
              data.b.mediaUrl,
              ...(data.b.mediaItems ?? []).map((item) => item.mediaUrl),
            ],
          }))
        )
          return { kind: "invalid_media" };

        const mediaItemsChangeRequested = Object.hasOwn(data.b, "mediaItems");
        const mediaChangeRequested =
          Object.hasOwn(data.b, "mediaUrl") ||
          Object.hasOwn(data.b, "mediaType") ||
          Object.hasOwn(data.b, "thumbnailUrl") ||
          mediaItemsChangeRequested;
        const updateData: Prisma.community_postUpdateInput = {
          content: data.b.content,
          edited_at: new Date(),
          title: data.b.title,
        };

        if (mediaChangeRequested) {
          if (Object.hasOwn(data.b, "mediaUrl")) updateData.media_url = data.b.mediaUrl ?? null;
          if (Object.hasOwn(data.b, "mediaType")) updateData.media_type = data.b.mediaType ?? null;
          if (Object.hasOwn(data.b, "thumbnailUrl")) {
            updateData.thumbnail_url = data.b.thumbnailUrl ?? null;
          }
        }

        if (mediaItemsChangeRequested) {
          const mediaItems = data.b.mediaItems ?? [];
          await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: updateData,
          });
          await transaction.community_post_media.updateMany({
            data: {
              deleted: true,
              deletedAt: new Date(),
            },
            where: {
              deleted: false,
              post_id: post.id,
            },
          });

          if (mediaItems.length > 0) {
            await transaction.community_post_media.createMany({
              data: mediaItems.map((mediaItem, index) => ({
                media_url: mediaItem.mediaUrl.trim(),
                media_type: "image",
                position: typeof mediaItem.position === "number" ? mediaItem.position : index,
                post_id: post.id,
              })),
            });
          }
        } else {
          await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: updateData,
          });
        }

        return { kind: "ok", data: true };
      },
    );
    if (result.kind !== "ok") return result;

    const updated = await this.coreRepository.show({
      auth: data.auth,
      p: data.p,
    });

    if (!updated) return { kind: "not_found" };

    return {
      kind: "ok",
      data: updated.post,
    };
  }

  async updateReply(data: IPostUpdateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const result = await withSerializableTransaction(async (transaction) => {
      const post = await findPublishedPost(data.p.id, transaction);
      if (!post) return { kind: "not_found" as const };

      const reply = await transaction.post_reply.findFirst({
        where: {
          id: data.p.replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
          author_id: true,
          content: true,
          media_type: true,
          media_url: true,
          thumbnail_url: true,
          author: {
            select: {
              role: true,
            },
          },
        },
      });

      if (!reply) return { kind: "invalid_target" as const };
      if (reply.author_id !== data.auth.id) return { kind: "forbidden" as const };

      const author = await transaction.user.findFirst({
        where: { id: reply.author_id, active: true, deleted: false },
        select: { id: true },
      });
      if (!author) return { kind: "forbidden" as const };
      if (
        !(await canAssociateVideoAssetReferences(transaction, {
          ownerId: author.id,
          contextId: post.id,
          purpose: "community_reply",
          references: [data.b.mediaUrl],
        }))
      )
        return { kind: "invalid_media" as const };

      const mediaChangeRequested =
        Object.hasOwn(data.b, "mediaUrl") ||
        Object.hasOwn(data.b, "mediaType") ||
        Object.hasOwn(data.b, "thumbnailUrl");
      const contentChangeRequested = Object.hasOwn(data.b, "content");
      const content = contentChangeRequested
        ? String(data.b.content ?? "").trim()
        : reply.content.trim();
      const nextMediaUrl = Object.hasOwn(data.b, "mediaUrl")
        ? (data.b.mediaUrl ?? null)
        : reply.media_url;
      const nextMediaType = Object.hasOwn(data.b, "mediaType")
        ? (data.b.mediaType ?? null)
        : reply.media_type;
      const nextThumbnailUrl = Object.hasOwn(data.b, "thumbnailUrl")
        ? (data.b.thumbnailUrl ?? null)
        : reply.thumbnail_url;

      if (!content && !nextMediaUrl && !nextMediaType) {
        return { kind: "invalid_content" as const };
      }

      const updateData: Prisma.post_replyUpdateInput = {
        content,
        edited_at: new Date(),
      };

      if (mediaChangeRequested) {
        if (Object.hasOwn(data.b, "mediaUrl")) updateData.media_url = data.b.mediaUrl ?? null;
        if (Object.hasOwn(data.b, "mediaType")) updateData.media_type = data.b.mediaType ?? null;
        if (Object.hasOwn(data.b, "thumbnailUrl") || Object.hasOwn(data.b, "mediaType")) {
          updateData.thumbnail_url = nextMediaType === "video" ? nextThumbnailUrl : null;
        }
      }

      const updated = await transaction.post_reply.update({
        where: {
          id: reply.id,
        },
        data: updateData,
        select: replyBaseSelect,
      });

      return { kind: "ok" as const, updated, post };
    });
    if (result.kind !== "ok") return result;
    const { updated, post } = result;

    const [currentVote, currentSave] = await Promise.all([
      prisma.post_vote.findFirst({
        where: {
          user_id: data.auth.id!,
          reply_id: updated.id,
          deleted: false,
        },
        select: {
          value: true,
        },
      }),
      prisma.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: updated.id,
          },
        },
        select: {
          deleted: true,
        },
      }),
    ]);
    const voteMap = new Map<string, CurrentVote>([
      [updated.id, normalizeVoteValue(currentVote?.value)],
    ]);
    const savedReplyIds = new Set<string>();

    if (currentSave && !currentSave.deleted) {
      savedReplyIds.add(updated.id);
    }

    return {
      kind: "ok",
      data: toReplyResponse(updated, voteMap, savedReplyIds, {
        postAnonymous: post.author.role !== "psicologo" && post.anonymous,
        postAuthorId: post.author_id,
      }),
    };
  }
}
