import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminPsychologistAvailabilityMetric,
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
} from "../repositories/AdminPsychologistEngagementRepository";

const DEFAULT_PERIOD_DAYS = 30;
const MAX_PERIOD_DAYS = 3660;
const MS_PER_DAY = 86_400_000;

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
  replyShares: { createdAt: Date }[];
  replySaves: { createdAt: Date }[];
  replyVotes: { createdAt: Date; value: number }[];
  searchResults: { createdAt: Date }[];
  whatsappClicks: { createdAt: Date }[];
}): AdminPsychologistStatisticsSeriesPoint[] => {
  const profileViews = groupDateCounts(input.profileViews, input.labels);
  const whatsappClicks = groupDateCounts(input.whatsappClicks, input.labels);
  const favorites = groupDateCounts(input.favorites, input.labels);
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

const buildVideoMetrics = (sessions: VideoSessions) => {
  const total = sessions.length;
  const completions = sessions.filter(
    (session) => session.completed || session.milestone_100,
  ).length;
  const replaySessions = sessions.filter((session) => session.replay_count > 0).length;
  const averageRetention =
    total === 0
      ? 0
      : roundPercent(
          sum(
            sessions.map((session) => {
              const duration = session.duration_seconds || 0;
              if (duration <= 0) return 0;

              return Math.min(100, (session.max_position_seconds / duration) * 100);
            }),
          ) / total,
        );

  return {
    average_retention_percent: averageRetention,
    completions,
    replay_rate_percent: total > 0 ? roundPercent((replaySessions / total) * 100) : 0,
    sessions: total,
  };
};

const buildVideo = (
  profile: {
    cover_image_url: string | null;
    video_cover_url: string | null;
    video_url: string | null;
  },
  sessions: VideoSessions,
  previousSessions: VideoSessions,
  period: AdminPsychologistStatisticsPeriod,
): AdminPsychologistStatisticsDTO["video"] => {
  const total = sessions.length;
  const metrics = buildVideoMetrics(sessions);
  const previousMetrics = buildVideoMetrics(previousSessions);
  const completions = metrics.completions;
  const retention = [
    { label: "0%", percentage: total > 0 ? 100 : 0, position_percent: 0 },
    {
      label: "25%",
      percentage:
        total > 0
          ? roundPercent((sessions.filter((session) => session.milestone_25).length / total) * 100)
          : 0,
      position_percent: 25,
    },
    {
      label: "50%",
      percentage:
        total > 0
          ? roundPercent((sessions.filter((session) => session.milestone_50).length / total) * 100)
          : 0,
      position_percent: 50,
    },
    {
      label: "75%",
      percentage:
        total > 0
          ? roundPercent((sessions.filter((session) => session.milestone_75).length / total) * 100)
          : 0,
      position_percent: 75,
    },
    {
      label: "100%",
      percentage: total > 0 ? roundPercent((completions / total) * 100) : 0,
      position_percent: 100,
    },
  ];

  return {
    available: total > 0,
    comparisons: {
      average_retention_percent: buildComparison(
        metrics.average_retention_percent,
        previousMetrics.average_retention_percent,
        period,
      ),
      replay_rate_percent: buildComparison(
        metrics.replay_rate_percent,
        previousMetrics.replay_rate_percent,
        period,
      ),
      sessions: buildComparison(metrics.sessions, previousMetrics.sessions, period),
    },
    cover_url: profile.video_cover_url ?? profile.cover_image_url,
    metrics,
    retention,
    source: "profile_video_watch_session",
    unavailable_reason:
      total > 0 ? null : "Nenhuma sessão real de vídeo foi registrada no período.",
    video_url: profile.video_url,
  };
};

const buildCommunityItems = (input: {
  memberships: Awaited<ReturnType<AdminPsychologistEngagementRepository["listCommunities"]>>;
  posts: AdminPsychologistEngagementPost[];
  replies: AdminPsychologistEngagementReply[];
}): AdminPsychologistStatisticsDTO["community"]["communities"] => {
  const communities = new Map<
    string,
    AdminPsychologistStatisticsDTO["community"]["communities"][number]
  >();

  for (const membership of input.memberships) {
    communities.set(membership.community.id, {
      color: membership.community.visual_primary_color,
      id: membership.community.id,
      member_since: membership.createdAt,
      name: membership.community.name,
      posts: 0,
      replies: 0,
      slug: membership.community.slug,
    });
  }

  for (const post of input.posts) {
    const current = communities.get(post.community.id) ?? {
      color: post.community.visual_primary_color,
      id: post.community.id,
      member_since: null,
      name: post.community.name,
      posts: 0,
      replies: 0,
      slug: post.community.slug,
    };
    current.posts += 1;
    communities.set(current.id, current);
  }

  for (const reply of input.replies) {
    const community = reply.post.community;
    const current = communities.get(community.id) ?? {
      color: community.visual_primary_color,
      id: community.id,
      member_since: null,
      name: community.name,
      posts: 0,
      replies: 0,
      slug: community.slug,
    };
    current.replies += 1;
    communities.set(current.id, current);
  }

  return [...communities.values()].sort((left, right) => {
    const leftTotal = left.posts + left.replies;
    const rightTotal = right.posts + right.replies;
    if (leftTotal !== rightTotal) return rightTotal - leftTotal;

    return left.name.localeCompare(right.name, "pt-BR");
  });
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});

