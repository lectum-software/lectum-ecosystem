import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import {
  summarizePlatformHourlyActivity,
  summarizePlatformPeakActivityHours,
  summarizePlatformUsage,
  summarizePsychologistTrafficOrigins,
} from "@/utils/admin-psychologist-analytics";
import type {
  AdminPsychologistAvailabilityMetric,
  AdminPsychologistEngagementQuery,
  AdminPsychologistMetricComparison,
  AdminPsychologistPublicationItem,
  AdminPsychologistPublicationsDTO,
  AdminPsychologistPublicationsQuery,
  AdminPsychologistStatisticsDTO,
  AdminPsychologistStatisticsPeriod,
  AdminPsychologistStatisticsSeriesPoint,
  IAdminPsychologistPublicationsDTO,
  IAdminPsychologistStatisticsDTO,
} from "../DTOs/IAdminPsychologistEngagementDTO";
import {
  type AdminPsychologistEngagementPost,
  type AdminPsychologistEngagementReply,
  AdminPsychologistEngagementRepository,
  PROFILE_VIDEO_ACTION_TYPES,
  type ProfileVideoActionType,
} from "../repositories/AdminPsychologistEngagementRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;
type AdminPsychologistPublicationsSort = NonNullable<AdminPsychologistPublicationsQuery["sort"]>;
const PSYCHOLOGIST_PUBLICATIONS_SORTS = new Set<AdminPsychologistPublicationsSort>([
  "engagement",
  "oldest",
  "recent",
]);

const pad = (value: number) => String(value).padStart(2, "0");
const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfMonth = (date: Date) => startOfDate(new Date(date.getFullYear(), date.getMonth(), 1));

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(next, diff);
};

const startOfYear = (date: Date) => startOfDate(new Date(date.getFullYear(), 0, 1));

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDate(date) : endOfDate(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDate(from).getTime();
  const end = startOfDate(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

type PeriodResult =
  | {
      current: { end: Date; start: Date };
      labels: string[];
      period: AdminPsychologistStatisticsPeriod;
      previous: { end: Date; start: Date };
      success: true;
    }
  | { code: string; success: false };

const resolvePeriod = (
  query: { from?: string; period?: string; to?: string } = {},
  allPeriodStartDate?: Date,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);
  let start: Date;
  let end: Date;
  let label = "Últimos 30 dias";

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo)
      return { success: false, code: "invalid_analytics_date_range" };

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
    label = "Período personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o período";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const labels = Array.from({ length: days }, (_, index) => toDateKey(addDays(start, index)));
  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    current: { end, start },
    labels,
    period: {
      days,
      from: toDateKey(start),
      label,
      max_days: MAX_PERIOD_DAYS,
      previous_from: toDateKey(previousStart),
      previous_to: toDateKey(previousEnd),
      timezone: "server-local",
      to: toDateKey(end),
    },
    previous: { end: previousEnd, start: previousStart },
  };
};

const metric = (input: {
  available?: boolean;
  comparison?: AdminPsychologistMetricComparison | null;
  id: string;
  label: string;
  source: string;
  unit?: AdminPsychologistAvailabilityMetric["unit"];
  unavailable_reason?: string | null;
  value: number | null;
}): AdminPsychologistAvailabilityMetric => ({
  available: input.available ?? input.value !== null,
  ...(input.comparison ? { comparison: input.comparison } : {}),
  id: input.id,
  label: input.label,
  source: input.source,
  unit: input.unit ?? "count",
  unavailable_reason: input.unavailable_reason ?? null,
  value: input.value,
});

const unavailableMetric = (id: string, label: string, source: string, reason: string) =>
  metric({
    available: false,
    id,
    label,
    source,
    unavailable_reason: reason,
    value: null,
  });

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const buildComparison = (
  current: number,
  previous: number,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistMetricComparison => {
  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    previous_from: period.previous_from,
    previous_to: period.previous_to,
    previous_value: previous,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
  };
};

const groupDateCounts = <T extends { createdAt: Date }>(items: T[], labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return counts;
};

const valueFromMap = (map: Map<string, number>, key: string) => map.get(key) ?? 0;

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

const RETENTION_BUCKETS = Array.from({ length: 20 }, (_, index) => (index + 1) * 5);

const normalizeString = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const excerpt = (value: string, max = 120) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;

  return `${normalized.slice(0, max - 1).trim()}…`;
};

const mediaFromPost = (post: AdminPsychologistEngagementPost) => {
  const first = post.media_items[0];
  const url = first?.media_url ?? post.media_url;
  const type = first?.media_type ?? post.media_type;

  return url ? { type: type ?? null, url } : null;
};

const mediaFromReply = (reply: AdminPsychologistEngagementReply) =>
  reply.media_url ? { type: reply.media_type ?? null, url: reply.media_url } : null;

