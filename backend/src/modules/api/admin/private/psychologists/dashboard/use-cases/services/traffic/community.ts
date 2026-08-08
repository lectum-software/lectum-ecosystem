import type {
  AdminPsychologistWhatsappTrafficOriginSourceId,
  AdminPsychologistWhatsappTrafficPlatformMetric,
} from "@/utils/admin-psychologist-analytics";
import type { AdminPsychologistCommunityTrafficPlatformDataset } from "../../../repositories/interfaces/IAdminPsychologistsDashboardRepository";
import type { CommunityTrafficPlatformMetricSourceId } from "../plan/segments";

type CommunityTrafficPlatformMetricTotals = {
  comments: number;
  contentCount: number;
  downvotes: number;
  profileAccesses: number;
  retentionSamples: number;
  retentionTotalPercent: number;
  saves: number;
  shares: number;
  upvotes: number;
  visibilitySeconds: number;
  views: number;
};

const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS: CommunityTrafficPlatformMetricSourceId[] = [
  "community_post_video",
  "community_post_text",
  "community_reply_video",
  "community_reply_text",
];

const COMMUNITY_TRAFFIC_PROFILE_ACCESS_ATTRIBUTION_WINDOW_MS = 30 * 60 * 1000;

const COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE =
  "community_post+post_reply+page_view_event+content_attention_session+content_video_watch_session+post_vote+post_save+post_reply_save+post_share";

const emptyCommunityTrafficPlatformMetricTotals = (): CommunityTrafficPlatformMetricTotals => ({
  comments: 0,
  contentCount: 0,
  downvotes: 0,
  profileAccesses: 0,
  retentionSamples: 0,
  retentionTotalPercent: 0,
  saves: 0,
  shares: 0,
  upvotes: 0,
  visibilitySeconds: 0,
  views: 0,
});

export const isCommunityTrafficVideoMedia = (record: {
  media_items?: Array<{ media_type: string | null }>;
  media_type: string | null;
}) =>
  record.media_type === "video" ||
  (record.media_items?.some((media) => media.media_type === "video") ?? false);

const isCommunityTrafficPostTargetType = (targetType: string | null) =>
  targetType === "community_post" || targetType === "post";

const isCommunityTrafficReplyTargetType = (targetType: string | null) =>
  targetType === "post_reply" || targetType === "reply";

export const roundTrafficMetricPercent = (value: number) => Math.round(value * 10) / 10;

const buildCommunityTrafficPlatformMetric = (
  metric: Omit<AdminPsychologistWhatsappTrafficPlatformMetric, "source" | "unavailable_reason"> & {
    unavailable_reason?: string | null;
  },
): AdminPsychologistWhatsappTrafficPlatformMetric => ({
  ...metric,
  source: COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE,
  unavailable_reason: metric.unavailable_reason ?? null,
});

