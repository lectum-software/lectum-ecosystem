import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import { upsertOwnedVisitorSession } from "../../helpers/visitor-session";
import type {
  ContentVideoWatchTarget,
  ContentVideoWatchTargetType,
  ContentVideoWatchUpsertInput,
} from "../DTOs/IContentVideoWatchDTO";

const videoMediaWhere = {
  deleted: false,
  media_type: "video",
} satisfies Prisma.community_post_mediaWhereInput;

const videoWatchSelect = {
  completed: true,
  duration_seconds: true,
  id: true,
  max_position_seconds: true,
  milestone_25: true,
  milestone_50: true,
  milestone_75: true,
  milestone_100: true,
  replay_count: true,
  retention_buckets: true,
  session_id: true,
  viewer_id: true,
  visitor_id: true,
  watched_seconds: true,
} satisfies Prisma.content_video_watch_sessionSelect;

export class ContentVideoWatchRepository {
  async findPostTarget(postId: string): Promise<ContentVideoWatchTarget | null> {
    const post = await prisma.community_post.findFirst({
      select: {
        author_id: true,
        community_id: true,
        id: true,
        media_type: true,
        media_url: true,
        media_items: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
          select: {
            media_type: true,
            media_url: true,
          },
          take: 1,
          where: videoMediaWhere,
        },
      },
      where: {
        community: {
          deleted: false,
        },
        deleted: false,
        id: postId,
        status: "publicado",
      },
    });

    if (!post) return null;

    const videoMedia = post.media_items[0];
    const videoUrl =
      videoMedia?.media_type === "video"
        ? videoMedia.media_url
        : post.media_type === "video"
          ? post.media_url
          : null;

    return {
      authorId: post.author_id,
      communityId: post.community_id,
      postId: post.id,
      replyId: null,
      targetId: post.id,
      targetType: "post",
      videoUrl,
    };
  }

  async findReplyTarget(replyId: string): Promise<ContentVideoWatchTarget | null> {
    const reply = await prisma.post_reply.findFirst({
      select: {
        author_id: true,
        id: true,
        media_type: true,
        media_url: true,
        post: {
          select: {
            community_id: true,
          },
        },
        post_id: true,
      },
      where: {
        deleted: false,
        id: replyId,
        post: {
          community: {
            deleted: false,
          },
          deleted: false,
          status: "publicado",
        },
      },
    });

    if (!reply) return null;

    return {
      authorId: reply.author_id,
      communityId: reply.post.community_id,
      postId: reply.post_id,
      replyId: reply.id,
      targetId: reply.id,
      targetType: "reply",
      videoUrl: reply.media_type === "video" ? reply.media_url : null,
    };
  }

  async findTarget(type: ContentVideoWatchTargetType, targetId: string) {
    return type === "post" ? this.findPostTarget(targetId) : this.findReplyTarget(targetId);
  }

  async upsertSession(input: ContentVideoWatchUpsertInput) {
    return withSerializableTransaction(async (transaction) => {
      const existing = await transaction.content_video_watch_session.findUnique({
        select: videoWatchSelect,
        where: {
          target_type_target_id_session_key: {
            session_key: input.sessionKey,
            target_id: input.targetId,
            target_type: input.targetType,
          },
        },
      });

      if (existing) {
        const belongsToAnotherSession =
          existing.visitor_id !== input.visitorId || existing.session_id !== input.sessionId;
        const belongsToAnotherUser =
          Boolean(existing.viewer_id) && existing.viewer_id !== input.viewerId;

        if (belongsToAnotherSession || belongsToAnotherUser) return null;

        const currentBuckets = Array.isArray(existing.retention_buckets)
          ? existing.retention_buckets.filter(
              (bucket): bucket is number => typeof bucket === "number" && Number.isFinite(bucket),
            )
          : [];
        const retentionBuckets = [...new Set([...currentBuckets, ...input.retentionBuckets])].sort(
          (left, right) => left - right,
        );

        return transaction.content_video_watch_session.update({
          data: {
            completed: existing.completed || input.completed,
            duration_seconds: Math.max(existing.duration_seconds, input.durationSeconds),
            last_event_at: new Date(),
            max_position_seconds: Math.max(existing.max_position_seconds, input.maxPositionSeconds),
            milestone_25: existing.milestone_25 || input.milestone25,
            milestone_50: existing.milestone_50 || input.milestone50,
            milestone_75: existing.milestone_75 || input.milestone75,
            milestone_100: existing.milestone_100 || input.milestone100,
            replay_count: Math.max(existing.replay_count, input.replayCount),
            retention_buckets: retentionBuckets,
            video_url: input.videoUrl,
            viewer_id: input.viewerId ?? undefined,
            watched_seconds: Math.max(existing.watched_seconds, input.watchedSeconds),
          },
          select: videoWatchSelect,
          where: { id: existing.id },
        });
      }

      return transaction.content_video_watch_session.create({
        data: {
          community_id: input.communityId,
          completed: input.completed,
          duration_seconds: input.durationSeconds,
          max_position_seconds: input.maxPositionSeconds,
          milestone_25: input.milestone25,
          milestone_50: input.milestone50,
          milestone_75: input.milestone75,
          milestone_100: input.milestone100,
          post_id: input.postId,
          replay_count: input.replayCount,
          reply_id: input.replyId,
          retention_buckets: input.retentionBuckets,
          session_id: input.sessionId,
          session_key: input.sessionKey,
          target_id: input.targetId,
          target_type: input.targetType,
          video_url: input.videoUrl,
          viewer_id: input.viewerId,
          visitor_id: input.visitorId,
          watched_seconds: input.watchedSeconds,
        },
        select: videoWatchSelect,
      });
    });
  }

  async upsertVisitorSession(visitorId: string, sessionId: string, userId?: string | null) {
    return upsertOwnedVisitorSession({
      sessionId,
      userId,
      visitorId,
    });
  }
}
