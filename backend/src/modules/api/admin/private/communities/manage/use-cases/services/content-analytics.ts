import { addDays, toDateKey as dateKey, startOfDate as startOfDay } from "@/utils/date-range";
import type {
  AdminCommunityContentAnalyticsDetailDTO,
  AdminCommunityContentItemDTO,
  AdminCommunityReportItemDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import type {
  AdminCommunityContentVideoWatchRecord,
  AdminCommunityManageRepository,
  AdminCommunityRecord,
  AdminCommunityReportRecord,
} from "../../repositories/AdminCommunityManageRepository";
import { excerpt, groupContentTargetCountMap, groupCountMap, roundPercent } from "./community-list";
import {
  type ContentMetricsMaps,
  contentAuthorName,
  contentAuthorRoleLabel,
  contentKindLabels,
  contentMedia,
  isContentAuthorVerified,
} from "./content";

import {
  reportContentKindFor,
  reporterRoleLabel,
  reportPostMedia,
  reportPublicUrl,
  reportReasonLabel,
  reportStatusGroup,
  reportStatusLabel,
} from "./report-groups";

export const buildContentMetricsMaps = async (
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

export type ContentDetailSeriesPoint = AdminCommunityContentAnalyticsDetailDTO["series"][number];

export type ContentVideoDropoff = NonNullable<
  AdminCommunityContentAnalyticsDetailDTO["video"]
>["retention_dropoff"];

export const buildEmptyContentDetailSeries = (range: { end: Date; start: Date }) => {
  const points: ContentDetailSeriesPoint[] = [];
  let cursor = startOfDay(range.start);
  const end = startOfDay(range.end);

  while (cursor <= end) {
    points.push({
      comments: 0,
      date: dateKey(cursor),
      downvotes: 0,
      reports: 0,
      saves: 0,
      shares: 0,
      upvotes: 0,
      views: 0,
      whatsapp_clicks: 0,
    });
    cursor = addDays(cursor, 1);
  }

  return points;
};

export const incrementContentDetailSeries = (
  pointByDate: Map<string, ContentDetailSeriesPoint>,
  date: Date,
  key: Exclude<keyof ContentDetailSeriesPoint, "date">,
  amount = 1,
) => {
  const point = pointByDate.get(dateKey(date));
  if (!point) return;

  point[key] += amount;
};

export const isDateInRange = (date: Date, range: { end: Date; start: Date }) =>
  date >= range.start && date <= range.end;

export const replyDescendantIds = (
  rootReplyId: string,
  replies: Array<{ id: string; parent_reply_id: string | null }>,
) => {
  const childrenByParent = new Map<string, string[]>();
  for (const reply of replies) {
    if (!reply.parent_reply_id) continue;
    const children = childrenByParent.get(reply.parent_reply_id) ?? [];
    children.push(reply.id);
    childrenByParent.set(reply.parent_reply_id, children);
  }

  const ids = new Set<string>();
  const stack = [rootReplyId];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || ids.has(current)) continue;
    ids.add(current);
    for (const child of childrenByParent.get(current) ?? []) stack.push(child);
  }

  ids.delete(rootReplyId);

  return ids;
};

export const normalizeRetentionBuckets = (
  value: AdminCommunityContentVideoWatchRecord["retention_buckets"],
) =>
  Array.isArray(value)
    ? value.filter(
        (bucket): bucket is number =>
          typeof bucket === "number" && Number.isFinite(bucket) && bucket >= 0 && bucket <= 100,
      )
    : [];

export const sessionReachedRetention = (
  session: AdminCommunityContentVideoWatchRecord,
  threshold: number,
) => {
  if (threshold <= 0) return true;
  const buckets = normalizeRetentionBuckets(session.retention_buckets);
  if (buckets.some((bucket) => bucket >= threshold)) return true;
  if (threshold <= 25 && session.milestone_25) return true;
  if (threshold <= 50 && session.milestone_50) return true;
  if (threshold <= 75 && session.milestone_75) return true;
  if (threshold <= 100 && (session.milestone_100 || session.completed)) return true;

  if (session.duration_seconds > 0) {
    return (session.max_position_seconds / session.duration_seconds) * 100 >= threshold;
  }

  return false;
};

