import {
  buildDateLabels as buildLabels,
  resolveCalendarPeriod,
  toDateKey,
} from "@/utils/date-range";
import type {
  AdminCommunitiesDashboardActivitySeries,
  AdminCommunitiesDashboardContentFormatDistribution,
  AdminCommunitiesDashboardContentFormatId,
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardMetric,
  AdminCommunitiesDashboardPeriod,
  AdminCommunitiesDashboardQuery,
  AdminCommunitiesDashboardSeverity,
} from "../../DTOs/IAdminCommunitiesDashboardDTO";
import type {
  CommunityMemberRecord,
  CommunityPostRecord,
  MemberActivityRecord,
  PostReplyRecord,
} from "../../repositories/interfaces/IAdminCommunitiesDashboardRepository";

export const DEFAULT_PERIOD_DAYS = 7;

export const MAX_PERIOD_DAYS = 3660;

export const SEVERITY_WEIGHTS: Record<AdminCommunitiesDashboardSeverity, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};

export const ACTIVITY_COLORS = {
  patient_comments: "#ff5b1a",
  patient_posts: "#1b7cff",
  psychologist_posts: "#f8288f",
  psychologist_replies: "#12b76a",
};

export type CommunitiesPeriodResolution = {
  current: AdminCommunitiesDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminCommunitiesDashboardPeriod;
  previous: AdminCommunitiesDashboardDateRange;
};

