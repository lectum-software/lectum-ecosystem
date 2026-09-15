import type { Request } from "express";

export type ContentVideoWatchTargetType = "post" | "reply";

export type ContentVideoWatchBody = {
  completed?: boolean;
  duration_seconds?: number | null;
  max_position_seconds?: number | null;
  replay_count?: number | null;
  retention_buckets?: number[] | null;
  session_id: string;
  target_id: string;
  target_type: ContentVideoWatchTargetType;
  video_url?: string | null;
  visitor_id: string;
  watched_seconds?: number | null;
};

export type IContentVideoWatchDTO = Request & {
  b: ContentVideoWatchBody;
};

export type ContentVideoWatchTarget = {
  authorId: string;
  communityId: string;
  postId: string | null;
  replyId: string | null;
  targetId: string;
  targetType: ContentVideoWatchTargetType;
  videoUrl: string | null;
};

export type ContentVideoWatchUpsertInput = {
  communityId: string;
  completed: boolean;
  durationSeconds: number;
  maxPositionSeconds: number;
  milestone25: boolean;
  milestone50: boolean;
  milestone75: boolean;
  milestone100: boolean;
  postId: string | null;
  replayCount: number;
  replyId: string | null;
  retentionBuckets: number[];
  sessionId: string;
  sessionKey: string;
  targetId: string;
  targetType: ContentVideoWatchTargetType;
  videoUrl: string | null;
  viewerId: string | null;
  visitorId: string;
  watchedSeconds: number;
};

export type ContentVideoWatchResult = {
  skipped_reason: "self_view" | "session_unavailable" | null;
  tracked: boolean;
};
