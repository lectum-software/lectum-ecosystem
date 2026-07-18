import type { Request } from "express";
import { error, msg } from "@/helpers/translate";
import type { user } from "@/interfaces/objects";
import type {
  ContentVideoWatchBody,
  ContentVideoWatchResult,
  ContentVideoWatchTargetType,
  IContentVideoWatchDTO,
} from "../DTOs/IContentVideoWatchDTO";
import { ContentVideoWatchRepository } from "../repositories/ContentVideoWatchRepository";

type AuthenticatedRequest = Request & { auth?: user };

const MAX_VIDEO_SECONDS = 24 * 60 * 60;
const MAX_REPLAY_COUNT = 100;
const RETENTION_BUCKET_STEP = 5;
const COMPLETION_THRESHOLD = 0.98;

const normalizeInteger = (value: number | null | undefined, max: number) => {
  if (!Number.isFinite(value ?? Number.NaN)) return 0;

  return Math.min(Math.max(0, Math.round(value ?? 0)), max);
};

const normalizeVideoUrl = (databaseUrl: string | null, bodyUrl?: string | null) => {
  const normalized = (databaseUrl || bodyUrl)?.trim();
  if (!normalized) return null;

  try {
    const parsed =
      normalized.startsWith("http://") || normalized.startsWith("https://")
        ? new URL(normalized)
        : new URL(normalized, "https://lectum.local");

    return parsed.origin === "https://lectum.local"
      ? parsed.pathname
      : `${parsed.origin}${parsed.pathname}`;
  } catch {
    return normalized.split(/[?#]/)[0] || null;
  }
};

const reachedPercent = (positionSeconds: number, durationSeconds: number) => {
  if (durationSeconds <= 0 || positionSeconds <= 0) return 0;

  return Math.min(100, (positionSeconds / durationSeconds) * 100);
};

const deriveRetentionBuckets = (
  body: ContentVideoWatchBody,
  maxPositionSeconds: number,
  durationSeconds: number,
) => {
  if (durationSeconds <= 0 || maxPositionSeconds <= 0) return [];

  const maxPercent = reachedPercent(maxPositionSeconds, durationSeconds);
  const safeReceivedBuckets = new Set(
    (body.retention_buckets ?? []).filter(
      (bucket) =>
        Number.isInteger(bucket) &&
        bucket >= RETENTION_BUCKET_STEP &&
        bucket <= 100 &&
        bucket % RETENTION_BUCKET_STEP === 0 &&
        bucket <= maxPercent + 0.5,
    ),
  );

  for (
    let bucket = RETENTION_BUCKET_STEP;
    bucket <= 100 && bucket <= maxPercent + 0.5;
    bucket += RETENTION_BUCKET_STEP
  ) {
    safeReceivedBuckets.add(bucket);
  }

  return [...safeReceivedBuckets].sort((left, right) => left - right);
};

const deriveMilestones = (buckets: number[], completed: boolean) => {
  const reached = new Set(buckets);

  return {
    milestone25: reached.has(25) || buckets.some((bucket) => bucket >= 25),
    milestone50: reached.has(50) || buckets.some((bucket) => bucket >= 50),
    milestone75: reached.has(75) || buckets.some((bucket) => bucket >= 75),
    milestone100: completed || reached.has(100) || buckets.some((bucket) => bucket >= 100),
  };
};

const normalizeTargetType = (value: ContentVideoWatchTargetType) => value;

const sessionKeyFor = (visitorId: string, sessionId: string) => `${visitorId}:${sessionId}`;

export const store = async (req: Request) => {
  const data = req as Request & IContentVideoWatchDTO;
  const auth = (req as AuthenticatedRequest).auth;
  const repository = new ContentVideoWatchRepository();
  const userId = auth?.id ?? null;
  const targetType = normalizeTargetType(data.b.target_type);
  const targetId = data.b.target_id;
  const target = await repository.findTarget(targetType, targetId);

  if (!target) {
    return {
      status: 404,
      ...error("content_video_watch_target_invalid", {}),
    };
  }

  const videoUrl = normalizeVideoUrl(target.videoUrl, data.b.video_url);
  if (!videoUrl) {
    return {
      status: 400,
      ...error("content_video_watch_media_invalid", {}),
    };
  }

  if (userId && userId === target.authorId) {
    const result: ContentVideoWatchResult = {
      completed: false,
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
      ...msg("content_video_watch_skipped", {}),
      data: result,
    };
  }

  await repository.upsertVisitorSession(data.b.visitor_id, data.b.session_id, userId);

  const durationSeconds = normalizeInteger(data.b.duration_seconds, MAX_VIDEO_SECONDS);
  const maxPositionSeconds = Math.min(
    normalizeInteger(data.b.max_position_seconds, MAX_VIDEO_SECONDS),
    durationSeconds > 0 ? durationSeconds : MAX_VIDEO_SECONDS,
  );
  const watchedSeconds = Math.min(
    normalizeInteger(data.b.watched_seconds, MAX_VIDEO_SECONDS),
    durationSeconds > 0 ? durationSeconds : MAX_VIDEO_SECONDS,
  );
  const replayCount = normalizeInteger(data.b.replay_count, MAX_REPLAY_COUNT);
  const completed =
    Boolean(data.b.completed) ||
    (durationSeconds > 0 && maxPositionSeconds / durationSeconds >= COMPLETION_THRESHOLD);
  const retentionBuckets = deriveRetentionBuckets(data.b, maxPositionSeconds, durationSeconds);
  const milestones = deriveMilestones(retentionBuckets, completed);
  const stored = await repository.upsertSession({
    communityId: target.communityId,
    completed,
    durationSeconds,
    maxPositionSeconds,
    postId: target.postId,
    replayCount,
    replyId: target.replyId,
    retentionBuckets,
    sessionId: data.b.session_id,
    sessionKey: sessionKeyFor(data.b.visitor_id, data.b.session_id),
    targetId: target.targetId,
    targetType: target.targetType,
    videoUrl,
    viewerId: userId,
    visitorId: data.b.visitor_id,
    watchedSeconds,
    ...milestones,
  });

  const result: ContentVideoWatchResult = {
    completed: stored.completed,
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
    ...msg("content_video_watch_tracked", {}),
    data: result,
  };
};