export type PeriodResult =
  | {
      period: CommunitiesPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

export const resolvePeriod = (
  query: AdminCommunitiesDashboardQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const resolved = resolveCalendarPeriod(query, {
    allPeriodStartDate,
    defaultDays: DEFAULT_PERIOD_DAYS,
    maxDays: MAX_PERIOD_DAYS,
  });
  if (!resolved) return { code: "invalid_analytics_date_range", success: false };

  const { days, end, label, previousEnd, previousStart, start } = resolved;
  return {
    success: true,
    period: {
      current: { end, start },
      days,
      labels: buildLabels(start, days),
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
    },
  };
};

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const CONTENT_FORMAT_ORDER = ["text", "video", "image", "image_carousel"] as const;

export const CONTENT_FORMAT_LABELS = {
  image: "Imagem",
  image_carousel: "Carrossel de imagens",
  text: "Apenas texto",
  video: "Vídeo",
} satisfies Record<
  AdminCommunitiesDashboardContentFormatId,
  AdminCommunitiesDashboardContentFormatDistribution["items"][number]["label"]
>;

export const emptyContentFormatCounts = () =>
  ({
    image: 0,
    image_carousel: 0,
    text: 0,
    video: 0,
  }) satisfies Record<AdminCommunitiesDashboardContentFormatId, number>;

export const normalizeContentMediaType = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type DashboardStatisticsContentFormatPost = {
  media_items: Array<{
    media_type: string;
    media_url: string;
  }>;
  media_type: string | null;
  media_url: string | null;
};

export type DashboardStatisticsContentFormatReply = {
  media_type: string | null;
  media_url: string | null;
};

export const classifyPostContentFormat = (
  post: DashboardStatisticsContentFormatPost,
): AdminCommunitiesDashboardContentFormatId => {
  const mediaItems = post.media_items.filter((item) => item.media_url);
  const mediaTypes = mediaItems.map((item) => normalizeContentMediaType(item.media_type));
  const legacyMediaType = post.media_url ? normalizeContentMediaType(post.media_type) : "";
  const hasVideo = mediaTypes.includes("video") || legacyMediaType === "video";
  if (hasVideo) return "video";

  const imageItemsCount = mediaTypes.filter((type) => type === "image").length;
  if (imageItemsCount > 1) return "image_carousel";
  if (imageItemsCount === 1 || legacyMediaType === "image") return "image";

  return "text";
};

export const classifyReplyContentFormat = (
  reply: DashboardStatisticsContentFormatReply,
): AdminCommunitiesDashboardContentFormatId => {
  const mediaType = reply.media_url ? normalizeContentMediaType(reply.media_type) : "";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "image";

  return "text";
};

export const buildPostContentFormatDistribution = (
  posts: DashboardStatisticsContentFormatPost[],
): AdminCommunitiesDashboardContentFormatDistribution => {
  const counts = emptyContentFormatCounts();

  for (const post of posts) {
    counts[classifyPostContentFormat(post)] += 1;
  }

  const total = posts.length;

  return {
    items: CONTENT_FORMAT_ORDER.map((id) => ({
      count: counts[id],
      id,
      label: CONTENT_FORMAT_LABELS[id],
      percentage: total > 0 ? roundPercent((counts[id] / total) * 100) : 0,
    })),
    source: "community_post.media_type+community_post_media",
    total,
  };
};

export const buildReplyContentFormatDistribution = (
  replies: DashboardStatisticsContentFormatReply[],
): AdminCommunitiesDashboardContentFormatDistribution => {
  const counts = emptyContentFormatCounts();

  for (const reply of replies) {
    counts[classifyReplyContentFormat(reply)] += 1;
  }

  const total = replies.length;

  return {
    items: CONTENT_FORMAT_ORDER.map((id) => ({
      count: counts[id],
      id,
      label: CONTENT_FORMAT_LABELS[id],
      percentage: total > 0 ? roundPercent((counts[id] / total) * 100) : 0,
    })),
    source: "post_reply.media_type",
    total,
  };
};

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const metric = (params: {
  current: number;
  description: string;
  id: string;
  label: string;
  previous: number;
  source: string;
  unavailable?: boolean;
  unavailableReason?: string;
}): AdminCommunitiesDashboardMetric => {
  const change = percentageChange(params.current, params.previous);

  return {
    change_percent: change,
    description: params.description,
    id: params.id,
    label: params.label,
    previous_value: params.previous,
    source: params.source,
    trend: change === null ? "unavailable" : change > 0 ? "up" : change < 0 ? "down" : "flat",
    unit: "count",
    unavailable: params.unavailable ?? false,
    ...(params.unavailableReason ? { unavailable_reason: params.unavailableReason } : {}),
    value: params.current,
  };
};

export const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

export const countByDate = (items: Array<{ createdAt: Date }>, labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return labels.map((date) => ({ date, value: counts.get(date) ?? 0 }));
};

export const roleIsPsychologist = (role: string) => role === "psicologo";

export const roleIsPatient = (role: string) => role === "paciente";

export const distinctActiveMembers = (
  activities: MemberActivityRecord[],
  members: CommunityMemberRecord[],
) => {
  const activeMembership = new Set(
    members.map((member) => `${member.community_id}:${member.user_id}`),
  );
  const distinctUsers = new Set<string>();

  for (const activity of activities) {
    if (!activity.community_id) continue;
    if (!activeMembership.has(`${activity.community_id}:${activity.user_id}`)) continue;
    distinctUsers.add(activity.user_id);
  }

  return distinctUsers.size;
};

export const buildActivitySeries = (
  posts: CommunityPostRecord[],
  replies: PostReplyRecord[],
  labels: string[],
): AdminCommunitiesDashboardActivitySeries[] => {
  const psychologistPosts = posts.filter((post) => roleIsPsychologist(post.author.role));
  const patientPosts = posts.filter((post) => roleIsPatient(post.author.role));
  const psychologistReplies = replies.filter((reply) => roleIsPsychologist(reply.author.role));
  const patientComments = replies.filter((reply) => roleIsPatient(reply.author.role));

  return [
    {
      color: ACTIVITY_COLORS.psychologist_posts,
      id: "psychologist_posts",
      label: "Postagens de psicólogos",
      points: countByDate(psychologistPosts, labels),
      source: "community_post.author.role=psicologo",
    },
    {
      color: ACTIVITY_COLORS.patient_posts,
      id: "patient_posts",
      label: "Postagens de pacientes",
      points: countByDate(patientPosts, labels),
      source: "community_post.author.role=paciente",
    },
    {
      color: ACTIVITY_COLORS.psychologist_replies,
      id: "psychologist_replies",
      label: "Respostas de psicólogos",
      points: countByDate(psychologistReplies, labels),
      source: "post_reply.author.role=psicologo",
    },
    {
      color: ACTIVITY_COLORS.patient_comments,
      id: "patient_comments",
      label: "Comentários de pacientes",
      points: countByDate(patientComments, labels),
      source: "post_reply.author.role=paciente",
    },
  ];
};

export const buildPatientPostsBreakdown = (posts: CommunityPostRecord[]) => {
  const patientPosts = posts.filter((post) => roleIsPatient(post.author.role));
  const anonymous = patientPosts.filter((post) => post.anonymous).length;
  const identified = patientPosts.length - anonymous;
  const total = patientPosts.length;

  return {
    anonymous: {
      count: anonymous,
      percentage: safePercentage(anonymous, total),
    },
    identified: {
      count: identified,
      percentage: safePercentage(identified, total),
    },
    source: "community_post.anonymous" as const,
    total,
  };
};
