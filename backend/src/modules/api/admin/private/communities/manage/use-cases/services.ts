import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { deriveCommunityVisualColorFields, isCommunityHexColor } from "@/utils/community-visual";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunitiesListItemDTO,
  AdminCommunitiesListQuery,
  AdminCommunitiesListSort,
  AdminCommunityActivitiesDTO,
  AdminCommunityActivitiesFilterOptionDTO,
  AdminCommunityActivityItemDTO,
  AdminCommunityContentDTO,
  AdminCommunityContentItemDTO,
  AdminCommunityContentQuery,
  AdminCommunityCreateBody,
  AdminCommunityDetailDTO,
  AdminCommunityIdentity,
  AdminCommunityPerformanceMetricDTO,
  AdminCommunityPerformancePointDTO,
  AdminCommunityRankingDTO,
  AdminCommunityRankingItemDTO,
  AdminCommunityRemoveContentDTO,
  AdminCommunityReportItemDTO,
  AdminCommunityReportsDTO,
  AdminCommunityReportsQuery,
  AdminCommunityResolveReportsDTO,
  AdminCommunityRuleBody,
  AdminCommunityRuleDTO,
  AdminCommunityStatusBody,
  AdminCommunityUpdateBody,
  IAdminCommunitiesListDTO,
  IAdminCommunityActivitiesDTO,
  IAdminCommunityAvatarDTO,
  IAdminCommunityContentDTO,
  IAdminCommunityCreateDTO,
  IAdminCommunityRankingDTO,
  IAdminCommunityRemoveContentDTO,
  IAdminCommunityReportsDTO,
  IAdminCommunityResolveReportsDTO,
  IAdminCommunityRuleDTO,
  IAdminCommunityShowDTO,
  IAdminCommunityStatusDTO,
  IAdminCommunityUpdateDTO,
} from "../DTOs/IAdminCommunityManageDTO";
import {
  type AdminCommunityActivityRecord,
  type AdminCommunityContentPostRecord,
  type AdminCommunityContentReplyRecord,
  type AdminCommunityListRecord,
  AdminCommunityManageRepository,
  type AdminCommunityMemberRecord,
  type AdminCommunityMentorMetrics,
  type AdminCommunityRecord,
  type AdminCommunityReportRecord,
  type AdminCommunityRuleRecord,
  adminCommunityMentorFormula,
  adminCommunityMentorScore,
  adminCommunityMentorScoreBreakdown,
} from "../repositories/AdminCommunityManageRepository";

const DETAIL_PERIOD_DAYS = 30;
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_CONTENT_PERIOD_DAYS = 3660;
const MAX_PAGE_SIZE = 50;
const DEFAULT_REPORT_PERIOD_DAYS = 90;
const MAX_ACTIVITY_PERIOD_DAYS = 365;
const MAX_REPORT_PERIOD_DAYS = 180;
const MS_PER_DAY = 86_400_000;
const REMOVE_CONTENT_CONFIRMATION = "REMOVER CONTEUDO";
const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";
const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";
const DEACTIVATE_COMMUNITY_CONFIRMATION = "DESATIVAR COMUNIDADE";
const REACTIVATE_COMMUNITY_CONFIRMATION = "REATIVAR COMUNIDADE";
const COMMUNITY_LIST_SORTS = new Set<AdminCommunitiesListSort>([
  "activity",
  "members",
  "name",
  "posts",
  "recent",
]);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const endOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  return addDays(next, diff);
};

const startOfMonth = (date: Date) => startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
const startOfYear = (date: Date) => startOfDay(new Date(date.getFullYear(), 0, 1));

const parseDateOnly = (value: string | undefined, boundary: "end" | "start") => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return boundary === "start" ? startOfDay(date) : endOfDay(date);
};

const daysBetweenInclusive = (from: Date, to: Date) => {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();

  return Math.floor((end - start) / MS_PER_DAY) + 1;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const roundPercent = (value: number) => Math.round(value * 10) / 10;
const stripHtml = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const excerpt = (value: string | null | undefined, size = 180) => {
  const clean = stripHtml(value);
  if (clean.length <= size) return clean;

  return `${clean.slice(0, size - 1).trim()}…`;
};
const normalizeSearch = (value?: string | null) => value?.trim().toLowerCase() ?? "";
const normalizePage = (page?: number) => Math.max(DEFAULT_PAGE, Number(page || DEFAULT_PAGE));
const normalizeLimit = (limit?: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit || DEFAULT_PAGE_SIZE)));
const paginate = <T>(items: T[], page: number, limit: number) => {
  const count = items.length;
  const pages = Math.max(1, Math.ceil(count / limit));
  const safePage = Math.min(page, pages);
  const start = (safePage - 1) * limit;

  return {
    count,
    data: items.slice(start, start + limit),
    page: safePage,
    pages,
    per_page: limit,
  };
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
const contentTargetKey = (type: "post" | "reply", id: string) => `${type}:${id}`;
const canonicalContentTargetType = (type?: string | null): "post" | "reply" | null => {
  if (type === "post" || type === "community_post") return "post";
  if (type === "reply" || type === "post_reply") return "reply";

  return null;
};
const groupContentTargetCountMap = <
  T extends { _count: { _all: number }; target_id: string | null; target_type: string | null },
>(
  items: T[],
) => {
  const map = new Map<string, number>();

  for (const item of items) {
    const targetType = canonicalContentTargetType(item.target_type);
    if (!targetType || !item.target_id) continue;

    const key = contentTargetKey(targetType, item.target_id);
    map.set(key, (map.get(key) ?? 0) + item._count._all);
  }

  return map;
};
const normalizeNullableText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized || null;
};
const normalizeComparableText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
const normalizeCommunityListSort = (sort?: string | null): AdminCommunitiesListSort =>
  sort && COMMUNITY_LIST_SORTS.has(sort as AdminCommunitiesListSort)
    ? (sort as AdminCommunitiesListSort)
    : "name";
const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const trend = (change: number | null): AdminCommunityPerformanceMetricDTO["trend"] => {
  if (change === null) return "unavailable";
  if (change > 0) return "up";
  if (change < 0) return "down";

  return "flat";
};

const metric = (
  label: string,
  current: number,
  previous: number,
): AdminCommunityPerformanceMetricDTO => {
  const change = percentageChange(current, previous);

  return {
    change_percent: change,
    label,
    trend: trend(change),
    value: current,
  };
};

const mapCommunity = (community: AdminCommunityRecord): AdminCommunityIdentity => ({
  active: community.active,
  avatar_url: community.avatar_url,
  category: community.category,
  created_at: community.createdAt,
  deactivated_at: community.deactivatedAt,
  description: community.description,
  id: community.id,
  members_count: community.members_count,
  name: community.name,
  slug: community.slug,
  visual_gradient_color: community.visual_gradient_color,
  visual_primary_color: community.visual_primary_color,
  visual_primary_dark_color: community.visual_primary_dark_color,
  visual_soft_color: community.visual_soft_color,
  visual_text_color: community.visual_text_color,
});

const maxDate = (dates: Date[]) => {
  if (dates.length === 0) return null;

  return dates.reduce((latest, date) => (date > latest ? date : latest), dates[0]);
};

