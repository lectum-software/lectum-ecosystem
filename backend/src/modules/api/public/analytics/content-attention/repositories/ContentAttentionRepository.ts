import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import type { visitor_session } from "@/interfaces/objects";
import type {
  ContentAttentionTarget,
  ContentAttentionTargetType,
  ContentAttentionUpsertInput,
} from "../DTOs/IContentAttentionDTO";

const attentionSelect = {
  attention_seconds: true,
  id: true,
} satisfies Prisma.content_attention_sessionSelect;

type ContentAttentionRecord = Prisma.content_attention_sessionGetPayload<{
  select: typeof attentionSelect;
}>;

export class ContentAttentionRepository {
  readonly repository: ORM["content_attention_session"];
  readonly sessionRepository: ORM["visitor_session"];

  constructor() {
    this.repository = prisma.content_attention_session;
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

  async findSession(
    targetType: ContentAttentionTargetType,
    targetId: string,
    sessionKey: string,
  ): Promise<ContentAttentionRecord | null> {
    return this.repository.findUnique({
      select: attentionSelect,
      where: {
        target_type_target_id_session_key: {
          session_key: sessionKey,
          target_id: targetId,
          target_type: targetType,
        },
      },
    });
  }

  async createSession(input: ContentAttentionUpsertInput): Promise<ContentAttentionRecord> {
    return this.repository.create({
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
  }

  async updateSession(
    id: string,
    input: ContentAttentionUpsertInput,
    existing: ContentAttentionRecord,
  ): Promise<ContentAttentionRecord> {
    return this.repository.update({
      data: {
        attention_seconds: Math.max(existing.attention_seconds, input.attentionSeconds),
        deleted: false,
        deletedAt: null,
        last_event_at: new Date(),
        source_path: input.sourcePath ?? undefined,
        viewer_id: input.viewerId ?? undefined,
      },
      select: attentionSelect,
      where: { id },
    });
  }

  async upsertSession(input: ContentAttentionUpsertInput) {
    const existing = await this.findSession(input.targetType, input.targetId, input.sessionKey);
    if (existing) return this.updateSession(existing.id, input, existing);

    return this.createSession(input);
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
