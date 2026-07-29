import type { Request } from "express";
import type { user } from "@/interfaces/objects";

export type ContentAttentionTargetType = "post" | "reply";

export type ContentAttentionBody = {
  attention_seconds: number;
  path?: string | null;
  session_id: string;
  target_id: string;
  target_type: ContentAttentionTargetType;
  visitor_id: string;
};

export type IContentAttentionDTO = Request & {
  b: ContentAttentionBody;
  auth?: user | null;
};

export type ContentAttentionTarget = {
  authorId: string;
  communityId: string;
  postId: string | null;
  replyId: string | null;
  targetId: string;
  targetType: ContentAttentionTargetType;
};

export type ContentAttentionUpsertInput = {
  attentionSeconds: number;
  communityId: string;
  postId: string | null;
  psychologistId: string;
  replyId: string | null;
  sessionId: string;
  sessionKey: string;
  sourcePath: string | null;
  targetId: string;
  targetType: ContentAttentionTargetType;
  viewerId: string | null;
  visitorId: string;
};

export type ContentAttentionResult = {
  attention_seconds: number;
  id: string | null;
  session_id: string;
  skipped_reason: "self_view" | null;
  target_id: string;
  target_type: ContentAttentionTargetType;
  tracked: boolean;
  user_id: string | null;
  visitor_id: string;
};