const mapCommunityListItem = (community: AdminCommunityListRecord): AdminCommunitiesListItemDTO => {
  const publishedPosts = community.posts.filter((post) => post.status === "publicado");
  const allReplies = community.posts.flatMap((post) => post.replies);
  const comments = publishedPosts.flatMap((post) => post.replies);
  const reportsCount = community.posts.reduce(
    (total, post) =>
      total +
      post.reports.length +
      post.replies.reduce((replyTotal, reply) => replyTotal + reply.reports.length, 0),
    0,
  );
  const lastActivityAt = maxDate([
    community.createdAt,
    ...community.members.map((member) => member.createdAt),
    ...community.posts.map((post) => post.createdAt),
    ...community.posts.flatMap((post) => post.reports.map((report) => report.createdAt)),
    ...allReplies.map((comment) => comment.createdAt),
    ...allReplies.flatMap((comment) => comment.reports.map((report) => report.createdAt)),
  ]);
  const membersCount = Math.max(community.members.length, community.members_count);
  const postsCount = publishedPosts.length;
  const commentsCount = comments.length;

  return {
    active: community.active,
    activity_count: postsCount + commentsCount,
    avatar_url: community.avatar_url,
    category: normalizeNullableText(community.category),
    comments_count: commentsCount,
    created_at: community.createdAt,
    deactivated_at: community.deactivatedAt,
    description: community.description,
    detail_url: `/comunidades/${community.slug}`,
    id: community.id,
    last_activity_at: lastActivityAt,
    members_count: membersCount,
    name: community.name,
    posts_count: postsCount,
    reports_count: reportsCount,
    slug: community.slug,
    updated_at: community.updatedAt,
    visual_primary_color: community.visual_primary_color,
  };
};

const communityListMatchesSearch = (item: AdminCommunitiesListItemDTO, search: string) => {
  if (!search) return true;

  return [item.name, item.slug, item.description, item.category]
    .filter(Boolean)
    .some((value) => normalizeComparableText(value).includes(search));
};

const categoryMatches = (item: AdminCommunitiesListItemDTO, category: string | null) => {
  if (!category) return true;

  return normalizeComparableText(item.category) === normalizeComparableText(category);
};

const buildCommunityCategoryFilters = (items: AdminCommunitiesListItemDTO[]) => {
  const counts = new Map<string, { count: number; label: string }>();

  for (const item of items) {
    const label = normalizeNullableText(item.category);
    if (!label) continue;

    const id = normalizeComparableText(label);
    const current = counts.get(id) ?? { count: 0, label };
    current.count += 1;
    counts.set(id, current);
  }

  return [...counts.entries()]
    .map(([id, value]) => ({ count: value.count, id, label: value.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
};

const sortCommunityListItems = (
  items: AdminCommunitiesListItemDTO[],
  sort: AdminCommunitiesListSort,
) =>
  [...items].sort((left, right) => {
    if (sort === "members") {
      return (
        right.members_count - left.members_count ||
        left.name.localeCompare(right.name, "pt-BR") ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "posts") {
      return (
        right.posts_count - left.posts_count ||
        left.name.localeCompare(right.name, "pt-BR") ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "activity") {
      return (
        right.activity_count - left.activity_count ||
        right.reports_count - left.reports_count ||
        left.name.localeCompare(right.name, "pt-BR") ||
        left.id.localeCompare(right.id)
      );
    }

    if (sort === "recent") {
      return (
        right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id)
      );
    }

    return left.name.localeCompare(right.name, "pt-BR") || left.id.localeCompare(right.id);
  });

const mapRule = (rule: AdminCommunityRuleRecord): AdminCommunityRuleDTO => ({
  active: rule.active,
  created_at: rule.createdAt,
  description: rule.description,
  id: rule.id,
  position: rule.position,
  title: rule.title,
  updated_at: rule.updatedAt,
});

const communitySummary = (community: AdminCommunityRecord) => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
});

const contentIsRemoved = (
  item: AdminCommunityContentPostRecord | AdminCommunityContentReplyRecord,
) => {
  if ("status" in item) return item.deleted || item.status === "removido";

  return item.deleted || item.post.deleted || item.post.status === "removido";
};

type AdminCommunityContentAuthor =
  | AdminCommunityContentPostRecord["author"]
  | AdminCommunityContentReplyRecord["author"]
  | NonNullable<AdminCommunityReportRecord["post"]>["author"]
  | NonNullable<AdminCommunityReportRecord["reply"]>["author"]
  | AdminCommunityReportRecord["reporter"];
type AdminCommunityContentKind = AdminCommunityContentItemDTO["content_kind"];
type AdminCommunityReportContentKind = AdminCommunityReportItemDTO["content"]["content_kind"];
type AdminCommunityReportStatusGroup = AdminCommunityReportItemDTO["status_group"];

const contentKindLabels: Record<AdminCommunityContentKind, string> = {
  anonymous_post: "Post anônimo",
  patient_comment: "Comentário de paciente",
  patient_post: "Post de paciente",
  unverified_psychologist_post: "Post de psicólogo não verificado",
  unverified_psychologist_reply: "Resposta de psicólogo não verificado",
  verified_psychologist_post: "Post de psicólogo verificado",
  verified_psychologist_reply: "Resposta de psicólogo verificado",
};

const isContentAuthorVerified = (author: AdminCommunityContentAuthor) =>
  author.role === "psicologo" && isVerifiedProfessionalEntitlement(author.psychologist_profile);

const contentKindFor = (
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

const contentAuthorName = (author: AdminCommunityContentAuthor) => {
  if (author.role !== "psicologo") return author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: author.name,
    firstName: author.psychologist_profile?.professional_first_name,
    lastName: author.psychologist_profile?.professional_last_name,
  });
};

const contentAuthorGender = (author: AdminCommunityContentAuthor) =>
  author.role === "psicologo" ? (author.psychologist_profile?.gender ?? null) : null;

const contentMedia = (
  mediaUrl?: string | null,
  mediaType?: string | null,
): AdminCommunityContentItemDTO["media"] => {
  if (!mediaUrl || !mediaType) return null;

  return {
    media_type: mediaType,
    media_url: mediaUrl,
  };
};

const postMedia = (post: AdminCommunityContentPostRecord) => {
  const firstMedia = post.media_items[0];

  return contentMedia(
    firstMedia?.media_url ?? post.media_url,
    firstMedia?.media_type ?? post.media_type,
  );
};

const replyPublicUrl = (
  community: AdminCommunityRecord,
  reply: AdminCommunityContentReplyRecord,
) =>
  reply.parent_reply_id
    ? `/community/${community.slug}/post/${reply.post_id}/thread/${reply.parent_reply_id}#reply-${reply.id}`
    : `/community/${community.slug}/post/${reply.post_id}?focusReplyId=${encodeURIComponent(
        reply.id,
      )}#reply-${reply.id}`;

type ContentMetricsMaps = {
  postSharesByPost?: Map<string, number>;
  replySharesByReply?: Map<string, number>;
  viewsByTarget?: Map<string, number>;
  whatsappClicksByTarget?: Map<string, number>;
};

const mapPostContent = (
  community: AdminCommunityRecord,
  post: AdminCommunityContentPostRecord,
  metrics: ContentMetricsMaps = {},
): AdminCommunityContentItemDTO => {
  const contentKind = contentKindFor("post", post.author, post.anonymous);
  const anonymous = post.anonymous && post.author.role !== "psicologo";
  const targetKey = contentTargetKey("post", post.id);

  return {
    author: {
      anonymous,
      avatar: post.author.avatar,
      gender: contentAuthorGender(post.author),
      id: post.author.id,
      name: contentAuthorName(post.author),
      role: post.author.role,
      verified: isContentAuthorVerified(post.author),
    },
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
    public_url: `/community/${community.slug}/post/${post.id}`,
    status: contentIsRemoved(post) ? "removed" : "published",
    title: post.title,
    type: "post",
  };
};

const mapReplyContent = (
  community: AdminCommunityRecord,
  reply: AdminCommunityContentReplyRecord,
  metrics: ContentMetricsMaps = {},
): AdminCommunityContentItemDTO => {
  const contentKind = contentKindFor("comment", reply.author);
  const targetKey = contentTargetKey("reply", reply.id);
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
    author: {
      anonymous: false,
      avatar: reply.author.avatar,
      gender: contentAuthorGender(reply.author),
      id: reply.author.id,
      name: contentAuthorName(reply.author),
      role: reply.author.role,
      verified: isContentAuthorVerified(reply.author),
    },
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
    status: contentIsRemoved(reply) ? "removed" : "published",
    title: reply.title,
    type: "comment",
  };
};

