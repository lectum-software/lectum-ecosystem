import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  PostMutationResult,
  PostReplyDeleteResponse,
  PostSaveResponse,
} from "../../DTOs/IPostDTO";
import { findPublishedPost, findPublishedReply } from "../support/reply-tree";

import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostReplyStateRepository extends PostRepositoryContext {
  async saveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_reply_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
      } else {
        await transaction.post_reply_save.create({
          data: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        });
      }

      const savesCount = await transaction.post_reply_save.count({
        where: {
          reply_id: reply.id,
          deleted: false,
        },
      });

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: true,
        saves_count: savesCount,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsaveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_reply_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const savesCount = await transaction.post_reply_save.count({
        where: {
          reply_id: reply.id,
          deleted: false,
        },
      });

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: false,
        saves_count: savesCount,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async deleteReply(
    data: IPostReplyDeleteDTO,
  ): Promise<PostMutationResult<PostReplyDeleteResponse>> {
    return withSerializableTransaction(
      async (transaction): Promise<PostMutationResult<PostReplyDeleteResponse>> => {
        // A autorização, a subárvore e o contador pertencem ao mesmo snapshot que
        // a exclusão. Um retry não pode reaproveitar IDs/contagem de uma tentativa antiga.
        const post = await findPublishedPost(data.p.id, transaction);
        if (!post) return { kind: "not_found" };

        const reply = await transaction.post_reply.findFirst({
          where: {
            id: data.p.replyId,
            post_id: post.id,
            deleted: false,
          },
          select: {
            id: true,
            author_id: true,
            author: {
              select: {
                role: true,
              },
            },
          },
        });

        if (!reply) return { kind: "invalid_target" };
        if (reply.author_id !== data.auth.id) return { kind: "forbidden" };

        const replies = await transaction.post_reply.findMany({
          where: {
            post_id: post.id,
            deleted: false,
          },
          select: {
            id: true,
            parent_reply_id: true,
            author: {
              select: {
                role: true,
              },
            },
          },
        });
        const childrenByParent = new Map<string, string[]>();

        for (const item of replies) {
          if (!item.parent_reply_id) continue;
          const children = childrenByParent.get(item.parent_reply_id) ?? [];
          children.push(item.id);
          childrenByParent.set(item.parent_reply_id, children);
        }

        const replyIds = new Set<string>();
        const stack = [reply.id];

        while (stack.length > 0) {
          const currentId = stack.pop();
          if (!currentId || replyIds.has(currentId)) continue;

          replyIds.add(currentId);
          for (const childId of childrenByParent.get(currentId) ?? []) {
            stack.push(childId);
          }
        }

        const ids = [...replyIds];
        const shouldBlockProfessionalReplies = reply.author.role !== "psicologo";
        const hasProfessionalDescendant =
          shouldBlockProfessionalReplies &&
          replies.some(
            (item) =>
              item.id !== reply.id && replyIds.has(item.id) && item.author.role === "psicologo",
          );

        if (hasProfessionalDescendant) {
          return { kind: "professional_replies_block" };
        }

        const now = new Date();

        const deletedReplies = await transaction.post_reply.updateMany({
          where: {
            id: {
              in: ids,
            },
            post_id: post.id,
            deleted: false,
          },
          data: {
            deleted: true,
            deletedAt: now,
          },
        });

        const repliesCount = await transaction.post_reply.count({
          where: { post_id: post.id, deleted: false },
        });
        const updatedPost = await transaction.community_post.update({
          where: {
            id: post.id,
          },
          data: {
            replies_count: repliesCount,
          },
          select: {
            replies_count: true,
          },
        });

        return {
          kind: "ok",
          data: {
            post_id: post.id,
            reply_ids: ids,
            deleted_count: deletedReplies.count,
            replies_count: updatedPost.replies_count,
          },
        };
      },
    );
  }
}
