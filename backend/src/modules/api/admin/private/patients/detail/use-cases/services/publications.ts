import type {
  AdminPatientDetailHeatmapCell,
  AdminPatientDetailPublicationItem,
  AdminPatientDetailPublicationMetric,
} from "../../DTOs/IAdminPatientDetailDTO";
import type {
  AdminPatientDetailRepository,
  AdminPatientEngagementBundle,
} from "../../repositories/AdminPatientDetailRepository";
import { HEATMAP_DAYS, HEATMAP_HOURS, pad, TIMEZONE, WEEKDAY_INDEX } from "./intent";
import { postUrl, snippet } from "./metrics-series";

export const publicationMetric = (params: {
  id: AdminPatientDetailPublicationMetric["id"];
  label: string;
  source: string;
  value: number;
}): AdminPatientDetailPublicationMetric => ({
  available: true,
  id: params.id,
  label: params.label,
  source: params.source,
  unit: "count",
  unavailable_reason: null,
  value: params.value,
});

export const groupCountByNullableString = <T extends { _count: { _all: number } }>(
  items: T[],
  getKey: (item: T) => string | null,
) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;

    counts.set(key, (counts.get(key) ?? 0) + item._count._all);
  }

  return counts;
};

export const countByPostId = <T>(items: T[], getPostId: (item: T) => string | null | undefined) => {
  const counts = new Map<string, number>();

  for (const item of items) {
    const postId = getPostId(item);
    if (!postId) continue;

    counts.set(postId, (counts.get(postId) ?? 0) + 1);
  }

  return counts;
};

export const buildPublications = (
  bundle: AdminPatientEngagementBundle,
  postViews: Awaited<ReturnType<AdminPatientDetailRepository["countPostViews"]>>,
): AdminPatientDetailPublicationItem[] => {
  const commentsByPost = countByPostId(bundle.responsesReceived, (reply) => reply.post.id);
  const savesByPost = countByPostId(bundle.postSavesReceived, (save) => save.post.id);
  const sharesByPost = countByPostId(bundle.sharesReceived, (share) =>
    share.reply ? null : share.post.id,
  );
  const viewsByPost = groupCountByNullableString(postViews, (item) => item.target_id);

  return bundle.posts
    .map((post) => ({
      admin_statistics_url: `/comunidades/${post.community.slug}/conteudo/post/${post.id}`,
      community: {
        avatar_url: post.community.avatar_url,
        color: post.community.visual_primary_color,
        id: post.community.id,
        name: post.community.name,
        slug: post.community.slug,
      },
      content: post.content,
      created_at: post.createdAt,
      excerpt: snippet(post.content, "Sem descrição textual."),
      id: post.id,
      metrics: {
        comments: publicationMetric({
          id: "comments",
          label: "Comentários",
          source: "post_reply.post_id",
          value: commentsByPost.get(post.id) ?? post.replies_count,
        }),
        downvotes: publicationMetric({
          id: "downvotes",
          label: "Downvotes",
          source: "community_post.downvotes_count/post_vote",
          value: post.downvotes_count,
        }),
        reports: publicationMetric({
          id: "reports",
          label: "Denúncias",
          source: "post_report.post_id",
          value: post.reports.length,
        }),
        saves: publicationMetric({
          id: "saves",
          label: "Salvamentos",
          source: "post_save.post_id",
          value: savesByPost.get(post.id) ?? post.saves_count,
        }),
        shares: publicationMetric({
          id: "shares",
          label: "Compartilhamentos",
          source: "post_share.post_id",
          value: sharesByPost.get(post.id) ?? 0,
        }),
        upvotes: publicationMetric({
          id: "upvotes",
          label: "Upvotes",
          source: "community_post.upvotes_count/post_vote",
          value: post.upvotes_count,
        }),
        views: publicationMetric({
          id: "views",
          label: "Visualizações",
          source: "page_view_event.target_type=post/community_post",
          value: viewsByPost.get(post.id) ?? 0,
        }),
      },
      public_url: postUrl(post),
      source: "community_post" as const,
      title: post.title,
      type: "post" as const,
      type_label: "Post" as const,
    }))
    .sort(
      (left, right) =>
        right.created_at.getTime() - left.created_at.getTime() || left.id.localeCompare(right.id),
    );
};

export const heatmapParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
    weekday: "short",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Mon";
  const rawHour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const hour = rawHour === 24 ? 0 : rawHour;

  return {
    dayIndex: WEEKDAY_INDEX[weekday] ?? 0,
    hourBucket: Math.floor(hour / 4) * 4,
  };
};

export const buildHeatmap = (bundle: AdminPatientEngagementBundle) => {
  const eventDates = [
    ...bundle.posts.map((item) => item.createdAt),
    ...bundle.replies.map((item) => item.createdAt),
    ...bundle.votesMade.map((item) => item.createdAt),
    ...bundle.postSaves.map((item) => item.createdAt),
    ...bundle.replySaves.map((item) => item.createdAt),
  ];
  const counts = new Map<string, number>();

  for (const date of eventDates) {
    const { dayIndex, hourBucket } = heatmapParts(date);
    const key = `${dayIndex}:${hourBucket}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: AdminPatientDetailHeatmapCell[] = [];
  for (let dayIndex = 0; dayIndex < HEATMAP_DAYS.length; dayIndex += 1) {
    for (const hour of HEATMAP_HOURS) {
      const count = counts.get(`${dayIndex}:${hour}`) ?? 0;
      cells.push({
        count,
        day: HEATMAP_DAYS[dayIndex].label,
        day_index: dayIndex,
        hour,
        hour_label: `${pad(hour)}h`,
      });
    }
  }

  const max = Math.max(0, ...cells.map((cell) => cell.count));

  return {
    available: eventDates.length > 0,
    cells,
    max_count: max,
    source: "community_post+post_reply+post_vote+post_save+post_reply_save" as const,
    timezone: TIMEZONE,
    total_events: eventDates.length,
    unavailable_reason:
      eventDates.length === 0
        ? "Sem eventos suficientes de posts, comentários, votos ou salvamentos no período."
        : null,
  };
};
