import {
  addDays,
  toDateKey as dateKey,
  daysBetweenInclusive,
  endOfDate as endOfDay,
  parseDateOnly,
  startOfDate as startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "@/utils/date-range";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunityContentAnalyticsDetailDTO,
  AdminCommunityContentDetailQuery,
  AdminCommunityContentItemDTO,
  AdminCommunityContentQuery,
  AdminCommunityReportItemDTO,
  AdminCommunityResolveReportsBody,
  AdminCommunityStatisticsDTO,
  AdminCommunityStatisticsQuery,
} from "../../DTOs/IAdminCommunityManageDTO";
import type {
  AdminCommunityContentPostRecord,
  AdminCommunityContentReplyRecord,
  AdminCommunityRecord,
  AdminCommunityReportRecord,
} from "../../repositories/AdminCommunityManageRepository";

import {
  type AdminCommunityContentSort,
  COMMUNITY_CONTENT_SORTS,
  contentIsBlocked,
  contentIsRemoved,
  contentTargetKey,
  excerpt,
  MAX_CONTENT_PERIOD_DAYS,
  MAX_STATISTICS_PERIOD_DAYS,
} from "./community-list";

export type AdminCommunityContentAuthor =
  | AdminCommunityContentPostRecord["author"]
  | AdminCommunityContentReplyRecord["author"]
  | NonNullable<AdminCommunityReportRecord["post"]>["author"]
  | NonNullable<AdminCommunityReportRecord["reply"]>["author"]
  | AdminCommunityReportRecord["reporter"];

export type AdminCommunityContentKind = AdminCommunityContentItemDTO["content_kind"];

export type AdminCommunityReportContentKind =
  AdminCommunityReportItemDTO["content"]["content_kind"];

export type AdminCommunityReportStatusGroup = AdminCommunityReportItemDTO["status_group"];

export type AdminCommunityReportResolution = AdminCommunityResolveReportsBody["resolution"];

export const contentKindLabels: Record<AdminCommunityContentKind, string> = {
  anonymous_post: "Post anônimo",
  patient_comment: "Comentário de paciente",
  patient_post: "Post de paciente",
  unverified_psychologist_post: "Post de psicólogo não verificado",
  unverified_psychologist_reply: "Resposta de psicólogo não verificado",
  verified_psychologist_post: "Post de psicólogo verificado",
  verified_psychologist_reply: "Resposta de psicólogo verificado",
};

export const isContentAuthorVerified = (author: AdminCommunityContentAuthor) =>
  author.role === "psicologo" && isVerifiedProfessionalEntitlement(author.psychologist_profile);

export const contentKindFor = (
  type: AdminCommunityContentItemDTO["type"],
  author: AdminCommunityContentAuthor,
  anonymous = false,
): AdminCommunityContentKind => {
  if (anonymous && type === "post") return "anonymous_post";
  if (author.role !== "psicologo") return type === "post" ? "patient_post" : "patient_comment";

  const verified = isContentAuthorVerified(author);
  if (type === "post") {
    return verified ? "verified_psychologist_post" : "unverified_psychologist_post";
  }

  return verified ? "verified_psychologist_reply" : "unverified_psychologist_reply";
};

