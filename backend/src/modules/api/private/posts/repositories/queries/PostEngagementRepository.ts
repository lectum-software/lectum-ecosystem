import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  IPostReportDTO,
  IPostShareDTO,
  IPostVoteDTO,
  PostMutationResult,
  PostReportResponse,
  PostShareResponse,
  PostVoteResponse,
} from "../../DTOs/IPostDTO";
import {
  type CurrentVote,
  getDeviceId,
  normalizeShareChannel,
  normalizeVoteValue,
  SHARE_ANTI_SPAM_WINDOW_MS,
} from "../support/post-response";
import { findPublishedPost } from "../support/reply-tree";

import { PostRepositoryContext } from "./PostRepositoryContext";

export class PostEngagementRepository extends PostRepositoryContext {
  async report(data: IPostReportDTO): Promise<PostMutationResult<PostReportResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.p.replyId?.trim() || null;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const targetType = replyId ? "reply" : "post";
    const targetId = replyId || post.id;

    const report = await prisma.post_report.upsert({
      where: {
        target_type_target_id_reporter_id: {
          reporter_id: data.auth.id!,
          target_id: targetId,
          target_type: targetType,
        },
      },
      update: {
        deleted: false,
        deletedAt: null,
        description: data.b.description || null,
        post_id: post.id,
        reason: data.b.reason,
        reply_id: replyId,
        status: "pendente",
        target_id: targetId,
        target_type: targetType,
      },
      create: {
        description: data.b.description || null,
        post_id: post.id,
        reason: data.b.reason,
        reply_id: replyId,
        reporter_id: data.auth.id!,
        target_id: targetId,
        target_type: targetType,
      },
      select: {
        id: true,
        post_id: true,
        reply_id: true,
        target_id: true,
        target_type: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      kind: "ok",
      data: {
        id: report.id,
        post_id: report.post_id,
        reply_id: report.reply_id,
        target_id: report.target_id,
        target_type: report.target_type === "reply" ? "reply" : "post",
        reason: report.reason,
        description: report.description,
        status: report.status,
        created_at: report.createdAt,
      },
    };
  }

  async share(data: IPostShareDTO): Promise<PostMutationResult<PostShareResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.p.replyId?.trim() || data.b.replyId?.trim() || null;
    let targetAuthorId = post.author_id;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          author_id: true,
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };

      targetAuthorId = reply.author_id;
    }

    const actorId = data.auth?.id ?? null;
    const deviceId = getDeviceId(data.headers);
    const targetType = replyId ? "reply" : "post";

    if (actorId && actorId === targetAuthorId) {
      return {
        kind: "ok",
        data: {
          id: "",
          notification_event_id: null,
          post_id: post.id,
          reply_id: replyId,
          shared: false,
          target_type: targetType,
        },
      };
    }

    const actorScope: Prisma.post_shareWhereInput[] = [];
    if (actorId) actorScope.push({ user_id: actorId });
    if (deviceId) actorScope.push({ device_id: deviceId });

    if (actorScope.length > 0) {
      const recent = await prisma.post_share.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
        where: {
          OR: actorScope,
          createdAt: {
            gte: new Date(Date.now() - SHARE_ANTI_SPAM_WINDOW_MS),
          },
          deleted: false,
          post_id: post.id,
          reply_id: replyId,
        },
      });

      if (recent) {
        return {
          kind: "ok",
          data: {
            id: recent.id,
            notification_event_id: null,
            post_id: post.id,
            reply_id: replyId,
            shared: false,
            target_type: targetType,
          },
        };
      }
    }

    const share = await prisma.post_share.create({
      data: {
        channel: normalizeShareChannel(data.b.channel),
        device_id: deviceId ?? null,
        post_id: post.id,
        reply_id: replyId,
        target_type: targetType,
        user_id: actorId,
      },
      select: {
        id: true,
      },
    });

    return {
      kind: "ok",
      data: {
        id: share.id,
        notification_event_id: share.id,
        post_id: post.id,
        reply_id: replyId,
        shared: true,
        target_type: targetType,
      },
    };
  }

  async vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.b.replyId || null;
    const value = data.b.value;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const response = await withSerializableTransaction(async (transaction) => {
      const existing = replyId
        ? await transaction.post_vote.findUnique({
            where: {
              user_id_reply_id: {
                user_id: data.auth.id!,
                reply_id: replyId,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          })
        : await transaction.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: data.auth.id!,
                post_id: post.id,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          });

      const oldValue = existing && !existing.deleted ? normalizeVoteValue(existing.value) : null;
      const nextValue: CurrentVote = oldValue === value ? null : value;
      const upDelta = (nextValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
      const downDelta = (nextValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);

      if (existing) {
        await transaction.post_vote.update({
          where: {
            id: existing.id,
          },
          data: {
            value,
            deleted: nextValue === null,
            deletedAt: nextValue === null ? new Date() : null,
          },
        });
      } else if (nextValue !== null) {
        await transaction.post_vote.create({
          data: {
            user_id: data.auth.id!,
            post_id: replyId ? null : post.id,
            reply_id: replyId,
            value,
          },
        });
      }

      if (replyId) {
        const updatedReply = await transaction.post_reply.update({
          where: {
            id: replyId,
          },
          data: {
            upvotes_count: {
              increment: upDelta,
            },
            downvotes_count: {
              increment: downDelta,
            },
          },
          select: {
            upvotes_count: true,
            downvotes_count: true,
          },
        });

        return {
          target_type: "reply" as const,
          post_id: post.id,
          reply_id: replyId,
          value: nextValue,
          upvotes_count: updatedReply.upvotes_count,
          downvotes_count: updatedReply.downvotes_count,
        };
      }

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          upvotes_count: {
            increment: upDelta,
          },
          downvotes_count: {
            increment: downDelta,
          },
        },
        select: {
          upvotes_count: true,
          downvotes_count: true,
        },
      });

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        value: nextValue,
        upvotes_count: updatedPost.upvotes_count,
        downvotes_count: updatedPost.downvotes_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }
}