const contentMatchesSearch = (item: AdminCommunityContentItemDTO, search: string) => {
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

const contentMatchesType = (
  item: AdminCommunityContentItemDTO,
  type: NonNullable<AdminCommunityContentQuery["type"]>,
) => {
  if (type === "all") return true;
  if (type === "posts") return item.type === "post";
  if (type === "comments") return item.type === "comment";

  return item.content_kind === type;
};

type ContentPeriodRange = { end: Date | null; start: Date | null };
type ContentPeriodResult =
  | { range: ContentPeriodRange; success: true }
  | { code: string; success: false };

const resolveContentPeriod = (query: AdminCommunityContentQuery): ContentPeriodResult => {
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
  } else {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_CONTENT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return { success: true, range: { end, start } };
};

const contentMatchesPeriod = (item: AdminCommunityContentItemDTO, range: ContentPeriodRange) => {
  if (!range.start || !range.end) return true;

  return item.created_at >= range.start && item.created_at <= range.end;
};

type ReportPeriodRange = { end: Date; start: Date };
type ReportPeriodResult =
  | {
      current: ReportPeriodRange;
      period: AdminCommunityReportsDTO["period"];
      success: true;
    }
  | { code: string; success: false };

const reportStatusGroup = (status: string): AdminCommunityReportStatusGroup => {
  const normalized = normalizeComparableText(status).replace(/_/g, " ");

  if (["pendente", "pending", "em analise", "in review"].includes(normalized)) return "pending";
  if (["improcedente", "rejeitada", "rejeitado", "dismissed", "rejected"].includes(normalized)) {
    return "dismissed";
  }
  if (
    ["procedente", "resolvida", "resolvido", "aprovada", "aprovado", "upheld"].includes(normalized)
  ) {
    return "upheld";
  }

  return "pending";
};

const reportStatusLabel = (status: string) => {
  const labels: Record<AdminCommunityReportStatusGroup, string> = {
    dismissed: "Improcedente",
    pending: "Pendente",
    upheld: "Procedente",
  };

  return labels[reportStatusGroup(status)];
};

const reportReasonLabel = (reason: string) => {
  const labels: Record<string, string> = {
    abuse: "Abuso ou desrespeito",
    other: "Outro motivo",
    privacy: "Dados pessoais ou privacidade",
    self_harm: "Autolesão ou risco",
    spam: "Spam",
  };

  return labels[reason] ?? reason;
};

const reporterRoleLabel = (role: string) => {
  const labels: Record<string, string> = {
    paciente: "Paciente",
    psicologo: "Psicólogo",
  };

  return labels[role] ?? "Usuário";
};

const reportContentKindFor = (
  type: AdminCommunityReportItemDTO["content"]["type"],
  author: AdminCommunityContentAuthor,
): AdminCommunityReportContentKind => {
  if (author.role !== "psicologo") return type === "post" ? "patient_post" : "patient_comment";

  const verified = isContentAuthorVerified(author);
  if (type === "post") {
    return verified ? "verified_psychologist_post" : "unverified_psychologist_post";
  }

  return verified ? "verified_psychologist_reply" : "unverified_psychologist_reply";
};

const reportPostMedia = (post: NonNullable<AdminCommunityReportRecord["post"]>) => {
  const firstMedia = post.media_items[0];

  return contentMedia(
    firstMedia?.media_url ?? post.media_url,
    firstMedia?.media_type ?? post.media_type,
  );
};

const reportPublicUrl = (
  community: AdminCommunityRecord,
  type: AdminCommunityReportItemDTO["content"]["type"],
  postId: string | null | undefined,
  contentId: string | null | undefined,
  parentReplyId: string | null | undefined,
) => {
  if (!postId || !contentId) return null;
  if (type === "post") return `/community/${community.slug}/post/${postId}`;

  if (parentReplyId) {
    return (
      "/community/" +
      community.slug +
      "/post/" +
      postId +
      "/thread/" +
      parentReplyId +
      "#reply-" +
      contentId
    );
  }

  return (
    "/community/" +
    community.slug +
    "/post/" +
    postId +
    "?focusReplyId=" +
    encodeURIComponent(contentId) +
    "#reply-" +
    contentId
  );
};

const resolveReportsPeriod = (query: AdminCommunityReportsQuery = {}): ReportPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  let start: Date;
  let end: Date;
  let label = "Ultimos 90 dias";

  if (hasCustomFrom || hasCustomTo) {
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
    label = "Periodo personalizado";
  } else {
    const today = new Date();
    end = endOfDay(today);
    start = startOfDay(addDays(today, -(DEFAULT_REPORT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_REPORT_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      days,
      from: dateKey(start),
      label,
      max_days: MAX_REPORT_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    success: true,
  };
};

const reportMatchesPeriod = (item: AdminCommunityReportItemDTO, range: ReportPeriodRange) =>
  item.created_at >= range.start && item.created_at <= range.end;

const normalizeReportStatusQuery = (
  status?: AdminCommunityReportsQuery["status"],
): "all" | AdminCommunityReportStatusGroup => {
  if (!status || status === "all") return "all";
  if (status === "pending" || status === "dismissed" || status === "upheld") return status;

  return reportStatusGroup(status);
};

const reportMatchesType = (
  item: AdminCommunityReportItemDTO,
  type: NonNullable<AdminCommunityReportsQuery["type"]>,
) => {
  if (type === "all") return true;
  if (type === "post") return item.content.type === "post";
  if (type === "comment" || type === "reply") return item.content.type === "comment";

  return item.content.content_kind === type;
};

const reportStatusLabelFromGroup = (group: AdminCommunityReportStatusGroup) => {
  const labels: Record<AdminCommunityReportStatusGroup, string> = {
    dismissed: "Improcedente",
    pending: "Pendente",
    upheld: "Procedente",
  };

  return labels[group];
};

const reportGroupStatusFromCounts = (
  counts: AdminCommunityReportItemDTO["status_counts"],
): AdminCommunityReportStatusGroup => {
  if (counts.pending > 0) return "pending";
  if (counts.upheld >= counts.dismissed && counts.upheld > 0) return "upheld";

  return "dismissed";
};

const refreshReportGroupDerivedFields = (item: AdminCommunityReportItemDTO) => {
  item.reporters.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  item.report_count = item.reporters.length;
  item.first_reported_at = item.reporters.reduce(
    (oldest, reporter) => (reporter.created_at < oldest ? reporter.created_at : oldest),
    item.reporters[0]?.created_at ?? item.first_reported_at,
  );
  item.last_reported_at = item.reporters.reduce(
    (latest, reporter) => (reporter.created_at > latest ? reporter.created_at : latest),
    item.reporters[0]?.created_at ?? item.last_reported_at,
  );
  item.created_at = item.last_reported_at;
  item.status_group = reportGroupStatusFromCounts(item.status_counts);
  item.status_label = reportStatusLabelFromGroup(item.status_group);
  item.status = item.status_group;
  item.capabilities = {
    can_resolve_dismissed: item.status_counts.pending > 0,
    can_resolve_upheld: item.status_counts.pending > 0,
  };
  item.reported_by = {
    label:
      item.report_count === 1
        ? (item.reporters[0]?.reporter.label ?? "Usuario")
        : `${item.report_count} denunciantes`,
    role: item.report_count === 1 ? (item.reporters[0]?.reporter.role ?? "unknown") : "multiple",
  };

  return item;
};

const mergeReportGroup = (
  current: AdminCommunityReportItemDTO,
  next: AdminCommunityReportItemDTO,
) => {
  current.reporters.push(...next.reporters);
  current.status_counts.dismissed += next.status_counts.dismissed;
  current.status_counts.pending += next.status_counts.pending;
  current.status_counts.upheld += next.status_counts.upheld;

  return refreshReportGroupDerivedFields(current);
};

const groupReportsByContent = (items: AdminCommunityReportItemDTO[]) => {
  const groups = new Map<string, AdminCommunityReportItemDTO>();

  for (const item of items) {
    const key = `${item.content.type}:${item.content.id}`;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, refreshReportGroupDerivedFields({ ...item, id: key }));
      continue;
    }

    mergeReportGroup(current, item);
  }

  return [...groups.values()].sort((a, b) => {
    if (b.report_count !== a.report_count) return b.report_count - a.report_count;

    return b.last_reported_at.getTime() - a.last_reported_at.getTime();
  });
};

const reportGroupMatchesStatus = (
  item: AdminCommunityReportItemDTO,
  status: "all" | AdminCommunityReportStatusGroup,
) => {
  if (status === "all") return true;

  return item.status_counts[status] > 0;
};

const reportGroupSafeBefore = (item: AdminCommunityReportItemDTO) => ({
  content_id: item.content.id,
  content_type: item.content.type,
  excerpt: item.content.excerpt,
  post_id: item.content.post_id,
  report_count: item.report_count,
  status_counts: item.status_counts,
  status_group: item.status_group,
  title: item.content.title,
});

const buildContentMetricsMaps = async (
  repository: AdminCommunityManageRepository,
  postIds: string[],
  replyIds: string[],
): Promise<ContentMetricsMaps> => {
  const [postShares, replyShares, contentViews, whatsappClicks] = await Promise.all([
    repository.countContentPostShares(postIds),
    repository.countContentReplyShares(replyIds),
    repository.countContentViews(postIds, replyIds),
    repository.countContentWhatsappClicks(postIds, replyIds),
  ]);

  return {
    postSharesByPost: groupCountMap(postShares, (item) => item.post_id),
    replySharesByReply: groupCountMap(replyShares, (item) => item.reply_id),
    viewsByTarget: groupContentTargetCountMap(contentViews),
    whatsappClicksByTarget: groupContentTargetCountMap(whatsappClicks),
  };
};

const contentSafeBefore = (item: AdminCommunityContentItemDTO) => ({
  author_anonymous: item.author.anonymous,
  author_role: item.author.role,
  content_id: item.content_id,
  content_type: item.type,
  excerpt: item.excerpt,
  post_id: item.post_id,
  reports_count: item.metrics.reports_count,
  title: item.title,
});

const mapReport = (
  community: AdminCommunityRecord,
  report: AdminCommunityReportRecord,
): AdminCommunityReportItemDTO => {
  const isReply = report.target_type === "reply" || Boolean(report.reply_id);
  const replyTarget = isReply ? report.reply : null;
  const postTarget = isReply ? null : report.post;
  const target = replyTarget ?? postTarget;
  const resolvedPostId = isReply
    ? (replyTarget?.post_id ?? report.post_id)
    : (postTarget?.id ?? report.post_id);
  const postId = resolvedPostId ?? report.post_id ?? report.id;
  const resolvedContentId = isReply
    ? (replyTarget?.id ?? report.reply_id ?? report.target_id)
    : (postTarget?.id ?? report.post_id ?? report.target_id);
  const contentId = resolvedContentId ?? report.id;
  const contentType: AdminCommunityReportItemDTO["content"]["type"] = isReply ? "comment" : "post";
  const author = target?.author;
  const contentKind = author
    ? reportContentKindFor(contentType, author)
    : contentType === "post"
      ? "patient_post"
      : "patient_comment";
  const statusGroup = reportStatusGroup(report.status);
  const available = Boolean(
    isReply
      ? replyTarget &&
          !replyTarget.deleted &&
          !replyTarget.post.deleted &&
          replyTarget.post.status === "publicado"
      : postTarget && !postTarget.deleted && postTarget.status === "publicado",
  );
  const reporterName = contentAuthorName(report.reporter);
  const reporter: AdminCommunityReportItemDTO["reporters"][number] = {
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reason_label: reportReasonLabel(report.reason),
    reporter: {
      id: report.reporter.id,
      label: reporterRoleLabel(report.reporter.role),
      name: reporterName,
      role: report.reporter.role,
    },
    status: report.status,
    status_group: statusGroup,
    status_label: reportStatusLabel(report.status),
  };
  const statusCounts = {
    dismissed: statusGroup === "dismissed" ? 1 : 0,
    pending: statusGroup === "pending" ? 1 : 0,
    upheld: statusGroup === "upheld" ? 1 : 0,
  };

  return {
    capabilities: {
      can_resolve_dismissed: statusGroup === "pending",
      can_resolve_upheld: statusGroup === "pending",
    },
    content: {
      available,
      body: target?.content ?? "",
      content_kind: contentKind,
      content_kind_label: contentKindLabels[contentKind],
      excerpt: excerpt(target?.content),
      id: contentId,
      media: replyTarget
        ? contentMedia(replyTarget.media_url, replyTarget.media_type)
        : postTarget
          ? reportPostMedia(postTarget)
          : null,
      post_id: postId,
      public_url: available
        ? reportPublicUrl(
            community,
            contentType,
            postId,
            contentId,
            replyTarget?.parent_reply_id ?? null,
          )
        : null,
      title: target?.title ?? null,
      type: contentType,
      unavailable_reason: available ? null : "Conteudo removido ou indisponivel",
    },
    created_at: report.createdAt,
    description: report.description,
    first_reported_at: report.createdAt,
    id: report.id,
    last_reported_at: report.createdAt,
    report_count: 1,
    reporters: [reporter],
    reason: report.reason,
    reason_label: reportReasonLabel(report.reason),
    reported_by: {
      label: reporter.reporter.label,
      role: reporter.reporter.role,
    },
    status: report.status,
    status_counts: statusCounts,
    status_group: statusGroup,
    status_label: reportStatusLabel(report.status),
  };
};

const reportMatchesSearch = (item: AdminCommunityReportItemDTO, search: string) => {
  if (!search) return true;

  return [
    item.reason,
    item.reason_label,
    item.description,
    item.content.title,
    item.content.excerpt,
    item.content.body,
    item.content.content_kind_label,
    item.reported_by.label,
    item.status_label,
    ...item.reporters.flatMap((reporter) => [
      reporter.reason,
      reporter.reason_label,
      reporter.description,
      reporter.reporter.name,
      reporter.reporter.label,
      reporter.status_label,
    ]),
  ]
    .filter(Boolean)
    .some((value) => value?.toLowerCase().includes(search));
};

const activitySummary = (activity: AdminCommunityActivityRecord) => {
  if (activity.action === "community_report_dismissed") {
    return "Denuncia marcada como improcedente";
  }
  if (activity.action === "community_report_upheld") {
    return "Denuncia marcada como procedente";
  }
  if (activity.action === "community_content_removed") return "Conteúdo removido";
  if (activity.action === "community_deactivated") return "Comunidade desativada";
  if (activity.action === "community_reactivated") return "Comunidade reativada";
  if (activity.action.includes("rule")) return "Regra da comunidade alterada";
  if (activity.action.includes("avatar")) return "Avatar da comunidade alterado";
  if (activity.action.includes("update")) return "Dados da comunidade alterados";

  return activity.action.replace(/_/g, " ");
};

const mapActivity = (activity: AdminCommunityActivityRecord): AdminCommunityActivityItemDTO => ({
  action: activity.action,
  actor: activity.admin.name || activity.admin.email,
  area: activity.area || "Comunidade",
  created_at: activity.createdAt,
  id: activity.id,
  reason: activity.reason,
  source: activity.source,
  summary: activitySummary(activity),
});

type ActivityPeriodResult =
  | {
      current: { end: Date | null; start: Date | null };
      period: AdminCommunityActivitiesDTO["period"];
      success: true;
    }
  | { code: string; success: false };

const resolveActivityPeriod = (
  query: { from?: string; to?: string } = {},
): ActivityPeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  if (!hasCustomFrom && !hasCustomTo) {
    return {
      current: { end: null, start: null },
      period: {
        from: null,
        label: "Todo histórico registrado",
        max_days: null,
        timezone: "server-local",
        to: null,
      },
      success: true,
    };
  }

  if (!hasCustomFrom || !hasCustomTo) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const start = parseDateOnly(query.from, "start");
  const end = parseDateOnly(query.to, "end");

  if (!start || !end || start > end) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_ACTIVITY_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  return {
    current: { end, start },
    period: {
      from: dateKey(start),
      label: "Período filtrado",
      max_days: MAX_ACTIVITY_PERIOD_DAYS,
      timezone: "server-local",
      to: dateKey(end),
    },
    success: true,
  };
};