const toCountMap = <T extends Record<string, unknown>>(items: T[], key: keyof T) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const rawKey = item[key];
    if (typeof rawKey !== "string") continue;
    map.set(rawKey, (map.get(rawKey) ?? 0) + 1);
  }

  return map;
};

const groupCountMap = <T extends { _count: { _all: number } }>(
  items: T[],
  getKey: (item: T) => string | null,
) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    map.set(key, item._count._all);
  }

  return map;
};

const buildSeries = (input: {
  commentsReceived: { createdAt: Date }[];
  favorites: { createdAt: Date }[];
  labels: string[];
  postShares: { createdAt: Date }[];
  postSaves: { createdAt: Date }[];
  postVotes: { createdAt: Date; value: number }[];
  posts: { createdAt: Date }[];
  profileViews: { createdAt: Date }[];
  replies: { createdAt: Date }[];
  reviews: { createdAt: Date }[];
  replyShares: { createdAt: Date }[];
  replySaves: { createdAt: Date }[];
  replyVotes: { createdAt: Date; value: number }[];
  searchResults: { createdAt: Date }[];
  whatsappClicks: { createdAt: Date }[];
}): AdminPsychologistStatisticsSeriesPoint[] => {
  const profileViews = groupDateCounts(input.profileViews, input.labels);
  const whatsappClicks = groupDateCounts(input.whatsappClicks, input.labels);
  const favorites = groupDateCounts(input.favorites, input.labels);
  const reviews = groupDateCounts(input.reviews, input.labels);
  const searchResults = groupDateCounts(input.searchResults, input.labels);
  const posts = groupDateCounts(input.posts, input.labels);
  const replies = groupDateCounts(input.replies, input.labels);
  const commentsReceived = groupDateCounts(input.commentsReceived, input.labels);
  const saves = groupDateCounts([...input.postSaves, ...input.replySaves], input.labels);
  const upvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === 1),
    input.labels,
  );
  const downvotes = groupDateCounts(
    [...input.postVotes, ...input.replyVotes].filter((vote) => vote.value === -1),
    input.labels,
  );
  const shares = groupDateCounts([...input.postShares, ...input.replyShares], input.labels);

  return input.labels.map((date) => ({
    comments_received: valueFromMap(commentsReceived, date),
    date,
    downvotes: valueFromMap(downvotes, date),
    favorites: valueFromMap(favorites, date),
    profile_views: valueFromMap(profileViews, date),
    replies: valueFromMap(replies, date),
    reviews: valueFromMap(reviews, date),
    saves: valueFromMap(saves, date),
    search_results: valueFromMap(searchResults, date),
    shares: valueFromMap(shares, date),
    whatsapp_clicks: valueFromMap(whatsappClicks, date),
    upvotes: valueFromMap(upvotes, date),
    posts: valueFromMap(posts, date),
  }));
};

type VideoSessions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoSessions"]>
>;

type VideoActionEvents = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listVideoActionEvents"]>
>;

type PublicProfilePageViews = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listPublicProfilePageViews"]>
>;

const countVideoActionEvents = (actions: VideoActionEvents) => {
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

const videoPercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return Math.round((value / total) * 100);
};

const normalizeRetentionBuckets = (value: unknown): number[] => {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.map((bucket) => Number(bucket)).filter((bucket) => RETENTION_BUCKETS.includes(bucket)),
    ),
  ).sort((a, b) => a - b);
};

const deriveRetentionBucketsFromPosition = (
  maxPositionSeconds: number,
  durationSeconds: number,
  completed: boolean,
): number[] => {
  if (completed) return RETENTION_BUCKETS;
  if (durationSeconds <= 0) return [];

  const reachedPercent = Math.min(100, Math.max(0, (maxPositionSeconds / durationSeconds) * 100));

  return RETENTION_BUCKETS.filter((bucket) => reachedPercent >= bucket);
};