export const contentAuthorName = (author: AdminCommunityContentAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

export const contentAuthorGender = (author: AdminCommunityContentAuthor) =>
  author.role === "psicologo" ? (author.psychologist_profile?.gender ?? null) : null;

export const contentAuthorRoleLabel = (author: AdminCommunityContentAuthor) => {
  if (author.role !== "psicologo") return "Paciente";

  return contentAuthorGender(author)?.trim().toLowerCase() === "feminino"
    ? "Psicóloga"
    : "Psicólogo";
};

export const mapContentAuthor = (
  author: AdminCommunityContentAuthor,
  anonymous = false,
): AdminCommunityContentItemDTO["author"] => ({
  anonymous,
  avatar: author.avatar,
  gender: contentAuthorGender(author),
  id: author.id,
  name: contentAuthorName(author),
  role: author.role,
  verified: isContentAuthorVerified(author),
});

export const contentMedia = (
  mediaUrl?: string | null,
  mediaType?: string | null,
): AdminCommunityContentItemDTO["media"] => {
  if (!mediaUrl || !mediaType) return null;

  return {
    media_type: mediaType,
    media_url: mediaUrl,
  };
};

export const postMedia = (post: AdminCommunityContentPostRecord) => {
  const firstMedia = post.media_items[0];

  return contentMedia(
    firstMedia?.media_url ?? post.media_url,
    firstMedia?.media_type ?? post.media_type,
  );
};

export const replyPublicUrl = (
  community: AdminCommunityRecord,
  reply: AdminCommunityContentReplyRecord,
) =>
  reply.parent_reply_id
    ? `/comunidades/${community.slug}/publicacao/${reply.post_id}/resposta/${reply.parent_reply_id}#reply-${reply.id}`
    : `/comunidades/${community.slug}/publicacao/${reply.post_id}?focusReplyId=${encodeURIComponent(
        reply.id,
      )}#reply-${reply.id}`;

export type ContentMetricsMaps = {
  postSharesByPost?: Map<string, number>;
  replySharesByReply?: Map<string, number>;
  viewsByTarget?: Map<string, number>;
  whatsappClicksByTarget?: Map<string, number>;
};

export const mapPostContent = (
  community: AdminCommunityRecord,
  post: AdminCommunityContentPostRecord,
  metrics: ContentMetricsMaps = {},
): AdminCommunityContentItemDTO => {
  const contentKind = contentKindFor("post", post.author, post.anonymous);
  const anonymous = post.anonymous && post.author.role !== "psicologo";
  const targetKey = contentTargetKey("post", post.id);
  const status = contentIsRemoved(post)
    ? "removed"
    : contentIsBlocked(post)
      ? "blocked"
      : "published";

  return {
    author: mapContentAuthor(post.author, anonymous),
    content_id: post.id,
    content_kind: contentKind,
    content_kind_label: contentKindLabels[contentKind],
    created_at: post.createdAt,
    deleted_at: post.deletedAt,
    excerpt: excerpt(post.content),
    media: postMedia(post),
    metrics: {
      comments_count: post.replies_count,
      downvotes_count: post.downvotes_count,
      reports_count: post.reports.length,
      saves_count: post.saves_count,
      shares_count: metrics.postSharesByPost?.get(post.id) ?? 0,
      upvotes_count: post.upvotes_count,
      views_count: metrics.viewsByTarget?.get(targetKey) ?? 0,
      whatsapp_clicks_count: metrics.whatsappClicksByTarget?.get(targetKey) ?? 0,
    },
    origin_preview: null,
    parent_post_title: null,
    post_id: post.id,
    public_url: `/comunidades/${community.slug}/publicacao/${post.id}`,
    status,
    title: post.title,
    type: "post",
  };
};

export const mapReplyContent = (
  community: AdminCommunityRecord,
  reply: AdminCommunityContentReplyRecord,
  metrics: ContentMetricsMaps = {},
): AdminCommunityContentItemDTO => {
  const contentKind = contentKindFor("comment", reply.author);
  const targetKey = contentTargetKey("reply", reply.id);
  const status = contentIsRemoved(reply)
    ? "removed"
    : contentIsBlocked(reply)
      ? "blocked"
      : "published";
  const originPreview: AdminCommunityContentItemDTO["origin_preview"] = reply.parent_reply_id
    ? {
        excerpt: excerpt(reply.parent_reply?.content),
        label: "Comentário de origem",
        title: reply.parent_reply?.title ?? null,
        type: "comment",
      }
    : {
        excerpt: excerpt(reply.post.content),
        label: "Post de origem",
        title: reply.post.title,
        type: "post",
      };

  return {
    author: mapContentAuthor(reply.author),
    content_id: reply.id,
    content_kind: contentKind,
    content_kind_label: contentKindLabels[contentKind],
    created_at: reply.createdAt,
    deleted_at: reply.deletedAt,
    excerpt: excerpt(reply.content),
    media: contentMedia(reply.media_url, reply.media_type),
    metrics: {
      comments_count: 0,
      downvotes_count: reply.downvotes_count,
      reports_count: reply.reports.length,
      saves_count: reply.saves.length,
      shares_count: metrics.replySharesByReply?.get(reply.id) ?? 0,
      upvotes_count: reply.upvotes_count,
      views_count: metrics.viewsByTarget?.get(targetKey) ?? 0,
      whatsapp_clicks_count: metrics.whatsappClicksByTarget?.get(targetKey) ?? 0,
    },
    origin_preview: originPreview,
    parent_post_title: reply.post.title,
    post_id: reply.post_id,
    public_url: replyPublicUrl(community, reply),
    status,
    title: reply.title,
    type: "comment",
  };
};

export const contentMatchesSearch = (item: AdminCommunityContentItemDTO, search: string) => {
  if (!search) return true;

  return [
    item.title,
    item.excerpt,
    item.parent_post_title,
    item.author.name,
    item.content_kind_label,
    item.origin_preview?.title,
    item.origin_preview?.excerpt,
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(search));
};

export const contentMatchesType = (
  item: AdminCommunityContentItemDTO,
  type: NonNullable<AdminCommunityContentQuery["type"]>,
) => {
  if (type === "all") return true;
  if (type === "posts") return item.type === "post";
  if (type === "comments") return item.type === "comment";

  return item.content_kind === type;
};

export type ContentPeriodRange = { end: Date | null; start: Date | null };

export type ContentPeriodResult =
  | { range: ContentPeriodRange; success: true }
  | { code: string; success: false };

export const resolveContentPeriod = (query: AdminCommunityContentQuery): ContentPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : "all");

  if (preset === "all") {
    return { success: true, range: { end: null, start: null } };
  }

  let start: Date;
  let end: Date;

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDay(today);
    end = endOfDay(today);
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDay(today);
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDay(today);
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDay(today);
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const today = new Date();
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDay(addDays(today, -(days - 1)));
    end = endOfDay(today);
  } else {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_CONTENT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return { success: true, range: { end, start } };
};

