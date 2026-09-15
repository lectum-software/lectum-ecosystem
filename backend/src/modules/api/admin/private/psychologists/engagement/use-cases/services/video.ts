import type {
  AdminPsychologistStatisticsDTO,
  AdminPsychologistStatisticsPeriod,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import {
  type AdminPsychologistEngagementRepository,
  PROFILE_VIDEO_ACTION_TYPES,
  type ProfileVideoActionType,
} from "../../repositories/AdminPsychologistEngagementRepository";
import {
  metric,
  PRESENTATION_VIDEO_ANALYSIS_SOURCE,
  roundPercent,
  VIDEO_EXPLORE_POSITION_SOURCE,
} from "./business-content";
import {
  buildComparison,
  buildPositionComparison,
  RETENTION_BUCKETS,
  sum,
} from "./visibility-series";

export type VideoSessions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoSessions"]>
>;

export type VideoActionEvents = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoActionEvents"]>
>;

export type SearchResultImpressions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listSearchResultImpressions"]>
>;

export const countVideoActionEvents = (actions: VideoActionEvents) => {
  const counts = new Map<ProfileVideoActionType, number>(
    PROFILE_VIDEO_ACTION_TYPES.map((actionType) => [actionType, 0]),
  );

  for (const action of actions) {
    const actionType = action.action_type as ProfileVideoActionType;
    if (!counts.has(actionType)) continue;
    counts.set(actionType, (counts.get(actionType) ?? 0) + 1);
  }

  return {
    favorites_from_video: counts.get("psychologist_video_favorite") ?? 0,
    profile_accesses_from_video: counts.get("psychologist_video_profile_access") ?? 0,
    shares_from_video: counts.get("psychologist_video_share") ?? 0,
    whatsapp_clicks_from_video: counts.get("psychologist_video_whatsapp_click") ?? 0,
  };
};

export const videoPercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
};

export const averageSearchResultPosition = (impressions: SearchResultImpressions) => {
  const positions = impressions
    .map((impression) => impression.search_result_position)
    .filter(
      (position): position is number =>
        typeof position === "number" && Number.isFinite(position) && position > 0,
    );

  if (positions.length === 0) return null;

  return Math.round((sum(positions) / positions.length) * 10) / 10;
};

export const buildExplorePositionMetric = (
  current: SearchResultImpressions,
  previous: SearchResultImpressions,
  period: AdminPsychologistStatisticsPeriod,
) => {
  const currentPosition = averageSearchResultPosition(current);
  const previousPosition = averageSearchResultPosition(previous);

  return metric({
    available: currentPosition !== null,
    comparison:
      currentPosition !== null
        ? buildPositionComparison(currentPosition, previousPosition, period)
        : null,
    id: "average_explore_position",
    label: "Posição média no Explorar",
    source: VIDEO_EXPLORE_POSITION_SOURCE,
    unavailable_reason:
      currentPosition !== null
        ? null
        : "Nenhuma impressão com posição confiável foi registrada no Explorar no período.",
    unit: "position",
    value: currentPosition,
  });
};

export const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

export const deriveRetentionBucketsFromPosition = (
  maxPositionSeconds: number,
  durationSeconds: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (durationSeconds <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPositionSeconds / durationSeconds) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
};

export const buildSessionRetentionBuckets = (session: VideoSessions[number]) => {
  const persistedBuckets = normalizeRetentionBuckets(session.retention_buckets);
  const derivedBuckets = deriveRetentionBucketsFromPosition(
    session.max_position_seconds,
    session.duration_seconds,
    session.completed || session.milestone_100,
  );
  const legacyMilestones = [
    session.milestone_25 ? 25 : null,
    session.milestone_50 ? 50 : null,
    session.milestone_75 ? 75 : null,
    session.milestone_100 ? 100 : null,
  ].filter((bucket): bucket is number => typeof bucket === "number");

  return new Set([...persistedBuckets, ...derivedBuckets, ...legacyMilestones]);
};

export const filterCurrentPresentationVideoSessions = (
  sessions: VideoSessions,
  profile: { user_id: string; video_url: string | null },
) => {
  if (!profile.video_url) return [];

  return sessions.filter(
    (session) =>
      session.video_url === profile.video_url &&
      (session.viewer_id === null || session.viewer_id !== profile.user_id) &&
      (session.watched_seconds > 0 ||
        session.max_position_seconds > 0 ||
        session.completed ||
        session.milestone_100),
  );
};

export const buildVideoMetrics = (sessions: VideoSessions) => {
  const total = sessions.length;
  const sessionRetentionBuckets = sessions.map(buildSessionRetentionBuckets);
  const completions = sessionRetentionBuckets.filter((buckets) => buckets.has(100)).length;
  const replaySessions = sessions.filter((session) => session.replay_count > 0).length;
  const durationSeconds =
    sessions.reduce((max, session) => Math.max(max, session.duration_seconds), 0) || null;
  const totalWatchedSeconds = sum(sessions.map((session) => session.watched_seconds));
  const averageWatchSeconds = total > 0 ? Math.round(totalWatchedSeconds / total) : 0;
  const averageRetention =
    total > 0 && durationSeconds
      ? videoPercentage(Math.min(averageWatchSeconds, durationSeconds), durationSeconds)
      : 0;

  return {
    average_watch_seconds: averageWatchSeconds,
    average_retention_percent: averageRetention,
    completions,
    duration_seconds: durationSeconds,
    replay_rate_percent: total > 0 ? roundPercent((replaySessions / total) * 100) : 0,
    sessions: total,
  };
};