const buildSessionRetentionBuckets = (session: VideoSessions[number]) => {
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

const filterCurrentPresentationVideoSessions = (
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

const buildVideoMetrics = (sessions: VideoSessions) => {
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

const buildVideoRetention = (
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

const buildVideoRetentionDropoff = (
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

const buildVideo = (
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
    metrics: {
      ...metricValues,
      ...actionMetrics,
    },
    retention,
    retention_dropoff: retentionDropoff,
    source: "profile_video_watch_session+important_action_event",
    unavailable_reason:
      total > 0 ? null : "Nenhuma sessão real de vídeo foi registrada no período.",
    video_url: profile.video_url,
  };
};

const buildTrafficSources = (
  pageViews: PublicProfilePageViews,
): AdminPsychologistStatisticsDTO["traffic_sources"] => {
  const summary = summarizePsychologistTrafficOrigins(pageViews);

  return {
    ...summary,
    description: "Entenda quais canais levam pacientes até o perfil público do psicólogo.",
    source: "page_view_event.traffic_source+target_type=psychologist",
  };
};

const earlierDate = (current: Date | null, candidate: Date | null) => {
  if (!candidate) return current;
  if (!current) return candidate;

  return candidate < current ? candidate : current;
};

const buildCommunityItems = (input: {
  allPosts: AdminPsychologistEngagementPost[];
  allReplies: AdminPsychologistEngagementReply[];
  memberships: Awaited<ReturnType<AdminPsychologistEngagementRepository["listCommunities"]>>;
  posts: AdminPsychologistEngagementPost[];
  replies: AdminPsychologistEngagementReply[];
}): AdminPsychologistStatisticsDTO["community"]["communities"] => {
  const communities = new Map<
    string,
    AdminPsychologistStatisticsDTO["community"]["communities"][number]
  >();

  const ensureItem = (
    community: AdminPsychologistEngagementPost["community"],
  ): AdminPsychologistStatisticsDTO["community"]["communities"][number] => {
    const current = communities.get(community.id);
    if (current) return current;

    const next = {
      avatar_url: community.avatar_url,
      color: community.visual_primary_color,
      id: community.id,
      member_since: null,
      name: community.name,
      posts: 0,
      ranking: null,
      replies: 0,
      slug: community.slug,
    };

    communities.set(community.id, next);

    return next;
  };

  for (const membership of input.memberships) {
    const current = ensureItem(membership.community);
    current.member_since = earlierDate(current.member_since, membership.createdAt);
  }

  for (const post of input.allPosts) {
    const current = ensureItem(post.community);
    current.member_since = earlierDate(current.member_since, post.createdAt);
  }

  for (const reply of input.allReplies) {
    const current = ensureItem(reply.post.community);
    current.member_since = earlierDate(current.member_since, reply.createdAt);
  }

  for (const post of input.posts) {
    const current = ensureItem(post.community);
    current.posts += 1;
  }

  for (const reply of input.replies) {
    const current = ensureItem(reply.post.community);
    current.replies += 1;
  }

  return [...communities.values()].sort((left, right) => {
    const leftTotal = left.posts + left.replies;
    const rightTotal = right.posts + right.replies;
    if (leftTotal !== rightTotal) return rightTotal - leftTotal;

    return left.name.localeCompare(right.name, "pt-BR");
  });
};

const withCommunityRankings = async (input: {
  communities: AdminPsychologistStatisticsDTO["community"]["communities"];
  psychologistId: string;
  repository: AdminPsychologistEngagementRepository;
}): Promise<AdminPsychologistStatisticsDTO["community"]["communities"]> => {
  if (input.communities.length === 0) return input.communities;

  const eligibleMentorIds = await input.repository.listTopMentorEligiblePsychologistIds();
  if (!eligibleMentorIds.includes(input.psychologistId)) {
    return input.communities.map((community) => ({ ...community, ranking: null }));
  }

  const rankingsByCommunityId = new Map<
    string,
    NonNullable<AdminPsychologistStatisticsDTO["community"]["communities"][number]["ranking"]>
  >();

  await Promise.all(
    input.communities.map(async (community) => {
      const rankingSignals = await input.repository.getCommunityMentorRankingSignals(community.id, [
        ...eligibleMentorIds,
      ]);
      const ranking = rankingSignals.get(input.psychologistId);

      if (ranking) rankingsByCommunityId.set(community.id, ranking);
    }),
  );

  return input.communities.map((community) => ({
    ...community,
    ranking: rankingsByCommunityId.get(community.id) ?? null,
  }));
};

const normalizeStatisticsQuery = (query: AdminPsychologistEngagementQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  period: query.period,
  to: query.to,
});

const matchesCommunityFilter = (community: { id: string; slug: string }, communityFilter: string) =>
  communityFilter === "all" ||
  community.id === communityFilter ||
  community.slug === communityFilter;

const filterPostsByCommunity = (
  posts: AdminPsychologistEngagementPost[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? posts
    : posts.filter((post) => matchesCommunityFilter(post.community, communityFilter));

const filterRepliesByCommunity = (
  replies: AdminPsychologistEngagementReply[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? replies
    : replies.filter((reply) => matchesCommunityFilter(reply.post.community, communityFilter));

const buildCommunityRankingMetric = (
  communityFilter: string,
  communities: AdminPsychologistStatisticsDTO["community"]["communities"],
) => {
  if (communityFilter === "all") {
    return unavailableMetric(
      "ranking",
      "Ranking do psicólogo",
      "community_mentor_ranking",
      "Selecione uma comunidade",
    );
  }

  const selectedCommunity = communities.find((community) =>
    matchesCommunityFilter(community, communityFilter),
  );

  if (!selectedCommunity) {
    return unavailableMetric(
      "ranking",
      "Ranking do psicólogo",
      "community_mentor_ranking",
      "O psicólogo não possui participação real nesta comunidade.",
    );
  }

  if (!selectedCommunity.ranking) {
    return unavailableMetric(
      "ranking",
      "Ranking do psicólogo",
      "community_mentor_ranking",
      "Sem posição real no ranking desta comunidade.",
    );
  }

  return metric({
    id: "ranking",
    label: "Ranking do psicólogo",
    source: "community_mentor_ranking",
    unit: "position",
    value: selectedCommunity.ranking.position,
  });
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const showAdminPsychologistStatistics = async (
  data: IAdminPsychologistStatisticsDTO,
): Promise<Resolve> => {
  const query = normalizeStatisticsQuery(data.q ?? {});
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(query, profile.user.createdAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [
    profileViews,
    whatsappClicks,
    favorites,
    reviews,
    searchResults,
    videoSessions,
    videoActionEvents,
    previousProfileViews,
    previousWhatsappClicks,
    previousFavorites,
    previousReviews,
    previousSearchResults,
    previousVideoSessions,
    previousVideoActionEvents,
    posts,
    replies,
    allPosts,
    allReplies,
    previousPosts,
    previousReplies,
    memberships,
    platformPageViews,
    pwaInstallAction,
    trafficPageViews,
  ] = await Promise.all([
    repository.listProfileViews(userId, period.current.start, period.current.end),
    repository.listWhatsappClicks(userId, period.current.start, period.current.end),
    repository.listFavorites(userId, period.current.start, period.current.end),
    repository.listReviews(userId, period.current.start, period.current.end),
    repository.listSearchResultImpressions(userId, period.current.start, period.current.end),
    repository.listVideoSessions(userId, period.current.start, period.current.end),
    repository.listVideoActionEvents(userId, period.current.start, period.current.end),
    repository.listProfileViews(userId, period.previous.start, period.previous.end),
    repository.listWhatsappClicks(userId, period.previous.start, period.previous.end),
    repository.listFavorites(userId, period.previous.start, period.previous.end),
    repository.listReviews(userId, period.previous.start, period.previous.end),
    repository.listSearchResultImpressions(userId, period.previous.start, period.previous.end),
    repository.listVideoSessions(userId, period.previous.start, period.previous.end),
    repository.listVideoActionEvents(userId, period.previous.start, period.previous.end),
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
    repository.listAuthoredPosts(userId),
    repository.listAuthoredReplies(userId),
    repository.listAuthoredPosts(userId, period.previous.start, period.previous.end),
    repository.listAuthoredReplies(userId, period.previous.start, period.previous.end),
    repository.listCommunities(userId),
    repository.listPlatformPageViews(userId, period.current.start, period.current.end),
    repository.findPwaInstallAction(userId),
    repository.listPublicProfilePageViews(userId, period.current.start, period.current.end),
  ]);

  const communityPosts = filterPostsByCommunity(posts, query.community);
  const communityReplies = filterRepliesByCommunity(replies, query.community);
  const previousCommunityPosts = filterPostsByCommunity(previousPosts, query.community);
  const previousCommunityReplies = filterRepliesByCommunity(previousReplies, query.community);
  const postIds = communityPosts.map((post) => post.id);
  const replyIds = communityReplies.map((reply) => reply.id);
  const previousPostIds = previousCommunityPosts.map((post) => post.id);
  const previousReplyIds = previousCommunityReplies.map((reply) => reply.id);
  const [
    postSaves,
    replySaves,
    commentsReceived,
    postVotes,
    replyVotes,
    postShares,
    replyShares,
    previousPostSaves,
    previousReplySaves,
    previousCommentsReceived,
    previousPostVotes,
    previousReplyVotes,
    previousPostShares,
    previousReplyShares,
  ] = await Promise.all([
    repository.listPostSaves(postIds, period.current.start, period.current.end),
    repository.listReplySaves(replyIds, period.current.start, period.current.end),
    repository.listCommentsReceived(postIds, userId, period.current.start, period.current.end),
    repository.listPostVotes(postIds, period.current.start, period.current.end),
    repository.listReplyVotes(replyIds, period.current.start, period.current.end),
    repository.listPostShareEvents(postIds, period.current.start, period.current.end),
    repository.listReplyShareEvents(replyIds, period.current.start, period.current.end),
    repository.listPostSaves(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplySaves(previousReplyIds, period.previous.start, period.previous.end),
    repository.listCommentsReceived(
      previousPostIds,
      userId,
      period.previous.start,
      period.previous.end,
    ),
    repository.listPostVotes(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplyVotes(previousReplyIds, period.previous.start, period.previous.end),
    repository.listPostShareEvents(previousPostIds, period.previous.start, period.previous.end),
    repository.listReplyShareEvents(previousReplyIds, period.previous.start, period.previous.end),
  ]);
  const savesCount = postSaves.length + replySaves.length;
  const previousSavesCount = previousPostSaves.length + previousReplySaves.length;
  const upvotesCount = [...postVotes, ...replyVotes].filter((vote) => vote.value === 1).length;
  const previousUpvotesCount = [...previousPostVotes, ...previousReplyVotes].filter(
    (vote) => vote.value === 1,
  ).length;
  const downvotesCount = [...postVotes, ...replyVotes].filter((vote) => vote.value === -1).length;
  const previousDownvotesCount = [...previousPostVotes, ...previousReplyVotes].filter(
    (vote) => vote.value === -1,
  ).length;
  const sharesCount = postShares.length + replyShares.length;
  const previousSharesCount = previousPostShares.length + previousReplyShares.length;
  const unavailable: AdminPsychologistAvailabilityMetric[] = [];
  const businessSeries = buildSeries({
    commentsReceived,
    favorites,
    labels: period.labels,
    postShares,
    postSaves,
    postVotes,
    posts,
    profileViews,
    replies,
    reviews,
    replyShares,
    replySaves,
    replyVotes,
    searchResults,
    whatsappClicks,
  });
  const communitySeries = buildSeries({
    commentsReceived,
    favorites: [],
    labels: period.labels,
    postShares,
    postSaves,
    postVotes,
    posts: communityPosts,
    profileViews: [],
    replies: communityReplies,
    reviews: [],
    replyShares,
    replySaves,
    replyVotes,
    searchResults: [],
    whatsappClicks: [],
  });
  const communityItems = await withCommunityRankings({
    communities: buildCommunityItems({ allPosts, allReplies, memberships, posts, replies }),
    psychologistId: userId,
    repository,
  });
  const communityRankingMetric = buildCommunityRankingMetric(query.community, communityItems);
  const platformUsageSummary = summarizePlatformUsage({
    eligiblePsychologistsCount: 1,
    pageViews: platformPageViews,
  });
  const platformHourlyActivity = summarizePlatformHourlyActivity(platformPageViews);
  const platformUsage = {
    access_days_count:
      platformPageViews.length > 0
        ? new Set(platformPageViews.map((view) => toDateKey(view.occurred_at))).size
        : 0,
    average_duration_seconds: platformUsageSummary.average_duration_seconds,
    duration_unavailable_reason: platformUsageSummary.duration_unavailable_reason,
    last_access_at:
      platformPageViews.length > 0
        ? platformPageViews.reduce<Date | null>(
            (latest, view) => (!latest || view.occurred_at > latest ? view.occurred_at : latest),
            null,
          )
        : null,
    period_from: period.period.from,
    period_to: period.period.to,
    pwa_installation_recorded: Boolean(pwaInstallAction),
    pwa_installed_at: pwaInstallAction?.occurred_at ?? null,
    sessions_count: new Set(platformPageViews.map((view) => view.session_id)).size,
    source: "page_view_event+important_action_event" as const,
    hourly_activity: platformHourlyActivity,
    peak_activity_hours: summarizePlatformPeakActivityHours(platformPageViews),
    top_pages: platformUsageSummary.top_pages,
    unavailable_reason: platformUsageSummary.unavailable_reason,
  };
  const trafficSources = buildTrafficSources(trafficPageViews);

  const response: AdminPsychologistStatisticsDTO = {
    business: {
      cards: [
        metric({
          comparison: buildComparison(
            profileViews.length,
            previousProfileViews.length,
            period.period,
          ),
          id: "profile_views",
          label: "Visualizações de perfil",
          source: "profile_view_event.source=profile_page",
          value: profileViews.length,
        }),
        metric({
          comparison: buildComparison(
            whatsappClicks.length,
            previousWhatsappClicks.length,
            period.period,
          ),
          id: "whatsapp_clicks",
          label: "Cliques no WhatsApp",
          source: "contact_request.channel=whatsapp",
          value: whatsappClicks.length,
        }),
        metric({
          comparison: buildComparison(favorites.length, previousFavorites.length, period.period),
          id: "favorites",
          label: "Favoritados",
          source: "psychologist_favorite",
          value: favorites.length,
        }),
        metric({
          comparison: buildComparison(reviews.length, previousReviews.length, period.period),
          id: "reviews",
          label: "Avaliações",
          source: "professional_review",
          value: reviews.length,
        }),
        metric({
          comparison: buildComparison(
            searchResults.length,
            previousSearchResults.length,
            period.period,
          ),
          id: "search_results",
          label: "Resultados de busca",
          source: "profile_view_event.source=search_result",
          value: searchResults.length,
        }),
      ],
      series: businessSeries,
    },
    community: {
      cards: [
        metric({
          comparison: buildComparison(
            communityPosts.length,
            previousCommunityPosts.length,
            period.period,
          ),
          id: "posts",
          label: "Posts",
          source: "community_post.author_id",
          value: communityPosts.length,
        }),
        metric({
          comparison: buildComparison(
            communityReplies.length,
            previousCommunityReplies.length,
            period.period,
          ),
          id: "replies",
          label: "Respostas",
          source: "post_reply.author_id",
          value: communityReplies.length,
        }),
        metric({
          comparison: buildComparison(upvotesCount, previousUpvotesCount, period.period),
          id: "upvotes",
          label: "Upvotes",
          source: "post_vote.value=1 em community_post/post_reply do psicólogo",
          value: upvotesCount,
        }),
        metric({
          comparison: buildComparison(downvotesCount, previousDownvotesCount, period.period),
          id: "downvotes",
          label: "Downvotes",
          source: "post_vote.value=-1 em community_post/post_reply do psicólogo",
          value: downvotesCount,
        }),
        metric({
          comparison: buildComparison(savesCount, previousSavesCount, period.period),
          id: "saves",
          label: "Salvamentos",
          source: "post_save+post_reply_save",
          value: savesCount,
        }),
        metric({
          comparison: buildComparison(sharesCount, previousSharesCount, period.period),
          id: "shares",
          label: "Compartilhamentos",
          source: "post_share em community_post/post_reply do psicólogo",
          value: sharesCount,
        }),
        metric({
          comparison: buildComparison(
            commentsReceived.length,
            previousCommentsReceived.length,
            period.period,
          ),
          id: "comments_received",
          label: "Comentários recebidos",
          source: "post_reply em posts do psicólogo",
          value: commentsReceived.length,
        }),
        communityRankingMetric,
      ],
      communities: communityItems,
      series: communitySeries,
    },
    period: period.period,
    platform_usage: platformUsage,
    source:
      "profile_events+community_activity+video_sessions+search_impressions+professional_review+page_view_event+important_action_event",
    traffic_sources: trafficSources,
    unavailable,
    video: buildVideo(
      profile,
      videoSessions,
      previousVideoSessions,
      videoActionEvents,
      previousVideoActionEvents,
      period.period,
    ),
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};

const normalizePublicationQuery = (query: AdminPsychologistPublicationsQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  limit: Math.min(Math.max(Number(query.limit || 5), 1), 20),
  page: Math.max(Number(query.page || 1), 1),
  period: query.period,
  q: query.q?.trim() || "",
  sort: query.sort && PSYCHOLOGIST_PUBLICATIONS_SORTS.has(query.sort) ? query.sort : "engagement",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
});

const publicationEngagementScore = (item: AdminPsychologistPublicationItem) =>
  (item.metrics.views.value ?? 0) +
  (item.metrics.upvotes.value ?? 0) +
  (item.metrics.downvotes.value ?? 0) +
  (item.metrics.comments.value ?? 0) +
  (item.metrics.saves.value ?? 0) +
  (item.metrics.shares.value ?? 0) +
  (item.metrics.whatsapp_clicks.value ?? 0);

const comparePublicationsByRecent = (
  left: AdminPsychologistPublicationItem,
  right: AdminPsychologistPublicationItem,
) => right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id);

const sortPublications = (
  items: AdminPsychologistPublicationItem[],
  sort: AdminPsychologistPublicationsSort,
) =>
  [...items].sort((left, right) => {
    if (sort === "oldest") {
      return (
        left.created_at.getTime() - right.created_at.getTime() || left.id.localeCompare(right.id)
      );
    }

    if (sort === "recent") return comparePublicationsByRecent(left, right);

    return (
      publicationEngagementScore(right) - publicationEngagementScore(left) ||
      comparePublicationsByRecent(left, right)
    );
  });

const filterPublication = (
  item: AdminPsychologistPublicationItem,
  query: ReturnType<typeof normalizePublicationQuery>,
) => {
  if (query.type !== "all" && item.type !== query.type) return false;
  if (
    query.community !== "all" &&
    item.community.id !== query.community &&
    item.community.slug !== query.community
  ) {
    return false;
  }
  if (!query.q) return true;

  const needle = normalizeString(query.q);
  return normalizeString(`${item.title} ${item.excerpt} ${item.community.name}`).includes(needle);
};

const mapPostPublication = (
  post: AdminPsychologistEngagementPost,
  maps: {
    commentsReceivedByPost: Map<string, number>;
    postSavesByPost: Map<string, number>;
    postSharesByPost: Map<string, number>;
    postViewsByPost: Map<string, number>;
    postWhatsappClicksByPost: Map<string, number>;
  },
): AdminPsychologistPublicationItem => {
  const views = maps.postViewsByPost.get(post.id) ?? 0;
  return {
    community: {
      avatar_url: post.community.avatar_url,
      color: post.community.visual_primary_color,
      id: post.community.id,
      name: post.community.name,
      slug: post.community.slug,
    },
    created_at: post.createdAt,
    excerpt: excerpt(post.content),
    id: post.id,
    media: mediaFromPost(post),
    metrics: {
      comments: metric({
        id: "comments",
        label: "Comentários",
        source: "post_reply.post_id",
        value: maps.commentsReceivedByPost.get(post.id) ?? post.replies_count,
      }),
      downvotes: metric({
        id: "downvotes",
        label: "Downvotes",
        source: "community_post.downvotes_count/post_vote",
        value: post.downvotes_count,
      }),
      reports: metric({
        id: "reports",
        label: "Denúncias",
        source: "post_report.post_id",
        value: post.reports.length,
      }),
      saves: metric({
        id: "saves",
        label: "Salvamentos",
        source: "post_save",
        value: maps.postSavesByPost.get(post.id) ?? post.saves_count,
      }),
      shares: metric({
        id: "shares",
        label: "Compartilhamentos",
        source: "post_share",
        value: maps.postSharesByPost.get(post.id) ?? 0,
      }),
      upvotes: metric({
        id: "upvotes",
        label: "Upvotes",
        source: "community_post.upvotes_count/post_vote",
        value: post.upvotes_count,
      }),
      views: metric({
        id: "views",
        label: "Visualizações",
        source: "page_view_event.target_type=post/community_post",
        value: views,
      }),
      whatsapp_clicks: metric({
        id: "whatsapp_clicks",
        label: "Cliques WhatsApp",
        source: "important_action_event.action_type=whatsapp_click+target_type=post/community_post",
        value: maps.postWhatsappClicksByPost.get(post.id) ?? 0,
      }),
    },
    public_url: `/community/${post.community.slug}/post/${post.id}`,
    source: "community_post",
    title: post.title,
    type: "post",
  };
};

const mapReplyPublication = (
  reply: AdminPsychologistEngagementReply,
  maps: {
    replyChildrenByReply: Map<string, number>;
    replySavesByReply: Map<string, number>;
    replySharesByReply: Map<string, number>;
    replyViewsByReply: Map<string, number>;
    replyWhatsappClicksByReply: Map<string, number>;
  },
): AdminPsychologistPublicationItem => ({
  community: {
    avatar_url: reply.post.community.avatar_url,
    color: reply.post.community.visual_primary_color,
    id: reply.post.community.id,
    name: reply.post.community.name,
    slug: reply.post.community.slug,
  },
  created_at: reply.createdAt,
  excerpt: excerpt(reply.content),
  id: reply.id,
  media: mediaFromReply(reply),
  metrics: {
    comments: metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply.parent_reply_id",
      value: maps.replyChildrenByReply.get(reply.id) ?? 0,
    }),
    downvotes: metric({
      id: "downvotes",
      label: "Downvotes",
      source: "post_reply.downvotes_count/post_vote",
      value: reply.downvotes_count,
    }),
    reports: metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report.reply_id",
      value: reply.reports.length,
    }),
    saves: metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_reply_save",
      value: maps.replySavesByReply.get(reply.id) ?? 0,
    }),
    shares: metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share.reply_id",
      value: maps.replySharesByReply.get(reply.id) ?? 0,
    }),
    upvotes: metric({
      id: "upvotes",
      label: "Upvotes",
      source: "post_reply.upvotes_count/post_vote",
      value: reply.upvotes_count,
    }),
    views: metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=reply/post_reply",
      value: maps.replyViewsByReply.get(reply.id) ?? 0,
    }),
    whatsapp_clicks: metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click+target_type=reply/post_reply",
      value: maps.replyWhatsappClicksByReply.get(reply.id) ?? 0,
    }),
  },
  public_url: `/community/${reply.post.community.slug}/post/${reply.post.id}/thread/${reply.id}`,
  source: "post_reply",
  title: reply.title || `Resposta em: ${reply.post.title}`,
  type: "reply",
});