export const buildCommunityTrafficPlatformMetrics = (
  dataset: AdminPsychologistCommunityTrafficPlatformDataset,
) => {
  const totalsBySource = new Map<
    CommunityTrafficPlatformMetricSourceId,
    CommunityTrafficPlatformMetricTotals
  >(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      emptyCommunityTrafficPlatformMetricTotals(),
    ]),
  );
  const postsById = new Map(dataset.posts.map((post) => [post.id, post]));
  const repliesById = new Map(dataset.replies.map((reply) => [reply.id, reply]));
  const postSourceById = new Map<string, CommunityTrafficPlatformMetricSourceId>();
  const replySourceById = new Map<string, CommunityTrafficPlatformMetricSourceId>();
  const sourceTotals = (sourceId: CommunityTrafficPlatformMetricSourceId) =>
    totalsBySource.get(sourceId) ?? emptyCommunityTrafficPlatformMetricTotals();

  for (const post of dataset.posts) {
    const sourceId = isCommunityTrafficVideoMedia(post)
      ? "community_post_video"
      : "community_post_text";
    postSourceById.set(post.id, sourceId);
    sourceTotals(sourceId).contentCount += 1;
  }

  for (const reply of dataset.replies) {
    const sourceId = isCommunityTrafficVideoMedia(reply)
      ? "community_reply_video"
      : "community_reply_text";
    replySourceById.set(reply.id, sourceId);
    sourceTotals(sourceId).contentCount += 1;
  }

  const sourceFromTarget = (
    targetType: string | null,
    targetId: string | null,
  ): CommunityTrafficPlatformMetricSourceId | null => {
    if (!targetId) return null;
    if (isCommunityTrafficPostTargetType(targetType)) return postSourceById.get(targetId) ?? null;
    if (isCommunityTrafficReplyTargetType(targetType)) return replySourceById.get(targetId) ?? null;

    return null;
  };

  for (const pageView of dataset.pageViews) {
    const sourceId = sourceFromTarget(pageView.target_type, pageView.target_id);
    if (!sourceId) continue;

    sourceTotals(sourceId).views += 1;
  }

  for (const session of dataset.attentionSessions) {
    const sourceId = sourceFromTarget(session.target_type, session.target_id);
    if (!sourceId) continue;

    sourceTotals(sourceId).visibilitySeconds += Math.max(0, session.attention_seconds);
  }

  const pageViewsBySession = new Map<
    string,
    AdminPsychologistCommunityTrafficPlatformDataset["pageViews"]
  >();

  for (const pageView of dataset.pageViews) {
    const sessionViews = pageViewsBySession.get(pageView.session_id) ?? [];
    sessionViews.push(pageView);
    pageViewsBySession.set(pageView.session_id, sessionViews);
  }

  for (const sessionViews of pageViewsBySession.values()) {
    const orderedViews = sessionViews.toSorted(
      (left, right) => left.occurred_at.getTime() - right.occurred_at.getTime(),
    );
    let lastContentView: {
      authorId: string;
      occurredAt: Date;
      sourceId: CommunityTrafficPlatformMetricSourceId;
    } | null = null;

    for (const pageView of orderedViews) {
      const sourceId = sourceFromTarget(pageView.target_type, pageView.target_id);

      if (sourceId && pageView.target_id) {
        const authorId = isCommunityTrafficPostTargetType(pageView.target_type)
          ? postsById.get(pageView.target_id)?.author_id
          : repliesById.get(pageView.target_id)?.author_id;

        if (authorId) {
          lastContentView = {
            authorId,
            occurredAt: pageView.occurred_at,
            sourceId,
          };
        }

        continue;
      }

      if (
        pageView.target_type !== "psychologist" ||
        !pageView.target_id ||
        !lastContentView ||
        pageView.target_id !== lastContentView.authorId
      ) {
        continue;
      }

      const elapsedMs = pageView.occurred_at.getTime() - lastContentView.occurredAt.getTime();
      if (elapsedMs < 0 || elapsedMs > COMMUNITY_TRAFFIC_PROFILE_ACCESS_ATTRIBUTION_WINDOW_MS) {
        continue;
      }

      sourceTotals(lastContentView.sourceId).profileAccesses += 1;
    }
  }

  for (const session of dataset.videoWatchSessions) {
    const sourceId = sourceFromTarget(session.target_type, session.target_id);
    if (!sourceId) continue;

    const totals = sourceTotals(sourceId);
    if (session.duration_seconds <= 0) continue;

    totals.retentionSamples += 1;
    totals.retentionTotalPercent += Math.min(
      100,
      (Math.max(0, session.watched_seconds) / session.duration_seconds) * 100,
    );
  }

  for (const vote of dataset.votes) {
    const sourceId = vote.post_id
      ? postSourceById.get(vote.post_id)
      : vote.reply_id
        ? replySourceById.get(vote.reply_id)
        : null;
    if (!sourceId) continue;

    if (vote.value === 1) sourceTotals(sourceId).upvotes += 1;
    if (vote.value === -1) sourceTotals(sourceId).downvotes += 1;
  }

  for (const comment of dataset.comments) {
    const postSourceId = postSourceById.get(comment.post_id);
    if (postSourceId) sourceTotals(postSourceId).comments += 1;

    if (!comment.parent_reply_id) continue;

    const replySourceId = replySourceById.get(comment.parent_reply_id);
    if (replySourceId) sourceTotals(replySourceId).comments += 1;
  }

  for (const save of dataset.postSaves) {
    const sourceId = postSourceById.get(save.post_id);
    if (sourceId) sourceTotals(sourceId).saves += 1;
  }

  for (const save of dataset.replySaves) {
    const sourceId = replySourceById.get(save.reply_id);
    if (sourceId) sourceTotals(sourceId).saves += 1;
  }

  for (const share of dataset.shares) {
    const sourceId = share.reply_id
      ? replySourceById.get(share.reply_id)
      : postSourceById.get(share.post_id);
    if (sourceId) sourceTotals(sourceId).shares += 1;
  }

  const averagePerContent = (total: number, contentCount: number) =>
    contentCount > 0 ? roundTrafficMetricPercent(total / contentCount) : null;
  const averageUnavailableReason = (contentCount: number) =>
    contentCount > 0
      ? null
      : "Sem conteúdo publicado nesta categoria até o fim do período selecionado.";
  const buildAverageCommunityTrafficMetric = (
    totals: CommunityTrafficPlatformMetricTotals,
    metric: {
      id: AdminPsychologistWhatsappTrafficPlatformMetric["id"];
      label: string;
      total: number;
      unit?: AdminPsychologistWhatsappTrafficPlatformMetric["unit"];
    },
  ) =>
    buildCommunityTrafficPlatformMetric({
      id: metric.id,
      label: metric.label,
      unavailable_reason: averageUnavailableReason(totals.contentCount),
      unit: metric.unit ?? "count",
      value: averagePerContent(metric.total, totals.contentCount),
    });

  const metrics = new Map<
    AdminPsychologistWhatsappTrafficOriginSourceId,
    AdminPsychologistWhatsappTrafficPlatformMetric[]
  >(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => {
      const totals = sourceTotals(sourceId);
      const isVideoSource =
        sourceId === "community_post_video" || sourceId === "community_reply_video";
      const averageRetention =
        totals.retentionSamples > 0
          ? roundTrafficMetricPercent(totals.retentionTotalPercent / totals.retentionSamples)
          : null;
      const commonMetrics: AdminPsychologistWhatsappTrafficPlatformMetric[] = [
        buildAverageCommunityTrafficMetric(totals, {
          id: "views",
          label: "Visualizações",
          total: totals.views,
        }),
        ...(isVideoSource
          ? [
              buildCommunityTrafficPlatformMetric({
                id: "average_retention",
                label: "Retenção",
                unavailable_reason:
                  averageRetention === null ? "Sem sessões de vídeo com duração no período." : null,
                unit: "percentage",
                value: averageRetention,
              }),
              buildAverageCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]
          : [
              buildAverageCommunityTrafficMetric(totals, {
                id: "average_visibility",
                label: "Tempo de permanência",
                total: totals.visibilitySeconds,
                unit: "seconds",
              }),
            ]),
        buildAverageCommunityTrafficMetric(totals, {
          id: "profile_accesses",
          label: "Acessos ao perfil",
          total: totals.profileAccesses,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "upvotes",
          label: "Upvotes",
          total: totals.upvotes,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "downvotes",
          label: "Downvotes",
          total: totals.downvotes,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "comments",
          label: "Comentários",
          total: totals.comments,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "saves",
          label: "Salvamentos",
          total: totals.saves,
        }),
        buildAverageCommunityTrafficMetric(totals, {
          id: "shares",
          label: "Compartilhamentos",
          total: totals.shares,
        }),
      ];

      return [sourceId, commonMetrics];
    }),
  );

  const consideredCounts = new Map<AdminPsychologistWhatsappTrafficOriginSourceId, number>(
    COMMUNITY_TRAFFIC_PLATFORM_METRIC_SOURCE_IDS.map((sourceId) => [
      sourceId,
      sourceTotals(sourceId).contentCount,
    ]),
  );

  return { consideredCounts, metrics };
};