export const buildVideoRetention = (
  sessions: VideoSessions,
): AdminPsychologistStatisticsDTO["video"]["retention"] => {
  const total = sessions.length;
  const sessionRetentionBuckets = sessions.map(buildSessionRetentionBuckets);

  return RETENTION_BUCKETS.map((bucket) => {
    const viewers = sessionRetentionBuckets.filter((buckets) => buckets.has(bucket)).length;

    return {
      label: `${bucket}%`,
      percentage: videoPercentage(viewers, total),
      position_percent: bucket,
    };
  });
};

export const buildVideoRetentionDropoff = (
  retention: AdminPsychologistStatisticsDTO["video"]["retention"],
  durationSeconds: number | null,
  sessionsCount: number,
): AdminPsychologistStatisticsDTO["video"]["retention_dropoff"] => {
  const retentionTimeline = [
    {
      percentage: sessionsCount > 0 ? 100 : 0,
      position_percent: 0,
    },
    ...retention,
  ];
  let dropoff: AdminPsychologistStatisticsDTO["video"]["retention_dropoff"] = null;

  for (let index = 1; index < retentionTimeline.length; index += 1) {
    const previous = retentionTimeline[index - 1]!;
    const current = retentionTimeline[index]!;
    const rateDrop = Math.max(0, previous.percentage - current.percentage);

    if (rateDrop > (dropoff?.rate_drop ?? 0)) {
      dropoff = {
        from_milestone: previous.position_percent,
        to_milestone: current.position_percent,
        rate_drop: rateDrop,
        from_seconds: durationSeconds
          ? Math.round((durationSeconds * previous.position_percent) / 100)
          : 0,
        to_seconds: durationSeconds
          ? Math.round((durationSeconds * current.position_percent) / 100)
          : 0,
      };
    }
  }

  if (!dropoff || dropoff.rate_drop <= 0) return null;

  return dropoff;
};

export const buildVideo = (
  profile: {
    cover_image_url: string | null;
    user_id: string;
    video_cover_url: string | null;
    video_url: string | null;
  },
  sessions: VideoSessions,
  previousSessions: VideoSessions,
  actions: VideoActionEvents,
  previousActions: VideoActionEvents,
  searchResults: SearchResultImpressions,
  previousSearchResults: SearchResultImpressions,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistStatisticsDTO["video"] => {
  const currentVideoSessions = filterCurrentPresentationVideoSessions(sessions, profile);
  const previousCurrentVideoSessions = filterCurrentPresentationVideoSessions(
    previousSessions,
    profile,
  );
  const total = currentVideoSessions.length;
  const metrics = buildVideoMetrics(currentVideoSessions);
  const previousMetrics = buildVideoMetrics(previousCurrentVideoSessions);
  const actionMetrics = countVideoActionEvents(actions);
  const previousActionMetrics = countVideoActionEvents(previousActions);
  const retention = buildVideoRetention(currentVideoSessions);
  const retentionDropoff = buildVideoRetentionDropoff(
    retention,
    metrics.duration_seconds,
    metrics.sessions,
  );
  const { duration_seconds: durationSeconds, ...metricValues } = metrics;

  return {
    available: total > 0,
    comparisons: {
      average_retention_percent: buildComparison(
        metrics.average_retention_percent,
        previousMetrics.average_retention_percent,
        period,
      ),
      favorites_from_video: buildComparison(
        actionMetrics.favorites_from_video,
        previousActionMetrics.favorites_from_video,
        period,
      ),
      profile_accesses_from_video: buildComparison(
        actionMetrics.profile_accesses_from_video,
        previousActionMetrics.profile_accesses_from_video,
        period,
      ),
      replay_rate_percent: buildComparison(
        metrics.replay_rate_percent,
        previousMetrics.replay_rate_percent,
        period,
      ),
      shares_from_video: buildComparison(
        actionMetrics.shares_from_video,
        previousActionMetrics.shares_from_video,
        period,
      ),
      sessions: buildComparison(metrics.sessions, previousMetrics.sessions, period),
      whatsapp_clicks_from_video: buildComparison(
        actionMetrics.whatsapp_clicks_from_video,
        previousActionMetrics.whatsapp_clicks_from_video,
        period,
      ),
    },
    cover_url: profile.video_cover_url ?? profile.cover_image_url,
    duration_seconds: durationSeconds,
    explore_position: buildExplorePositionMetric(searchResults, previousSearchResults, period),
    metrics: {
      ...metricValues,
      ...actionMetrics,
    },
    retention,
    retention_dropoff: retentionDropoff,
    source: PRESENTATION_VIDEO_ANALYSIS_SOURCE,
    unavailable_reason: total > 0 ? null : "Nenhuma sessão de vídeo foi registrada no período.",
    video_url: profile.video_url,
  };
};