const activityAreaId = (area: string) =>
  normalizeComparableText(area)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "sem_area";

const activityMatchesPeriod = (
  item: AdminCommunityActivityItemDTO,
  period: { end: Date | null; start: Date | null },
) => {
  if (!period.start || !period.end) return true;

  return item.created_at >= period.start && item.created_at <= period.end;
};

const activityMatchesQuery = (
  item: AdminCommunityActivityItemDTO,
  query: { area: string; q: string; type: string },
) => {
  if (query.area !== "all" && activityAreaId(item.area) !== query.area) return false;
  if (query.type !== "all" && item.action !== query.type) return false;
  if (!query.q) return true;

  return [item.action, item.summary, item.reason, item.actor, item.area]
    .filter(Boolean)
    .some((value) => normalizeComparableText(value).includes(normalizeComparableText(query.q)));
};

const activityFiltersFromActivities = (
  activities: AdminCommunityActivityItemDTO[],
): AdminCommunityActivitiesDTO["filters"] => {
  const areaCounts = new Map<string, { count: number; label: string }>();
  const typeCounts = new Map<string, { count: number; label: string }>();

  for (const item of activities) {
    const areaId = activityAreaId(item.area);
    const currentArea = areaCounts.get(areaId) ?? { count: 0, label: item.area };
    currentArea.count += 1;
    areaCounts.set(areaId, currentArea);

    const currentType = typeCounts.get(item.action) ?? { count: 0, label: item.summary };
    currentType.count += 1;
    typeCounts.set(item.action, currentType);
  }

  const areas: AdminCommunityActivitiesFilterOptionDTO[] = [...areaCounts.entries()]
    .map(([id, option]) => ({ count: option.count, id, label: option.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));
  const types: AdminCommunityActivitiesFilterOptionDTO[] = [...typeCounts.entries()]
    .map(([id, option]) => ({ count: option.count, id, label: option.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "pt-BR"));

  return {
    areas: [{ count: activities.length, id: "all", label: "Todas as áreas" }, ...areas],
    types: [{ count: activities.length, id: "all", label: "Todos os tipos" }, ...types],
  };
};

const mentorDisplayName = (member: AdminCommunityMemberRecord) =>
  buildProfessionalFullDisplayName({
    fallbackName: member.user.name,
    firstName: member.user.psychologist_profile?.professional_first_name,
    lastName: member.user.psychologist_profile?.professional_last_name,
  });

const verifiedMentor = (member: AdminCommunityMemberRecord) => {
  const profile = member.user.psychologist_profile;

  return Boolean(
    profile?.crp_status === "aprovado" || profile?.cfp_verified_at || profile?.subscriptions.length,
  );
};

const compareRanking = (
  left: {
    member: AdminCommunityMemberRecord;
    metrics: AdminCommunityMentorMetrics;
    score: number;
  },
  right: {
    member: AdminCommunityMemberRecord;
    metrics: AdminCommunityMentorMetrics;
    score: number;
  },
) => {
  const scoreDiff = right.score - left.score;
  if (scoreDiff !== 0) return scoreDiff;

  const upvoteDiff = right.metrics.upvotes_received - left.metrics.upvotes_received;
  if (upvoteDiff !== 0) return upvoteDiff;

  const commentDiff = right.metrics.comments_received - left.metrics.comments_received;
  if (commentDiff !== 0) return commentDiff;

  const saveDiff = right.metrics.saves_received - left.metrics.saves_received;
  if (saveDiff !== 0) return saveDiff;

  const activeDayDiff = right.metrics.active_days - left.metrics.active_days;
  if (activeDayDiff !== 0) return activeDayDiff;

  const replyDiff = right.metrics.replies_published - left.metrics.replies_published;
  if (replyDiff !== 0) return replyDiff;

  const postDiff = right.metrics.posts_published - left.metrics.posts_published;
  if (postDiff !== 0) return postDiff;

  const downvoteDiff = left.metrics.downvotes_received - right.metrics.downvotes_received;
  if (downvoteDiff !== 0) return downvoteDiff;

  const removedPostDiff = left.metrics.removed_posts - right.metrics.removed_posts;
  if (removedPostDiff !== 0) return removedPostDiff;

  const nameDiff = mentorDisplayName(left.member).localeCompare(
    mentorDisplayName(right.member),
    "pt-BR",
  );
  if (nameDiff !== 0) return nameDiff;

  return left.member.user.id.localeCompare(right.member.user.id);
};

const rankMembers = (
  members: AdminCommunityMemberRecord[],
  metricsByMentorId: Map<string, AdminCommunityMentorMetrics>,
) =>
  members
    .map((member) => {
      const metrics = metricsByMentorId.get(member.user.id) ?? {
        active_days: 0,
        comments_received: 0,
        community_whatsapp_clicks: 0,
        downvotes_received: 0,
        posts_published: 0,
        removed_posts: 0,
        removed_posts_penalty: 0,
        replies_published: 0,
        saves_received: 0,
        shares_received: 0,
        upvotes_received: 0,
      };

      return {
        member,
        metrics,
        score: adminCommunityMentorScore(metrics),
      };
    })
    .sort(compareRanking)
    .map((item, index) => ({
      ...item,
      position: index + 1,
    }));

const buildRankingPeriod = () => {
  const today = endOfDay(new Date());
  const currentStart = startOfDay(addDays(today, -(DETAIL_PERIOD_DAYS - 1)));
  const previousEnd = endOfDay(addDays(currentStart, -1));
  const previousStart = startOfDay(addDays(currentStart, -DETAIL_PERIOD_DAYS));

  return {
    current_from: currentStart,
    current_to: today,
    days: DETAIL_PERIOD_DAYS as 30,
    label: "Últimos 30 dias" as const,
    previous_from: previousStart,
    previous_to: previousEnd,
  };
};

const normalizeCommunitySlug = (value?: string | null) =>
  normalizeComparableText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/^-+|-+$/g, "");

const normalizeCommunityCreate = (
  body: AdminCommunityCreateBody,
): AdminCommunityCreateBody & { slug: string } => ({
  category: normalizeNullableText(body.category),
  description: normalizeNullableText(body.description),
  name: body.name.trim(),
  slug: normalizeCommunitySlug(body.slug || body.name),
  ...deriveCommunityVisualColorFields(body.visual_primary_color),
});

const hasOwn = <T extends object>(object: T, key: keyof T) => Object.hasOwn(object, key);

const normalizeCommunityUpdate = (body: AdminCommunityUpdateBody): AdminCommunityUpdateBody => {
  const normalized: AdminCommunityUpdateBody = {
    description: normalizeNullableText(body.description),
    name: body.name?.trim(),
  };

  if (hasOwn(body, "visual_primary_color")) {
    Object.assign(normalized, deriveCommunityVisualColorFields(body.visual_primary_color));
  }

  return normalized;
};

const invalidColor = (body: AdminCommunityUpdateBody) =>
  hasOwn(body, "visual_primary_color") && !isCommunityHexColor(body.visual_primary_color);

const normalizeRuleBody = (body: AdminCommunityRuleBody): Required<AdminCommunityRuleBody> => ({
  active: body.active ?? true,
  description: body.description.trim(),
  position: typeof body.position === "number" ? body.position : 0,
  title: body.title.trim(),
});

const normalizeCommunityStatus = (body: AdminCommunityStatusBody): AdminCommunityStatusBody => ({
  active: body.active,
  confirmation: body.confirmation.trim().toUpperCase(),
  reason: body.reason.trim(),
});

const resolvePeriod = () => {
  const today = endOfDay(new Date());
  const currentStart = startOfDay(addDays(today, -(DETAIL_PERIOD_DAYS - 1)));
  const previousEnd = endOfDay(addDays(currentStart, -1));
  const previousStart = startOfDay(addDays(currentStart, -DETAIL_PERIOD_DAYS));

  return {
    current: { from: currentStart, to: today },
    previous: { from: previousStart, to: previousEnd },
  };
};

const buildPoints = (
  performance: Awaited<ReturnType<AdminCommunityManageRepository["listPerformance"]>>,
) => {
  const period = resolvePeriod();
  const labels = Array.from({ length: DETAIL_PERIOD_DAYS }, (_, index) =>
    dateKey(addDays(period.current.from, index)),
  );
  const empty = new Map(labels.map((label) => [label, 0]));
  const count = (items: Array<{ createdAt: Date }>) => {
    const map = new Map(empty);
    for (const item of items) {
      const label = dateKey(item.createdAt);
      if (map.has(label)) map.set(label, (map.get(label) ?? 0) + 1);
    }

    return map;
  };

  const posts = count(performance.posts);
  const comments = count(performance.comments);
  const members = count(performance.members);
  const reports = count(performance.reports);

  return labels.map(
    (date): AdminCommunityPerformancePointDTO => ({
      comments: comments.get(date) ?? 0,
      date,
      members: members.get(date) ?? 0,
      posts: posts.get(date) ?? 0,
      reports: reports.get(date) ?? 0,
    }),
  );
};

const buildMentors = (
  replies: Awaited<ReturnType<AdminCommunityManageRepository["listTopMentors"]>>,
) => {
  const mentors = new Map<
    string,
    {
      avatar: string | null;
      crp: string | null;
      id: string;
      name: string;
      rating_avg: number;
      replies_count: number;
      upvotes_count: number;
      verified: boolean;
    }
  >();

  for (const reply of replies) {
    const profile = reply.author.psychologist_profile;
    const current = mentors.get(reply.author.id) ?? {
      avatar: reply.author.avatar,
      crp: profile?.crp ?? null,
      id: reply.author.id,
      name: reply.author.name,
      rating_avg: Number(profile?.rating_avg ?? 0),
      replies_count: 0,
      upvotes_count: 0,
      verified: Boolean(
        profile?.crp_status === "aprovado" ||
          profile?.cfp_verified_at ||
          profile?.subscriptions.length,
      ),
    };

    current.replies_count += 1;
    current.upvotes_count += reply.upvotes_count;
    mentors.set(reply.author.id, current);
  }

  return Array.from(mentors.values())
    .map((mentor) => ({
      ...mentor,
      score: mentor.replies_count * 10 + mentor.upvotes_count * 5,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5)
    .map((mentor, index) => ({ ...mentor, position: index + 1 }));
};

const publicFileUrl = (key: string) => {
  const rawBase = String(process.env.BASE || "").trim();
  let base = rawBase.replace(/\/$/, "");

  try {
    base = rawBase ? new URL(rawBase).origin : "";
  } catch (_err) {
    base = rawBase.replace(/\/$/, "");
  }

  const publicPath = `/public/files/${key}`;

  return base ? `${base}${publicPath}` : publicPath;
};

const findCommunityOrNotFound = async (
  repository: AdminCommunityManageRepository,
  idOrSlug: string,
) => {
  const community = await repository.findCommunity(idOrSlug);

  if (!community) return null;

  return community;
};

const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "community" }),
});

