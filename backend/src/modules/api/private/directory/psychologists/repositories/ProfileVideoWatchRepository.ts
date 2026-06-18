import prisma from "@/infra/database/prisma";
import type {
  DirectoryPsychologistVideoWatchResponse,
  IProfileVideoWatchDTO,
} from "../DTOs/IProfileVideoWatchDTO";
import { ProfileRepository } from "./ProfileRepository";

const MAX_VIDEO_SECONDS = 60 * 60;
const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

const clampInt = (value: unknown, max = MAX_VIDEO_SECONDS) => {
  const numberValue = Number(value ?? 0);
  if (!Number.isFinite(numberValue)) return 0;

  return Math.min(max, Math.max(0, Math.round(numberValue)));
};

const clampReplayCount = (value: unknown) => clampInt(value, 999);

const resolveMilestone = (
  payloadValue: unknown,
  maxPosition: number,
  duration: number,
  target: number,
) => {
  if (payloadValue === true) return true;
  if (duration <= 0) return false;

  return maxPosition / duration >= target;
};

const resolveRetentionBuckets = (
  maxPosition: number,
  duration: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (duration <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPosition / duration) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
};

const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

const mergeRetentionBuckets = (...buckets: number[][]) =>
  Array.from(new Set(buckets.flat())).sort((a, b) => a - b);

export class ProfileVideoWatchRepository {
  async track(
    data: IProfileVideoWatchDTO,
  ): Promise<DirectoryPsychologistVideoWatchResponse & { reason?: "not_found" | "self_view" }> {
    const psychologistId = data.p.id;
    const viewerId = data.auth?.id ?? null;

    if (viewerId && viewerId === psychologistId) {
      return { tracked: false, reason: "self_view" };
    }

    const profileRepository = new ProfileRepository();
    const hasPublishedProfile = await profileRepository.hasPublishedProfile(psychologistId);

    if (!hasPublishedProfile) {
      return { tracked: false, reason: "not_found" };
    }

    const profile = await prisma.psychologist_profile.findFirst({
      where: {
        user_id: psychologistId,
        deleted: false,
      },
      select: {
        video_url: true,
      },
    });

    const durationSeconds = clampInt(data.b.duration_seconds);
    const maxPositionSeconds = clampInt(
      data.b.max_position_seconds,
      durationSeconds || MAX_VIDEO_SECONDS,
    );
    const watchedSeconds = clampInt(data.b.watched_seconds, durationSeconds || MAX_VIDEO_SECONDS);
    const replayCount = clampReplayCount(data.b.replay_count);
    const milestone25 = resolveMilestone(
      data.b.milestone_25,
      maxPositionSeconds,
      durationSeconds,
      0.25,
    );
    const milestone50 = resolveMilestone(
      data.b.milestone_50,
      maxPositionSeconds,
      durationSeconds,
      0.5,
    );
    const milestone75 = resolveMilestone(
      data.b.milestone_75,
      maxPositionSeconds,
      durationSeconds,
      0.75,
    );
    const milestone100 =
      data.b.milestone_100 === true ||
      Boolean(data.b.completed) ||
      resolveMilestone(data.b.milestone_100, maxPositionSeconds, durationSeconds, 0.98);
    const completed = Boolean(data.b.completed || milestone100);
    const retentionBuckets = resolveRetentionBuckets(
      maxPositionSeconds,
      durationSeconds,
      completed,
    );

    const existing = await prisma.profile_video_watch_session.findFirst({
      where: {
        psychologist_id: psychologistId,
        session_key: data.b.session_key,
      },
    });

    if (!existing) {
      await prisma.profile_video_watch_session.create({
        data: {
          psychologist_id: psychologistId,
          viewer_id: viewerId,
          session_key: data.b.session_key,
          video_url: profile?.video_url ?? null,
          duration_seconds: durationSeconds,
          watched_seconds: watchedSeconds,
          max_position_seconds: maxPositionSeconds,
          replay_count: replayCount,
          completed,
          milestone_25: milestone25,
          milestone_50: milestone50,
          milestone_75: milestone75,
          milestone_100: milestone100,
          retention_buckets: retentionBuckets,
          last_event_at: new Date(),
        },
      });

      return { tracked: true };
    }

    const mergedMaxPositionSeconds = Math.max(existing.max_position_seconds, maxPositionSeconds);
    const mergedDurationSeconds = Math.max(existing.duration_seconds, durationSeconds);
    const mergedCompleted = existing.completed || completed;
    const mergedRetentionBuckets = resolveRetentionBuckets(
      mergedMaxPositionSeconds,
      mergedDurationSeconds,
      mergedCompleted,
    );

    await prisma.profile_video_watch_session.update({
      where: {
        id: existing.id,
      },
      data: {
        deleted: false,
        deletedAt: null,
        viewer_id: existing.viewer_id ?? viewerId,
        video_url: profile?.video_url ?? existing.video_url,
        duration_seconds: mergedDurationSeconds,
        watched_seconds: Math.max(existing.watched_seconds, watchedSeconds),
        max_position_seconds: mergedMaxPositionSeconds,
        replay_count: Math.max(existing.replay_count, replayCount),
        completed: mergedCompleted,
        milestone_25: existing.milestone_25 || milestone25,
        milestone_50: existing.milestone_50 || milestone50,
        milestone_75: existing.milestone_75 || milestone75,
        milestone_100: existing.milestone_100 || milestone100,
        retention_buckets: mergeRetentionBuckets(
          normalizeRetentionBuckets(existing.retention_buckets),
          retentionBuckets,
          mergedRetentionBuckets,
        ),
        last_event_at: new Date(),
      },
    });

    return { tracked: true };
  }
}