export const showAdminPsychologistStatistics = async (
  data: IAdminPsychologistStatisticsDTO,
): Promise<Resolve> => {
  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

  const period = resolvePeriod(data.q ?? {}, profile.user.createdAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const userId = profile.user.id;
  const [
    profileViews,
    whatsappClicks,
    favorites,
    searchResults,
    videoSessions,
    previousProfileViews,
    previousWhatsappClicks,
    previousFavorites,
    previousSearchResults,
    previousVideoSessions,
    posts,
    replies,
    previousPosts,
    previousReplies,
    memberships,
  ] = await Promise.all([
    repository.listProfileViews(userId, period.current.start, period.current.end),
    repository.listWhatsappClicks(userId, period.current.start, period.current.end),
    repository.listFavorites(userId, period.current.start, period.current.end),
    repository.listSearchResultImpressions(userId, period.current.start, period.current.end),
    repository.listVideoSessions(userId, period.current.start, period.current.end),
    repository.listProfileViews(userId, period.previous.start, period.previous.end),
    repository.listWhatsappClicks(userId, period.previous.start, period.previous.end),
    repository.listFavorites(userId, period.previous.start, period.previous.end),
    repository.listSearchResultImpressions(userId, period.previous.start, period.previous.end),
    repository.listVideoSessions(userId, period.previous.start, period.previous.end),
    repository.listAuthoredPosts(userId, period.current.start, period.current.end),
    repository.listAuthoredReplies(userId, period.current.start, period.current.end),
    repository.listAuthoredPosts(userId, period.previous.start, period.previous.end),
    repository.listAuthoredReplies(userId, period.previous.start, period.previous.end),
    repository.listCommunities(userId),
  ]);

  const postIds = posts.map((post) => post.id);
  const replyIds = replies.map((reply) => reply.id);
  const previousPostIds = previousPosts.map((post) => post.id);
  const previousReplyIds = previousReplies.map((reply) => reply.id);
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
  const series = buildSeries({
    commentsReceived,
    favorites,
    labels: period.labels,
    postShares,
    postSaves,
    postVotes,
    posts,
    profileViews,
    replies,
    replyShares,
    replySaves,
    replyVotes,
    searchResults,
    whatsappClicks,
  });

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
      series,
    },
    community: {
      cards: [
        metric({
          comparison: buildComparison(posts.length, previousPosts.length, period.period),
          id: "posts",
          label: "Posts",
          source: "community_post.author_id",
          value: posts.length,
        }),
        metric({
          comparison: buildComparison(replies.length, previousReplies.length, period.period),
          id: "replies",
          label: "Respostas",
          source: "post_reply.author_id",
          value: replies.length,
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
      ],
      communities: buildCommunityItems({ memberships, posts, replies }),
      series,
    },
    period: period.period,
    source: "profile_events+community_activity+video_sessions+search_impressions",
    unavailable,
    video: buildVideo(profile, videoSessions, previousVideoSessions, period.period),
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
  q: query.q?.trim() || "",
  to: query.to,
  type: query.type === "post" || query.type === "reply" ? query.type : "all",
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
  },
): AdminPsychologistPublicationItem => {
  const views = maps.postViewsByPost.get(post.id) ?? 0;
  return {
    community: {
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
  },
): AdminPsychologistPublicationItem => ({
  community: {
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
    views: unavailableMetric(
      "views",
      "Visualizações",
      "not_tracked_for_reply",
      "O tracking atual de page_view_event não atribui visualizações a respostas individuais.",
    ),
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
  const period = resolvePeriod({ from: query.from, to: query.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const repository = new AdminPsychologistEngagementRepository();
  const profile = await repository.findPsychologist(data.p.id);
  if (!profile) return notFound();

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
    replyChildren,
  ] = await Promise.all([
    repository.listPostSaves(postIds),
    repository.listReplySaves(replyIds),
    repository.listCommentsReceived(postIds, userId),
    repository.countPostShares(postIds),
    repository.countReplyShares(replyIds),
    repository.countPostViews(postIds),
    repository.countReplyChildren(replyIds),
  ]);

  const commentsReceivedByPost = toCountMap(commentsReceived, "post_id");
  const postSavesByPost = toCountMap(postSaves, "post_id");
  const replySavesByReply = toCountMap(replySaves, "reply_id");
  const postSharesByPost = groupCountMap(postShares, (item) => item.post_id);
  const replySharesByReply = groupCountMap(replyShares, (item) => item.reply_id);
  const postViewsByPost = groupCountMap(postViews, (item) => item.target_id);
  const replyChildrenByReply = groupCountMap(replyChildren, (item) => item.parent_reply_id);

  const allItems = [
    ...posts.map((post) =>
      mapPostPublication(post, {
        commentsReceivedByPost,
        postSavesByPost,
        postSharesByPost,
        postViewsByPost,
      }),
    ),
    ...replies.map((reply) =>
      mapReplyPublication(reply, {
        replyChildrenByReply,
        replySavesByReply,
        replySharesByReply,
      }),
    ),
  ].sort((left, right) => right.created_at.getTime() - left.created_at.getTime());

  const filtered = allItems.filter((item) => filterPublication(item, query));
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
  ];
  const unavailable = [
    unavailableMetric(
      "reply_views",
      "Visualizações de respostas",
      "not_tracked_for_reply",
      "O tracking atual registra page_view_event para posts, mas não para respostas individuais.",
    ),
  ];

  const response: AdminPsychologistPublicationsDTO = {
    active_filters_count: [
      query.q,
      query.community !== "all" ? query.community : "",
      query.type !== "all" ? query.type : "",
      query.from && query.to ? "period" : "",
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
      "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event",
    totals: { cards },
    unavailable,
  };

  return {
    status: 200,
    ...msg("show", {}),
    data: response,
  };
};