export const showAdminPsychologistPublications = async (
  data: IAdminPsychologistPublicationsDTO,
): Promise<Resolve> => {
  const query = normalizePublicationQuery(data.q ?? {});
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(
    { from: query.from, period: query.period, to: query.to },
    profile.user.createdAt,
  );
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [posts, replies] = await Promise.all([
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
  ]);
  const postIds = posts.map((post) => post.id);
  const replyIds = replies.map((reply) => reply.id);
  const [
    postSaves,
    replySaves,
    commentsReceived,
    postShares,
    replyShares,
    postViews,
    replyViews,
    postWhatsappClicks,
    replyWhatsappClicks,
    replyChildren,
  ] = await Promise.all([
    repository.listPostSaves(postIds),
    repository.listReplySaves(replyIds),
    repository.listCommentsReceived(postIds, userId),
    repository.countPostShares(postIds),
    repository.countReplyShares(replyIds),
    repository.countPostViews(postIds),
    repository.countReplyViews(replyIds),
    repository.countPostWhatsappClicks(postIds),
    repository.countReplyWhatsappClicks(replyIds),
    repository.countReplyChildren(replyIds),
  ]);

  const commentsReceivedByPost = toCountMap(commentsReceived, "post_id");
  const postSavesByPost = toCountMap(postSaves, "post_id");
  const replySavesByReply = toCountMap(replySaves, "reply_id");
  const postSharesByPost = groupCountMap(postShares, (item) => item.post_id);
  const replySharesByReply = groupCountMap(replyShares, (item) => item.reply_id);
  const postViewsByPost = groupCountMap(postViews, (item) => item.target_id);
  const replyViewsByReply = groupCountMap(replyViews, (item) => item.target_id);
  const postWhatsappClicksByPost = groupCountMap(postWhatsappClicks, (item) => item.target_id);
  const replyWhatsappClicksByReply = groupCountMap(replyWhatsappClicks, (item) => item.target_id);
  const replyChildrenByReply = groupCountMap(replyChildren, (item) => item.parent_reply_id);

  const allItems = [
    ...posts.map((post) =>
      mapPostPublication(post, {
        commentsReceivedByPost,
        postSavesByPost,
        postSharesByPost,
        postViewsByPost,
        postWhatsappClicksByPost,
      }),
    ),
    ...replies.map((reply) =>
      mapReplyPublication(reply, {
        replyChildrenByReply,
        replySavesByReply,
        replySharesByReply,
        replyViewsByReply,
        replyWhatsappClicksByReply,
      }),
    ),
  ];

  const filtered = sortPublications(
    allItems.filter((item) => filterPublication(item, query)),
    query.sort,
  );
  const count = filtered.length;
  const pages = Math.max(1, Math.ceil(count / query.limit));
  const page = Math.min(query.page, pages);
  const dataSlice = filtered.slice((page - 1) * query.limit, page * query.limit);
  const communities = new Map<string, { id: string; label: string; slug: string }>();
  for (const item of allItems) {
    communities.set(item.community.id, {
      id: item.community.id,
      label: item.community.name,
      slug: item.community.slug,
    });
  }

  const cards = [
    metric({
      id: "posts",
      label: "Posts",
      source: "community_post.author_id",
      value: posts.length,
    }),
    metric({
      id: "replies",
      label: "Respostas",
      source: "post_reply.author_id",
      value: replies.length,
    }),
    metric({
      id: "upvotes",
      label: "Upvotes",
      source: "community_post/post_reply upvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.upvotes.value ?? 0)),
    }),
    metric({
      id: "downvotes",
      label: "Downvotes",
      source: "community_post/post_reply downvotes_count + post_vote",
      value: sum(allItems.map((item) => item.metrics.downvotes.value ?? 0)),
    }),
    metric({
      id: "comments",
      label: "Comentários",
      source: "post_reply",
      value: sum(allItems.map((item) => item.metrics.comments.value ?? 0)),
    }),
    metric({
      id: "views",
      label: "Visualizações",
      source: "page_view_event.target_type=post/community_post",
      value: sum(allItems.map((item) => item.metrics.views.value ?? 0)),
    }),
    metric({
      id: "saves",
      label: "Salvamentos",
      source: "post_save+post_reply_save",
      value: sum(allItems.map((item) => item.metrics.saves.value ?? 0)),
    }),
    metric({
      id: "shares",
      label: "Compartilhamentos",
      source: "post_share",
      value: sum(allItems.map((item) => item.metrics.shares.value ?? 0)),
    }),
    metric({
      id: "whatsapp_clicks",
      label: "Cliques WhatsApp",
      source: "important_action_event.action_type=whatsapp_click",
      value: sum(allItems.map((item) => item.metrics.whatsapp_clicks.value ?? 0)),
    }),
    metric({
      id: "reports",
      label: "Denúncias",
      source: "post_report",
      value: sum(allItems.map((item) => item.metrics.reports.value ?? 0)),
    }),
  ];
  const unavailable: AdminPsychologistPublicationsDTO["unavailable"] = [];

  const response: AdminPsychologistPublicationsDTO = {
    active_filters_count: [
      query.q,
      query.community !== "all" ? query.community : "",
      query.type !== "all" ? query.type : "",
      (query.period && query.period !== "all") || (query.from && query.to) ? "period" : "",
      query.sort !== "engagement" ? "sort" : "",
    ].filter(Boolean).length,
    count,
    data: dataSlice,
    filters: {
      communities: [...communities.values()].sort((left, right) =>
        left.label.localeCompare(right.label, "pt-BR"),
      ),
      types: [
        { id: "all", label: "Todos" },
        { id: "post", label: "Posts" },
        { id: "reply", label: "Respostas" },
      ],
    },
    page,
    pages,
    per_page: query.limit,
    period: period.period,
    source:
      "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report",
    totals: { cards },
    unavailable,
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