export const listCommunities = async (data: IAdminCommunitiesListDTO): Promise<Resolve> => {
  const query: AdminCommunitiesListQuery = data.q ?? {};
  if (query.sort && !COMMUNITY_LIST_SORTS.has(query.sort)) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const search = normalizeComparableText(query.q);
  const sort = normalizeCommunityListSort(query.sort);
  const page = normalizePage(query.page);
  const limit = normalizeLimit(query.limit);
  const category = normalizeNullableText(query.category);
  const normalizedCategory =
    category && normalizeComparableText(category) !== "all" ? category : null;

  const records = await repository.listCommunities();
  const allItems = records.map(mapCommunityListItem);
  const filteredItems = allItems.filter(
    (item) => communityListMatchesSearch(item, search) && categoryMatches(item, normalizedCategory),
  );
  const paginated = paginate(sortCommunityListItems(filteredItems, sort), page, limit);
  const activeFiltersCount = [search, normalizedCategory].filter(Boolean).length;

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      active_filters_count: activeFiltersCount,
      count: paginated.count,
      data: paginated.data,
      filters: {
        categories: buildCommunityCategoryFilters(allItems),
      },
      page: paginated.page,
      pages: paginated.pages,
      per_page: paginated.per_page,
      sort,
      source: "community+community_member+community_post+post_reply+post_report",
    },
  };
};

