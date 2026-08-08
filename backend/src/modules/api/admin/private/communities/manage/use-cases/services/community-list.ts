import type {
  AdminCommunitiesListItemDTO,
  AdminCommunitiesListSort,
  AdminCommunityContentFormatDistributionDTO,
  AdminCommunityContentFormatId,
  AdminCommunityContentQuery,
  AdminCommunityIdentity,
  AdminCommunityPerformanceMetricDTO,
  AdminCommunityRuleDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import type {
  AdminCommunityContentPostRecord,
  AdminCommunityContentReplyRecord,
  AdminCommunityListRecord,
  AdminCommunityRecord,
  AdminCommunityRuleRecord,
} from "../../repositories/AdminCommunityManageRepository";

export const DETAIL_PERIOD_DAYS = 30;

export const DEFAULT_PAGE = 1;

export const DEFAULT_PAGE_SIZE = 10;

export const MAX_CONTENT_PERIOD_DAYS = 3660;

export const MAX_PAGE_SIZE = 50;

export const DEFAULT_REPORT_PERIOD_DAYS = 90;

export const MAX_ACTIVITY_PERIOD_DAYS = 365;

export const MAX_REPORT_PERIOD_DAYS = 180;

export const MAX_STATISTICS_PERIOD_DAYS = 3660;

export const REMOVE_CONTENT_CONFIRMATION = "REMOVER CONTEUDO";

export const DISMISS_REPORT_CONFIRMATION = "DENUNCIA IMPROCEDENTE";

export const UPHOLD_REPORT_CONFIRMATION = "DENUNCIA PROCEDENTE";

export const REVIEW_REPORT_CONFIRMATION = "REVISAR DECISAO";

export const DEACTIVATE_COMMUNITY_CONFIRMATION = "DESATIVAR COMUNIDADE";

export type AdminCommunityContentSort = NonNullable<AdminCommunityContentQuery["sort"]>;

export const COMMUNITY_CONTENT_SORTS = new Set<AdminCommunityContentSort>([
  "engagement",
  "oldest",
  "recent",
]);

export const REACTIVATE_COMMUNITY_CONFIRMATION = "REATIVAR COMUNIDADE";

export const COMMUNITY_LIST_SORTS = new Set<AdminCommunitiesListSort>([
  "activity",
  "members",
  "name",
  "posts",
  "recent",
]);

export const roundPercent = (value: number) => Math.round(value * 10) / 10;

export const CONTENT_FORMAT_ORDER = ["text", "video", "image", "image_carousel"] as const;

export const CONTENT_FORMAT_LABELS = {
  image: "Imagem",
  image_carousel: "Carrossel de imagens",
  text: "Apenas texto",
  video: "Vídeo",
} satisfies Record<
  AdminCommunityContentFormatId,
  AdminCommunityContentFormatDistributionDTO["items"][number]["label"]
>;

export const emptyContentFormatCounts = () =>
  ({
    image: 0,
    image_carousel: 0,
    text: 0,
    video: 0,
  }) satisfies Record<AdminCommunityContentFormatId, number>;

export const normalizeContentMediaType = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export type CommunityStatisticsContentFormatPost = {
  media_items: Array<{
    media_type: string;
    media_url: string;
  }>;
  media_type: string | null;
  media_url: string | null;
};

export type CommunityStatisticsContentFormatReply = {
  media_type: string | null;
  media_url: string | null;
};

export const classifyPostContentFormat = (
  post: CommunityStatisticsContentFormatPost,
): AdminCommunityContentFormatId => {
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
  reply: CommunityStatisticsContentFormatReply,
): AdminCommunityContentFormatId => {
  const mediaType = reply.media_url ? normalizeContentMediaType(reply.media_type) : "";
  if (mediaType === "video") return "video";
  if (mediaType === "image") return "image";

  return "text";
};

export const buildPostContentFormatDistribution = (
  posts: CommunityStatisticsContentFormatPost[],
): AdminCommunityContentFormatDistributionDTO => {
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
  replies: CommunityStatisticsContentFormatReply[],
): AdminCommunityContentFormatDistributionDTO => {
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

export const stripHtml = (value: string | null | undefined) =>
  (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const excerpt = (value: string | null | undefined, size = 180) => {
  const clean = stripHtml(value);
  if (clean.length <= size) return clean;

  return `${clean.slice(0, size - 1).trim()}…`;
};

export const normalizeSearch = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const normalizePage = (page?: number) =>
  Math.max(DEFAULT_PAGE, Number(page || DEFAULT_PAGE));

export const normalizeLimit = (limit?: number) =>
  Math.min(MAX_PAGE_SIZE, Math.max(1, Number(limit || DEFAULT_PAGE_SIZE)));

export const paginate = <T>(items: T[], page: number, limit: number) => {
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

export const groupCountMap = <T extends { _count: { _all: number } }>(
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

export const contentTargetKey = (type: "post" | "reply", id: string) => `${type}:${id}`;

export const canonicalContentTargetType = (type?: string | null): "post" | "reply" | null => {
  if (type === "post" || type === "community_post") return "post";
  if (type === "reply" || type === "post_reply") return "reply";

  return null;
};

export const groupContentTargetCountMap = <
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

export const normalizeNullableText = (value?: string | null) => {
  const normalized = value?.trim();

  return normalized || null;
};

export const normalizeComparableText = (value?: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const normalizeCommunityListSort = (sort?: string | null): AdminCommunitiesListSort =>
  sort && COMMUNITY_LIST_SORTS.has(sort as AdminCommunitiesListSort)
    ? (sort as AdminCommunitiesListSort)
    : "name";

export const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

export const trend = (change: number | null): AdminCommunityPerformanceMetricDTO["trend"] => {
  if (change === null) return "unavailable";
  if (change > 0) return "up";
  if (change < 0) return "down";

  return "flat";
};

export const metric = (
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

export const mapCommunity = (community: AdminCommunityRecord): AdminCommunityIdentity => ({
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

export const maxDate = (dates: Date[]) => {
  if (dates.length === 0) return null;

  return dates.reduce((latest, date) => (date > latest ? date : latest), dates[0]);
};

export const mapCommunityListItem = (
  community: AdminCommunityListRecord,
): AdminCommunitiesListItemDTO => {
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

export const communityListMatchesSearch = (item: AdminCommunitiesListItemDTO, search: string) => {
  if (!search) return true;

  return [item.name, item.slug, item.description, item.category]
    .filter(Boolean)
    .some((value) => normalizeComparableText(value).includes(search));
};

export const categoryMatches = (item: AdminCommunitiesListItemDTO, category: string | null) => {
  if (!category) return true;

  return normalizeComparableText(item.category) === normalizeComparableText(category);
};

export const buildCommunityCategoryFilters = (items: AdminCommunitiesListItemDTO[]) => {
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

export const sortCommunityListItems = (
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

export const mapRule = (rule: AdminCommunityRuleRecord): AdminCommunityRuleDTO => ({
  active: rule.active,
  created_at: rule.createdAt,
  description: rule.description,
  id: rule.id,
  position: rule.position,
  title: rule.title,
  updated_at: rule.updatedAt,
});

export const communitySummary = (community: AdminCommunityRecord) => ({
  id: community.id,
  name: community.name,
  slug: community.slug,
});

export const contentIsRemoved = (
  item: AdminCommunityContentPostRecord | AdminCommunityContentReplyRecord,
) => {
  if ("status" in item) return item.deleted || item.status === "removido";

  return item.deleted || item.post.deleted || item.post.status === "removido";
};

export const contentIsBlocked = (
  item: AdminCommunityContentPostRecord | AdminCommunityContentReplyRecord,
) => {
  if ("status" in item) return !item.deleted && item.status === "bloqueado";

  return !item.deleted && !item.post.deleted && item.post.status === "bloqueado";
};