export const buildContentVideoAnalytics = (
  hasVideo: boolean,
  sessions: AdminCommunityContentVideoWatchRecord[],
): AdminCommunityContentAnalyticsDetailDTO["video"] => {
  if (!hasVideo) return null;

  const playsCount = sessions.length;
  const completedCount = sessions.filter(
    (session) => session.completed || session.milestone_100,
  ).length;
  const replayCount = sessions.reduce((total, session) => total + session.replay_count, 0);
  const durationSeconds =
    sessions.reduce((max, session) => Math.max(max, session.duration_seconds), 0) || null;
  const totalWatchedSeconds = sessions.reduce(
    (total, session) => total + session.watched_seconds,
    0,
  );
  const watchedSessions = sessions.filter((session) => session.watched_seconds > 0);
  const averageWatchedSeconds =
    watchedSessions.length > 0
      ? Math.round(
          watchedSessions.reduce((total, session) => total + session.watched_seconds, 0) /
            watchedSessions.length,
        )
      : null;
  const retentionEligibleSessions = sessions.filter((session) => session.duration_seconds > 0);
  const averageRetentionPercent =
    retentionEligibleSessions.length > 0
      ? roundPercent(
          retentionEligibleSessions.reduce((total, session) => {
            const watchedPercent =
              (Math.min(session.watched_seconds, session.duration_seconds) /
                session.duration_seconds) *
              100;

            return total + Math.min(100, watchedPercent);
          }, 0) / retentionEligibleSessions.length,
        )
      : null;
  const available = playsCount > 0 && retentionEligibleSessions.length > 0;
  const retention = available
    ? Array.from({ length: 21 }, (_, index) => index * 5).map((positionPercent) => {
        const reached = sessions.filter((session) =>
          sessionReachedRetention(session, positionPercent),
        ).length;

        return {
          label: `${positionPercent}%`,
          percentage: roundPercent((reached / playsCount) * 100),
          position_percent: positionPercent,
        };
      })
    : [];
  const retentionDropoff = retention.reduce<ContentVideoDropoff>((drop, point, index) => {
    if (index === 0) return drop;
    const previous = retention[index - 1];
    if (!previous) return drop;
    const rateDrop = roundPercent(Math.max(0, previous.percentage - point.percentage));
    if (!drop || rateDrop > drop.rate_drop) {
      return {
        from_label: previous.label,
        rate_drop: rateDrop,
        to_label: point.label,
      };
    }

    return drop;
  }, null);

  return {
    available,
    metrics: {
      average_retention_percent: averageRetentionPercent,
      average_watched_seconds: averageWatchedSeconds,
      completed_count: completedCount,
      completion_rate: playsCount > 0 ? roundPercent((completedCount / playsCount) * 100) : 0,
      duration_seconds: durationSeconds,
      plays_count: playsCount,
      replay_count: replayCount,
      replay_rate_percent: playsCount > 0 ? roundPercent((replayCount / playsCount) * 100) : 0,
      total_watched_seconds: totalWatchedSeconds,
    },
    retention,
    retention_dropoff: available ? retentionDropoff : null,
    source: "content_video_watch_session",
    unavailable_reason: available
      ? null
      : "Retenção indisponível - a coleta começa a partir dos próximos acessos ao vídeo.",
  };
};

export const buildContentDetailSeries = (
  dataset: Awaited<ReturnType<AdminCommunityManageRepository["listContentDetailDataset"]>>,
  range: { end: Date; start: Date },
  targetType: "post" | "reply",
  targetId: string,
) => {
  const series = buildEmptyContentDetailSeries(range);
  const pointByDate = new Map(series.map((point) => [point.date, point]));
  const descendantIds =
    targetType === "reply" ? replyDescendantIds(targetId, dataset.comments) : null;
  const comments =
    targetType === "reply"
      ? dataset.comments.filter(
          (comment) => descendantIds?.has(comment.id) && isDateInRange(comment.createdAt, range),
        )
      : dataset.comments;

  for (const event of dataset.pageViews) {
    incrementContentDetailSeries(pointByDate, event.occurred_at, "views");
  }
  for (const vote of dataset.votes) {
    incrementContentDetailSeries(
      pointByDate,
      vote.createdAt,
      vote.value === 1 ? "upvotes" : "downvotes",
    );
  }
  for (const comment of comments) {
    incrementContentDetailSeries(pointByDate, comment.createdAt, "comments");
  }
  for (const save of dataset.saves) {
    incrementContentDetailSeries(pointByDate, save.createdAt, "saves");
  }
  for (const share of dataset.shares) {
    incrementContentDetailSeries(pointByDate, share.createdAt, "shares");
  }
  for (const click of dataset.whatsappClicks) {
    incrementContentDetailSeries(pointByDate, click.occurred_at, "whatsapp_clicks");
  }
  for (const report of dataset.reports) {
    incrementContentDetailSeries(pointByDate, report.createdAt, "reports");
  }

  return { comments, series };
};

export const buildContentCommentBreakdown = (
  comments: ReturnType<typeof buildContentDetailSeries>["comments"],
): AdminCommunityContentAnalyticsDetailDTO["metrics"]["comment_breakdown"] => {
  const psychologistReplies = comments.filter((comment) => comment.author.role === "psicologo");
  const verifiedPsychologistReplies = psychologistReplies.filter((comment) =>
    isContentAuthorVerified(comment.author),
  ).length;

  return {
    patient_comments_count: comments.filter((comment) => comment.author.role !== "psicologo")
      .length,
    source: "post_reply",
    total_count: comments.length,
    unverified_psychologist_replies_count: psychologistReplies.length - verifiedPsychologistReplies,
    verified_psychologist_replies_count: verifiedPsychologistReplies,
  };
};

export const contentSafeBefore = (item: AdminCommunityContentItemDTO) => ({
  author_anonymous: item.author.anonymous,
  author_role: item.author.role,
  content_id: item.content_id,
  content_type: item.type,
  excerpt: item.excerpt,
  post_id: item.post_id,
  reports_count: item.metrics.reports_count,
  title: item.title,
});

export const mapReport = (
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
      can_review_resolution: statusGroup !== "pending",
      can_resolve_dismissed: statusGroup === "pending",
      can_resolve_upheld: statusGroup === "pending",
    },
    content: {
      author: author
        ? {
            avatar: author.avatar,
            id: author.id,
            name: contentAuthorName(author),
            role: author.role,
            role_label: contentAuthorRoleLabel(author),
          }
        : null,
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

export const reportMatchesSearch = (item: AdminCommunityReportItemDTO, search: string) => {
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