export const showCommunity = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const period = resolvePeriod();
  const [
    rules,
    postsCount,
    commentsCount,
    popularPostsCount,
    currentPerformance,
    previousPerformance,
    topMentorReplies,
    popularPosts,
  ] = await Promise.all([
    repository.listRules(community.id, true),
    repository.countPublishedPosts(community.id),
    repository.countComments(community.id),
    repository.countPopularPosts(community.id),
    repository.listPerformance(community.id, period.current.from, period.current.to),
    repository.listPerformance(community.id, period.previous.from, period.previous.to),
    repository.listTopMentors(community.id, period.current.from, period.current.to),
    repository.listPopularPosts(community.id),
  ]);

  const currentTotals = {
    comments: currentPerformance.comments.length,
    members: currentPerformance.members.length,
    posts: currentPerformance.posts.length,
    reports: currentPerformance.reports.length,
  };
  const previousTotals = {
    comments: previousPerformance.comments.length,
    members: previousPerformance.members.length,
    posts: previousPerformance.posts.length,
    reports: previousPerformance.reports.length,
  };

  const result: AdminCommunityDetailDTO = {
    community: mapCommunity(community),
    performance: {
      days: DETAIL_PERIOD_DAYS,
      metrics: {
        comments: metric("Comentários", currentTotals.comments, previousTotals.comments),
        new_members: metric("Novos membros", currentTotals.members, previousTotals.members),
        new_posts: metric("Novos posts", currentTotals.posts, previousTotals.posts),
        reports: metric("Denúncias", currentTotals.reports, previousTotals.reports),
      },
      points: buildPoints(currentPerformance),
    },
    popular_posts: popularPosts.map((post) => ({
      author_name: post.author.name,
      author_role: post.author.role,
      comments_count: post.replies_count,
      created_at: post.createdAt,
      id: post.id,
      saves_count: post.saves_count,
      title: post.title,
      upvotes_count: post.upvotes_count,
    })),
    rules: rules.map(mapRule),
    summary: {
      comments_count: commentsCount,
      members_count: community.members_count,
      popular_posts_count: popularPostsCount,
      posts_count: postsCount,
    },
    top_mentors: buildMentors(topMentorReplies),
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: result,
  };
};

export const createCommunity = async (data: IAdminCommunityCreateDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const body = normalizeCommunityCreate(data.b);

  if (!body.slug) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  if (invalidColor(body)) {
    return {
      status: 422,
      ...error("invalid", { model: "community" }),
    };
  }

  const existing = await repository.findCommunity(body.slug);
  if (existing) {
    return {
      status: 409,
      ...error("unique", { property: "slug" }),
    };
  }

  const created = await repository.createCommunity(body);

  return {
    status: 201,
    ...msg("created", { model: "community" }),
    data: mapCommunity(created as AdminCommunityRecord),
  };
};

export const updateCommunity = async (data: IAdminCommunityUpdateDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const body = normalizeCommunityUpdate(data.b);
  if (invalidColor(body)) {
    return {
      status: 422,
      ...error("invalid", { model: "community" }),
    };
  }

  const updated = await repository.updateCommunity(community.id, body);

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: mapCommunity(updated),
  };
};

export const updateCommunityStatus = async (data: IAdminCommunityStatusDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const body = normalizeCommunityStatus(data.b);
  const expectedConfirmation = body.active
    ? REACTIVATE_COMMUNITY_CONFIRMATION
    : DEACTIVATE_COMMUNITY_CONFIRMATION;

  if (body.confirmation !== expectedConfirmation) {
    return {
      status: 400,
      ...error("invalid_structure", {}),
    };
  }

  if (community.active === body.active) {
    return {
      status: 200,
      ...msg("updated", { model: "community" }),
      data: mapCommunity(community),
    };
  }

  const updated = await repository.updateCommunityStatus(community, {
    ...body,
    adminId: admin.id,
  });

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: mapCommunity(updated),
  };
};

