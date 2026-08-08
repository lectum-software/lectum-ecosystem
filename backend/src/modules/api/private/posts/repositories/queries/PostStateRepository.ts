import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  IPostDeleteDTO,
  IPostMuteDTO,
  IPostSaveDTO,
  PostDeleteResponse,
  PostMutationResult,
  PostMuteResponse,
  PostSaveResponse,
} from "../../DTOs/IPostDTO";
import { findPublishedPost } from "../support/reply-tree";

import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostStateRepository extends PostRepositoryContext {
  async save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      let saveId = existing?.id ?? null;

      if (existing) {
        if (existing.deleted) {
          const save = await transaction.post_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          });
          saveId = save.id;
        }
      } else {
        const save = await transaction.post_save.create({
          data: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
          select: {
            id: true,
          },
        });
        saveId = save.id;
      }

      const shouldIncrement = !existing || existing.deleted;
      const updatedPost = shouldIncrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                increment: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: true,
        saves_count: updatedPost.saves_count,
        notification_event_id: shouldIncrement ? saveId : null,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const shouldDecrement = Boolean(existing && !existing.deleted && post.saves_count > 0);
      const updatedPost = shouldDecrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                decrement: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: false,
        saves_count: updatedPost.saves_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async mute(data: IPostMuteDTO): Promise<PostMutationResult<PostMuteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    await withSerializableTransaction(async (transaction) => {
      const existing = await transaction.post_notification_mute.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_notification_mute.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
        return;
      }

      await transaction.post_notification_mute.create({
        data: {
          user_id: data.auth.id!,
          post_id: post.id,
        },
      });
    });

    return {
      kind: "ok",
      data: {
        post_id: post.id,
        muted: true,
      },
    };
  }

  async unmute(data: IPostMuteDTO): Promise<PostMutationResult<PostMuteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    const existing = await prisma.post_notification_mute.findUnique({
      where: {
        user_id_post_id: {
          user_id: data.auth.id!,
          post_id: post.id,
        },
      },
      select: {
        id: true,
        deleted: true,
      },
    });

    if (existing && !existing.deleted) {
      await prisma.post_notification_mute.update({
        where: {
          id: existing.id,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });
    }

    return {
      kind: "ok",
      data: {
        post_id: post.id,
        muted: false,
      },
    };
  }

  async deletePost(data: IPostDeleteDTO): Promise<PostMutationResult<PostDeleteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    const now = new Date();
    const response = await withSerializableTransaction(async (transaction) => {
      const shouldBlockProfessionalReplies = post.author.role !== "psicologo";
      const professionalRepliesCount = shouldBlockProfessionalReplies
        ? await transaction.post_reply.count({
            where: {
              post_id: post.id,
              deleted: false,
              author: {
                role: "psicologo",
              },
            },
          })
        : 0;

      if (shouldBlockProfessionalReplies && professionalRepliesCount > 0) {
        return null;
      }

      const deletedReplies = await transaction.post_reply.updateMany({
        where: {
          post_id: post.id,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          deleted: true,
          deletedAt: now,
          status: "removido",
        },
      });

      return {
        post_id: post.id,
        deleted: true,
        replies_deleted_count: deletedReplies.count,
      };
    });

    if (!response) return { kind: "professional_replies_block" };

    return {
      kind: "ok",
      data: response,
    };
  }
}
