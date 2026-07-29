import type { Request } from "express";
import { error, msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import { sanitizePath } from "../../helpers/tracking";
import type { ContentAttentionResult, IContentAttentionDTO } from "../DTOs/IContentAttentionDTO";
import { ContentAttentionRepository } from "../repositories/ContentAttentionRepository";

type AuthenticatedRequest = Request & { auth?: user };

const MAX_ATTENTION_SECONDS = 24 * 60 * 60;

const normalizeAttentionSeconds = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return 0;

  return Math.min(Math.round(value), MAX_ATTENTION_SECONDS);
};

const sessionKeyFor = (visitorId: string, sessionId: string) => `${visitorId}:${sessionId}`;

export const store = async (req: Request) => {
  const data = req as Request & IContentAttentionDTO;
  const auth = (req as AuthenticatedRequest).auth;
  const repository = new ContentAttentionRepository();
  const userId = auth?.id ?? null;
  const targetType = data.b.target_type;
  const targetId = data.b.target_id;
  const target = await repository.findTarget(targetType, targetId);

  if (!target) {
    return {
      status: 404,
      ...error("content_attention_target_invalid", {}),
    };
  }

  if (userId && userId === target.authorId) {
    const result: ContentAttentionResult = {
      attention_seconds: 0,
      id: null,
      session_id: data.b.session_id,
      skipped_reason: "self_view",
      target_id: target.targetId,
      target_type: target.targetType,
      tracked: false,
      user_id: userId,
      visitor_id: data.b.visitor_id,
    };

    return {
      status: 200,
      ...msg("content_attention_skipped", {}),
      data: result,
    };
  }

  await repository.upsertVisitorSession(data.b.visitor_id, data.b.session_id, userId);

  const attentionSeconds = normalizeAttentionSeconds(data.b.attention_seconds);
  const stored = await repository.upsertSession({
    attentionSeconds,
    communityId: target.communityId,
    postId: target.postId,
    psychologistId: target.authorId,
    replyId: target.replyId,
    sessionId: data.b.session_id,
    sessionKey: sessionKeyFor(data.b.visitor_id, data.b.session_id),
    sourcePath: data.b.path ? sanitizePath(data.b.path) : null,
    targetId: target.targetId,
    targetType: target.targetType,
    viewerId: userId,
    visitorId: data.b.visitor_id,
  });

  const result: ContentAttentionResult = {
    attention_seconds: stored.attention_seconds,
    id: stored.id,
    session_id: data.b.session_id,
    skipped_reason: null,
    target_id: target.targetId,
    target_type: target.targetType,
    tracked: true,
    user_id: userId,
    visitor_id: data.b.visitor_id,
  };

  return {
    status: 200,
    ...msg("content_attention_tracked", {}),
    data: result,
  };
};
