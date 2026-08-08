import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { visitor_session } from "@/interfaces/objects";
import { withSerializableTransaction } from "@/utils/prisma-transaction";
import type {
  ContentAttentionTarget,
  ContentAttentionTargetType,
  ContentAttentionUpsertInput,
} from "../DTOs/IContentAttentionDTO";

const attentionSelect = {
  attention_seconds: true,
  id: true,
} satisfies Prisma.content_attention_sessionSelect;

export class ContentAttentionRepository {
  readonly sessionRepository: ORM["visitor_session"];

  constructor() {
    this.sessionRepository = prisma.visitor_session;
  }

  async findPostTarget(postId: string): Promise<ContentAttentionTarget | null> {
    const post = await prisma.community_post.findFirst({
      select: {
        author_id: true,
        community_id: true,
        id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
        community: {
          deleted: false,
        },
        deleted: false,
        id: postId,
        status: "publicado",
      },
    });

    if (!post) return null;

    return {
      authorId: post.author_id,
      communityId: post.community_id,
      postId: post.id,
      replyId: null,
      targetId: post.id,
      targetType: "post",
    };
  }

  async findReplyTarget(replyId: string): Promise<ContentAttentionTarget | null> {
    const reply = await prisma.post_reply.findFirst({
      select: {
        author_id: true,
        id: true,
        post: {
          select: {
            community_id: true,
          },
        },
        post_id: true,
      },
      where: {
        author: {
          active: true,
          deleted: false,
          role: "psicologo",
        },
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
    };
  }

  async findTarget(type: ContentAttentionTargetType, targetId: string) {
    return type === "post" ? this.findPostTarget(targetId) : this.findReplyTarget(targetId);
  }

  async upsertSession(input: ContentAttentionUpsertInput) {
    return withSerializableTransaction(async (transaction) => {
      const existing = await transaction.content_attention_session.findUnique({
        select: attentionSelect,
        where: {
          target_type_target_id_session_key: {
            session_key: input.sessionKey,
            target_id: input.targetId,
            target_type: input.targetType,
          },
        },
      });

      if (existing) {
        return transaction.content_attention_session.update({
          data: {
            attention_seconds: Math.max(existing.attention_seconds, input.attentionSeconds),
            deleted: false,
            deletedAt: null,
            last_event_at: new Date(),
            source_path: input.sourcePath ?? undefined,
            viewer_id: input.viewerId ?? undefined,
          },
          select: attentionSelect,
          where: { id: existing.id },
        });
      }

      return transaction.content_attention_session.create({
        data: {
          attention_seconds: input.attentionSeconds,
          community_id: input.communityId,
          post_id: input.postId,
          psychologist_id: input.psychologistId,
          reply_id: input.replyId,
          session_id: input.sessionId,
          session_key: input.sessionKey,
          source_path: input.sourcePath,
          target_id: input.targetId,
          target_type: input.targetType,
          viewer_id: input.viewerId,
          visitor_id: input.visitorId,
        },
        select: attentionSelect,
      });
    });
  }

  async upsertVisitorSession(
    visitorId: string,
    sessionId: string,
    userId?: string | null,
  ): Promise<visitor_session> {
    const now = new Date();
    const updateData: Prisma.visitor_sessionUpdateInput = {
      last_seen_at: now,
    };

    if (userId) {
      updateData.user = {
        connect: {
          id: userId,
        },
      };
    }

    return this.sessionRepository.upsert({
      create: {
        device_type: "unknown",
        first_seen_at: now,
        last_seen_at: now,
        session_id: sessionId,
        user_id: userId ?? null,
        visitor_id: visitorId,
      },
      update: updateData,
      where: {
        visitor_id_session_id: {
          session_id: sessionId,
          visitor_id: visitorId,
        },
      },
    });
  }
}