export const contentDetailPeriodLabel: Record<
  NonNullable<AdminCommunityContentDetailQuery["period"]>,
  string
> = {
  all: "Todo o período",
  custom: "Período personalizado",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  month: "Este mês",
  today: "Hoje",
  week: "Esta semana",
  year: "Este ano",
};

export type ContentDetailPeriodResult =
  | {
      period: AdminCommunityContentAnalyticsDetailDTO["period"];
      range: { end: Date; start: Date };
      success: true;
    }
  | { code: string; success: false };

export const resolveContentDetailPeriod = (
  query: AdminCommunityContentDetailQuery,
  contentCreatedAt: Date,
): ContentDetailPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : "month");
  const today = new Date();
  let start: Date;
  let end = endOfDay(today);

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
  } else if (preset === "today") {
    start = startOfDay(today);
  } else if (preset === "week") {
    start = startOfWeek(today);
  } else if (preset === "month") {
    start = startOfMonth(today);
  } else if (preset === "year") {
    start = startOfYear(today);
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDay(addDays(today, -(days - 1)));
  } else if (preset === "all") {
    start = startOfDay(contentCreatedAt);
  } else {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_CONTENT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    period: {
      days,
      from: dateKey(start),
      label: contentDetailPeriodLabel[preset],
      max_days: MAX_CONTENT_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    range: { end, start },
    success: true,
  };
};

export const contentMatchesPeriod = (
  item: AdminCommunityContentItemDTO,
  range: ContentPeriodRange,
) => {
  if (!range.start || !range.end) return true;

  return item.created_at >= range.start && item.created_at <= range.end;
};

export const normalizeCommunityContentSort = (sort?: string | null): AdminCommunityContentSort =>
  sort && COMMUNITY_CONTENT_SORTS.has(sort as AdminCommunityContentSort)
    ? (sort as AdminCommunityContentSort)
    : "engagement";

export const communityContentEngagementScore = (item: AdminCommunityContentItemDTO) =>
  item.metrics.views_count +
  item.metrics.upvotes_count +
  item.metrics.downvotes_count +
  item.metrics.comments_count +
  item.metrics.saves_count +
  item.metrics.shares_count +
  item.metrics.whatsapp_clicks_count;

export const compareCommunityContentByRecent = (
  left: AdminCommunityContentItemDTO,
  right: AdminCommunityContentItemDTO,
) =>
  right.created_at.getTime() - left.created_at.getTime() ||
  left.content_id.localeCompare(right.content_id);

export const sortCommunityContentItems = (
  items: AdminCommunityContentItemDTO[],
  sort: AdminCommunityContentSort,
) =>
  [...items].sort((left, right) => {
    if (sort === "oldest") {
      return (
        left.created_at.getTime() - right.created_at.getTime() ||
        left.content_id.localeCompare(right.content_id)
      );
    }

    if (sort === "recent") return compareCommunityContentByRecent(left, right);

    return (
      communityContentEngagementScore(right) - communityContentEngagementScore(left) ||
      compareCommunityContentByRecent(left, right)
    );
  });

export type StatisticsPeriodRange = { end: Date; start: Date };

export type StatisticsPeriodResult =
  | {
      current: StatisticsPeriodRange;
      period: AdminCommunityStatisticsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

export const statisticsPeriodLabel: Record<
  NonNullable<AdminCommunityStatisticsQuery["period"]>,
  string
> = {
  all: "Todo o per\u00edodo",
  custom: "Per\u00edodo personalizado",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias",
  month: "Este m\u00eas",
  today: "Hoje",
  week: "Esta semana",
  year: "Este ano",
};

export const resolveStatisticsPeriod = (
  query: AdminCommunityStatisticsQuery = {},
  communityCreatedAt: Date,
): StatisticsPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : "month");
  const today = new Date();
  let start: Date;
  let end = endOfDay(today);

  if (preset === "custom") {
    if (!hasCustomFrom || !hasCustomTo) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    const customStart = parseDateOnly(query.from, "start");
    const customEnd = parseDateOnly(query.to, "end");

    if (!customStart || !customEnd || customStart > customEnd) {
      return { success: false, code: "invalid_analytics_date_range" };
    }

    start = customStart;
    end = customEnd;
  } else if (preset === "today") {
    start = startOfDay(today);
  } else if (preset === "week") {
    start = startOfWeek(today);
  } else if (preset === "month") {
    start = startOfMonth(today);
  } else if (preset === "year") {
    start = startOfYear(today);
  } else if (preset === "7d" || preset === "30d" || preset === "90d") {
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    start = startOfDay(addDays(today, -(days - 1)));
  } else if (preset === "all") {
    start = startOfDay(communityCreatedAt);
  } else {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_STATISTICS_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      days,
      from: dateKey(start),
      label: statisticsPeriodLabel[preset],
      max_days: MAX_STATISTICS_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    success: true,
  };
};