export const filterCommunityTrafficPlatformMetricDataset = (
  dataset: AdminPsychologistCommunityTrafficPlatformDataset,
  allowedPsychologistIds: Set<string>,
): AdminPsychologistCommunityTrafficPlatformDataset => {
  const posts = dataset.posts.filter((post) => allowedPsychologistIds.has(post.author_id));
  const replies = dataset.replies.filter((reply) => allowedPsychologistIds.has(reply.author_id));
  const postIds = new Set(posts.map((post) => post.id));
  const replyIds = new Set(replies.map((reply) => reply.id));

  return {
    attentionSessions: dataset.attentionSessions.filter((session) =>
      isCommunityTrafficPostTargetType(session.target_type)
        ? postIds.has(session.target_id)
        : isCommunityTrafficReplyTargetType(session.target_type) && replyIds.has(session.target_id),
    ),
    comments: dataset.comments.filter(
      (comment) =>
        postIds.has(comment.post_id) ||
        Boolean(comment.parent_reply_id && replyIds.has(comment.parent_reply_id)),
    ),
    pageViews: dataset.pageViews.filter((pageView) => {
      if (!pageView.target_id) return false;
      if (isCommunityTrafficPostTargetType(pageView.target_type))
        return postIds.has(pageView.target_id);
      if (isCommunityTrafficReplyTargetType(pageView.target_type))
        return replyIds.has(pageView.target_id);

      return (
        pageView.target_type === "psychologist" && allowedPsychologistIds.has(pageView.target_id)
      );
    }),
    posts,
    postSaves: dataset.postSaves.filter((save) => postIds.has(save.post_id)),
    replies,
    replySaves: dataset.replySaves.filter((save) => replyIds.has(save.reply_id)),
    shares: dataset.shares.filter((share) =>
      share.reply_id ? replyIds.has(share.reply_id) : postIds.has(share.post_id),
    ),
    videoWatchSessions: dataset.videoWatchSessions.filter((session) =>
      isCommunityTrafficPostTargetType(session.target_type)
        ? postIds.has(session.target_id)
        : isCommunityTrafficReplyTargetType(session.target_type) && replyIds.has(session.target_id),
    ),
    votes: dataset.votes.filter((vote) =>
      vote.post_id
        ? postIds.has(vote.post_id)
        : Boolean(vote.reply_id && replyIds.has(vote.reply_id)),
    ),
  };
};