export const uploadCommunityAvatar = async (data: IAdminCommunityAvatarDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const key = data.file?.path || data.file?.key;
  if (!key?.startsWith("community/avatar/")) {
    return {
      status: 400,
      ...error("upload_error", {}),
    };
  }

  const avatar_url = publicFileUrl(key);
  const updated = await repository.updateCommunity(community.id, { avatar_url });

  return {
    status: 200,
    ...msg("updated", { model: "community" }),
    data: {
      avatar_url,
      community: mapCommunity(updated),
    },
  };
};

export const listRules = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const rules = await repository.listRules(community.id, true);

  return {
    status: 200,
    ...msg("index", {}),
    data: {
      community: {
        id: community.id,
        name: community.name,
        slug: community.slug,
      },
      rules: rules.map(mapRule),
    },
  };
};

export const createRule = async (data: IAdminCommunityRuleDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const rule = await repository.addRule(community.id, normalizeRuleBody(data.b));

  return {
    status: 201,
    ...msg("created", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};

export const updateRule = async (data: IAdminCommunityRuleDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community || !data.p.ruleId) return notFound();

  const body = normalizeRuleBody(data.b);
  const rule = await repository.updateRule(community.id, data.p.ruleId, body);
  if (!rule) return notFound();

  return {
    status: 200,
    ...msg("updated", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};

export const deleteRule = async (data: IAdminCommunityShowDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community || !data.p.ruleId) return notFound();

  const rule = await repository.softDeleteRule(community.id, data.p.ruleId);
  if (!rule) return notFound();

  return {
    status: 200,
    ...msg("deleted", { model: "community_rule" }),
    data: mapRule(rule as AdminCommunityRuleRecord),
  };
};

export const listContent = async (data: IAdminCommunityContentDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const queryType = data.q.type ?? "all";
  const queryPeriod = resolveContentPeriod(data.q);
  if (!queryPeriod.success) return { status: 400, ...error(queryPeriod.code, {}) };

  const queryStatus = data.q.status ?? "all";
  const search = normalizeSearch(data.q.q);
  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const { posts, replies } = await repository.listContent(community.id);
  const metrics = await buildContentMetricsMaps(
    repository,
    posts.map((post) => post.id),
    replies.map((reply) => reply.id),
  );
  const postItems = posts.map((post) => mapPostContent(community, post, metrics));
  const replyItems = replies.map((reply) => mapReplyContent(community, reply, metrics));
  const items = [...postItems, ...replyItems]
    .filter((item) => contentMatchesType(item, queryType))
    .filter((item) => contentMatchesPeriod(item, queryPeriod.range))
    .filter((item) => queryStatus === "all" || item.status === queryStatus)
    .filter((item) => contentMatchesSearch(item, search))
    .sort((left, right) => right.created_at.getTime() - left.created_at.getTime());
  const result = paginate(items, page, limit);
  const payload: AdminCommunityContentDTO = {
    community: communitySummary(community),
    count: result.count,
    data: result.data,
    page: result.page,
    pages: result.pages,
    per_page: result.per_page,
    source: "community_post+post_reply+post_share+page_view_event+important_action_event",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const removeContent = async (data: IAdminCommunityRemoveContentDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  if (data.b.confirmation.trim().toUpperCase() !== REMOVE_CONTENT_CONFIRMATION) {
    return {
      status: 400,
      ...error("admin_community_content_remove_confirmation_invalid", {}),
    };
  }

  const targetType = data.p.targetType === "reply" ? "comment" : data.p.targetType;
  if (targetType !== "post" && targetType !== "comment") {
    return {
      status: 400,
      ...error("admin_community_content_target_invalid", {}),
    };
  }

  if (targetType === "post") {
    const post = await repository.findPostContent(community.id, data.p.targetId ?? "");
    if (!post) {
      return {
        status: 404,
        ...error("admin_community_content_target_invalid", {}),
      };
    }
    const item = mapPostContent(
      community,
      post,
      await buildContentMetricsMaps(repository, [post.id], []),
    );
    if (item.status === "removed") {
      return {
        status: 409,
        ...error("admin_community_content_remove_unavailable", {}),
      };
    }

    const removed = await repository.removePostContent({
      adminId: admin.id,
      communityId: community.id,
      post,
      reason: data.b.reason,
      safeBefore: contentSafeBefore(item),
    });
    const payload: AdminCommunityRemoveContentDTO = {
      affected_reports_count: removed.affectedReportsCount,
      affected_replies_count: removed.affectedRepliesCount,
      content_id: post.id,
      post_id: post.id,
      type: "post",
    };

    return {
      status: 200,
      ...msg("admin_community_content_removed", {}),
      data: payload,
    };
  }

  const reply = await repository.findReplyContent(community.id, data.p.targetId ?? "");
  if (!reply) {
    return {
      status: 404,
      ...error("admin_community_content_target_invalid", {}),
    };
  }
  const item = mapReplyContent(
    community,
    reply,
    await buildContentMetricsMaps(repository, [], [reply.id]),
  );
  if (item.status === "removed") {
    return {
      status: 409,
      ...error("admin_community_content_remove_unavailable", {}),
    };
  }

  const removed = await repository.removeReplyContent({
    adminId: admin.id,
    communityId: community.id,
    reason: data.b.reason,
    reply,
    safeBefore: contentSafeBefore(item),
  });
  const payload: AdminCommunityRemoveContentDTO = {
    affected_reports_count: removed.affectedReportsCount,
    affected_replies_count: removed.affectedRepliesCount,
    content_id: reply.id,
    post_id: reply.post_id,
    type: "comment",
  };

  return {
    status: 200,
    ...msg("admin_community_content_removed", {}),
    data: payload,
  };
};

export const listRanking = async (data: IAdminCommunityRankingDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const search = normalizeSearch(data.q.q);
  const period = buildRankingPeriod();
  const members = await repository.listPsychologistMembers(community.id);
  const mentorIds = members.map((member) => member.user.id);
  const [currentMetrics, previousMetrics] = await Promise.all([
    repository.buildMentorMetrics(community.id, mentorIds, period.current_from, period.current_to),
    repository.buildMentorMetrics(
      community.id,
      mentorIds,
      period.previous_from,
      period.previous_to,
    ),
  ]);
  const currentRanking = rankMembers(members, currentMetrics);
  const previousByMentorId = new Map(
    rankMembers(members, previousMetrics).map((item) => [item.member.user.id, item.position]),
  );
  const filteredRanking = currentRanking.filter((item) =>
    search ? mentorDisplayName(item.member).toLowerCase().includes(search) : true,
  );
  const paginated = paginate(filteredRanking, page, limit);
  const payload: AdminCommunityRankingDTO = {
    community: communitySummary(community),
    count: paginated.count,
    data: paginated.data.map((item): AdminCommunityRankingItemDTO => {
      const joinedAfterPreviousPeriod = item.member.createdAt > period.previous_to;
      const previousPosition = joinedAfterPreviousPeriod
        ? null
        : (previousByMentorId.get(item.member.user.id) ?? null);
      const positionDelta = previousPosition ? previousPosition - item.position : null;
      const trend =
        positionDelta === null
          ? "new"
          : positionDelta > 0
            ? "up"
            : positionDelta < 0
              ? "down"
              : "flat";
      const profile = item.member.user.psychologist_profile;
      const name = mentorDisplayName(item.member);

      return {
        membership_created_at: item.member.createdAt,
        mentor: {
          avatar: item.member.user.avatar,
          crp: profile?.crp ?? null,
          headline: profile?.headline ?? null,
          id: item.member.user.id,
          name,
          profile_url: `/psychologists/${item.member.user.id}`,
          rating_avg: Number(profile?.rating_avg ?? 0),
          rating_count: Number(profile?.rating_count ?? 0),
          verified: verifiedMentor(item.member),
        },
        metrics: {
          ...item.metrics,
          participation_events: item.metrics.posts_published + item.metrics.replies_published,
        },
        position: item.position,
        position_delta: positionDelta,
        previous_position: previousPosition,
        score: item.score,
        score_breakdown: adminCommunityMentorScoreBreakdown(item.metrics),
        trend,
      };
    }),
    formula: adminCommunityMentorFormula(),
    page: paginated.page,
    pages: paginated.pages,
    per_page: paginated.per_page,
    period,
    source: "community_member+community_post+post_reply+post_vote+post_save+post_share",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const listReports = async (data: IAdminCommunityReportsDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const search = normalizeSearch(data.q.q);
  const status = normalizeReportStatusQuery(data.q.status);
  const type = data.q.type ?? "all";
  const period = resolveReportsPeriod(data.q);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const items = (await repository.listReports(community.id))
    .map((report) => mapReport(community, report))
    .filter((item) => reportMatchesPeriod(item, period.current));
  const reports = groupReportsByContent(items.filter((item) => reportMatchesType(item, type)))
    .filter((item) => reportGroupMatchesStatus(item, status))
    .filter((item) => reportMatchesSearch(item, search));
  const countByStatus = (statusGroup: AdminCommunityReportStatusGroup) =>
    items.filter((item) => item.status_group === statusGroup).length;
  const countByType = (contentKind: AdminCommunityReportContentKind) =>
    items.filter((item) => item.content.content_kind === contentKind).length;
  const paginated = paginate(reports, page, limit);
  const payload: AdminCommunityReportsDTO = {
    active_filters_count: [
      type !== "all" ? type : "",
      status !== "all" ? status : "",
      data.q.from && data.q.to ? "period" : "",
      search ? "q" : "",
    ].filter(Boolean).length,
    cards: [
      { id: "total", label: "Total de denúncias", source: "post_report", value: items.length },
      { id: "pending", label: "Pendentes", source: "post_report", value: countByStatus("pending") },
      { id: "upheld", label: "Procedentes", source: "post_report", value: countByStatus("upheld") },
      {
        id: "dismissed",
        label: "Improcedentes",
        source: "post_report",
        value: countByStatus("dismissed"),
      },
    ],
    community: communitySummary(community),
    count: paginated.count,
    data: paginated.data,
    filters: {
      statuses: [
        { count: items.length, id: "all", label: "Todos os status" },
        { count: countByStatus("pending"), id: "pending", label: "Pendentes" },
        { count: countByStatus("upheld"), id: "upheld", label: "Procedentes" },
        { count: countByStatus("dismissed"), id: "dismissed", label: "Improcedentes" },
      ],
      types: [
        { count: items.length, id: "all", label: "Todos" },
        {
          count: countByType("verified_psychologist_post"),
          id: "verified_psychologist_post",
          label: "Post de psicólogo verificado",
        },
        {
          count: countByType("unverified_psychologist_post"),
          id: "unverified_psychologist_post",
          label: "Post de psicólogo não verificado",
        },
        {
          count: countByType("verified_psychologist_reply"),
          id: "verified_psychologist_reply",
          label: "Resposta de psicólogo verificado",
        },
        {
          count: countByType("unverified_psychologist_reply"),
          id: "unverified_psychologist_reply",
          label: "Resposta de psicólogo não verificado",
        },
        { count: countByType("patient_post"), id: "patient_post", label: "Post de paciente" },
        {
          count: countByType("patient_comment"),
          id: "patient_comment",
          label: "Comentário de paciente",
        },
      ],
    },
    page: paginated.page,
    pages: paginated.pages,
    per_page: paginated.per_page,
    period: period.period,
    source: "post_report+community_post+post_reply",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};

export const resolveReports = async (data: IAdminCommunityResolveReportsDTO): Promise<Resolve> => {
  const admin = data.admin ?? data.auth;
  if (!admin?.id) {
    return {
      status: 401,
      ...error("token_not_authorized", {}),
    };
  }

  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const targetType = data.p.targetType === "reply" ? "comment" : data.p.targetType;
  if (targetType !== "post" && targetType !== "comment") {
    return {
      status: 400,
      ...error("admin_community_report_invalid_target", {}),
    };
  }

  if (data.b.resolution !== "dismissed" && data.b.resolution !== "upheld") {
    return {
      status: 400,
      ...error("admin_community_report_invalid_status", {}),
    };
  }

  const expectedConfirmation =
    data.b.resolution === "dismissed" ? DISMISS_REPORT_CONFIRMATION : UPHOLD_REPORT_CONFIRMATION;
  if (data.b.confirmation.trim().toUpperCase() !== expectedConfirmation) {
    return {
      status: 400,
      ...error(
        data.b.resolution === "dismissed"
          ? "admin_community_report_dismiss_confirmation_invalid"
          : "admin_community_report_uphold_confirmation_invalid",
        {},
      ),
    };
  }

  const currentGroups = groupReportsByContent(
    (await repository.listReports(community.id)).map((report) => mapReport(community, report)),
  );
  const targetGroup = currentGroups.find(
    (item) => item.content.type === targetType && item.content.id === data.p.targetId,
  );
  if (!targetGroup) {
    return {
      status: 404,
      ...error("admin_community_report_invalid_target", {}),
    };
  }
  if (
    (data.b.resolution === "dismissed" && !targetGroup.capabilities.can_resolve_dismissed) ||
    (data.b.resolution === "upheld" && !targetGroup.capabilities.can_resolve_upheld)
  ) {
    return {
      status: 409,
      ...error("admin_community_report_invalid_status", {}),
    };
  }

  const resolved = await repository.resolveReportsForTarget({
    adminId: admin.id,
    communityId: community.id,
    reason: data.b.reason,
    resolution: data.b.resolution,
    safeBefore: reportGroupSafeBefore(targetGroup),
    targetId: targetGroup.content.id,
    targetType: targetGroup.content.type,
  });
  if (!resolved) {
    return {
      status: 404,
      ...error("admin_community_report_invalid_target", {}),
    };
  }

  const updatedGroup =
    groupReportsByContent(
      (await repository.listReports(community.id)).map((report) => mapReport(community, report)),
    ).find(
      (item) =>
        item.content.type === targetGroup.content.type &&
        item.content.id === targetGroup.content.id,
    ) ?? targetGroup;
  const payload: AdminCommunityResolveReportsDTO = {
    affected_reports_count: resolved.affectedReportsCount,
    content_id: targetGroup.content.id,
    post_id: targetGroup.content.post_id,
    report: updatedGroup,
    resolution: data.b.resolution,
    type: targetGroup.content.type,
  };

  return {
    status: 200,
    ...msg(
      data.b.resolution === "dismissed"
        ? "admin_community_report_dismissed"
        : "admin_community_report_upheld",
      {},
    ),
    data: payload,
  };
};

export const listActivities = async (data: IAdminCommunityActivitiesDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const page = normalizePage(data.q.page);
  const limit = normalizeLimit(data.q.limit);
  const search = normalizeSearch(data.q.q);
  const area = data.q.area?.trim() || "all";
  const type = data.q.type ?? "all";
  const period = resolveActivityPeriod({ from: data.q.from, to: data.q.to });
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const activities = (await repository.listActivities(community.id))
    .map(mapActivity)
    .filter((item) => activityMatchesPeriod(item, period.current));
  const filters = activityFiltersFromActivities(activities);
  const filteredActivities = activities.filter((item) =>
    activityMatchesQuery(item, { area, q: search, type }),
  );
  const paginated = paginate(filteredActivities, page, limit);
  const payload: AdminCommunityActivitiesDTO = {
    active_filters_count: [
      area !== "all" ? area : "",
      type !== "all" ? type : "",
      search,
      data.q.from && data.q.to ? "period" : "",
    ].filter(Boolean).length,
    community: communitySummary(community),
    count: paginated.count,
    data: paginated.data,
    filters,
    page: paginated.page,
    pages: paginated.pages,
    per_page: paginated.per_page,
    period: period.period,
    source: "admin_activity_log",
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: payload,
  };
};
