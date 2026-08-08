import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminCommunityContentAnalyticsDetailDTO,
  AdminCommunityContentDTO,
  AdminCommunityRankingDTO,
  AdminCommunityRankingItemDTO,
  AdminCommunityRemoveContentDTO,
  IAdminCommunityContentDetailDTO,
  IAdminCommunityContentDTO,
  IAdminCommunityRankingDTO,
  IAdminCommunityRemoveContentDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import {
  type AdminCommunityContentPostRecord,
  type AdminCommunityContentReplyRecord,
  AdminCommunityManageRepository,
  adminCommunityMentorFormula,
  adminCommunityMentorScoreBreakdown,
} from "../../repositories/AdminCommunityManageRepository";
import {
  buildRankingPeriod,
  mentorDisplayName,
  rankMembers,
  verifiedMentor,
} from "./activity-ranking";
import {
  communitySummary,
  excerpt,
  normalizeLimit,
  normalizePage,
  normalizeSearch,
  paginate,
  REMOVE_CONTENT_CONFIRMATION,
} from "./community-list";
import {
  contentAuthorRoleLabel,
  contentMatchesPeriod,
  contentMatchesSearch,
  contentMatchesType,
  mapPostContent,
  mapReplyContent,
  normalizeCommunityContentSort,
  resolveContentDetailPeriod,
  resolveContentPeriod,
  sortCommunityContentItems,
} from "./content";

import {
  buildContentCommentBreakdown,
  buildContentDetailSeries,
  buildContentMetricsMaps,
  buildContentVideoAnalytics,
  contentSafeBefore,
  mapReport,
} from "./content-analytics";
import { findCommunityOrNotFound, notFound } from "./detail-summary";

export const listContent = async (data: IAdminCommunityContentDTO): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const queryType = data.q.type ?? "all";
  const queryPeriod = resolveContentPeriod(data.q);
  if (!queryPeriod.success) return { status: 400, ...error(queryPeriod.code, {}) };

  const queryStatus = data.q.status ?? "all";
  const querySort = normalizeCommunityContentSort(data.q.sort);
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
    .filter((item) => contentMatchesSearch(item, search));
  const sortedItems = sortCommunityContentItems(items, querySort);
  const result = paginate(sortedItems, page, limit);
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

export const showContentDetail = async (
  data: IAdminCommunityContentDetailDTO,
): Promise<Resolve> => {
  const repository = new AdminCommunityManageRepository();
  const community = await findCommunityOrNotFound(repository, data.p.id);
  if (!community) return notFound();

  const targetType = data.p.targetType === "reply" ? "comment" : data.p.targetType;
  if (targetType !== "post" && targetType !== "comment") {
    return {
      status: 400,
      ...error("admin_community_content_target_invalid", {}),
    };
  }

  const targetId = data.p.targetId ?? "";
  const canonicalTargetType = targetType === "post" ? "post" : "reply";
  const contentRecord =
    canonicalTargetType === "post"
      ? await repository.findPostContent(community.id, targetId)
      : await repository.findReplyContent(community.id, targetId);

  if (!contentRecord) {
    return {
      status: 404,
      ...error("admin_community_content_target_invalid", {}),
    };
  }

  const item =
    canonicalTargetType === "post"
      ? mapPostContent(
          community,
          contentRecord as AdminCommunityContentPostRecord,
          await buildContentMetricsMaps(repository, [contentRecord.id], []),
        )
      : mapReplyContent(
          community,
          contentRecord as AdminCommunityContentReplyRecord,
          await buildContentMetricsMaps(repository, [], [contentRecord.id]),
        );
  const contentCreatedAt = contentRecord.createdAt;
  const period = resolveContentDetailPeriod(data.q ?? {}, contentCreatedAt);
  if (!period.success) return { status: 400, ...error(period.code, {}) };

  const dataset = await repository.listContentDetailDataset({
    communityId: community.id,
    from: period.range.start,
    postId: item.post_id,
    targetId: item.content_id,
    targetType: canonicalTargetType,
    to: period.range.end,
  });
  const { comments, series } = buildContentDetailSeries(
    dataset,
    period.range,
    canonicalTargetType,
    item.content_id,
  );
  const reports = dataset.reports.map((report) => mapReport(community, report));
  const moderationEvents = dataset.moderationEvents.map((event) => ({
    categories: event.categories,
    content_excerpt: event.content_excerpt,
    created_at: event.createdAt,
    decision: event.decision,
    id: event.id,
    reason_code: event.reason_code,
    reviewed_at: event.reviewed_at,
    severity: event.severity,
    status: event.status,
  }));
  const sourceRecord = contentRecord as
    | AdminCommunityContentPostRecord
    | AdminCommunityContentReplyRecord;
  const hasVideo = item.media?.media_type.toLowerCase() === "video";
  const payload: AdminCommunityContentAnalyticsDetailDTO = {
    author: {
      ...item.author,
      role_label: contentAuthorRoleLabel(sourceRecord.author),
    },
    community: communitySummary(community),
    content: {
      body: excerpt(sourceRecord.content, 4000),
      content_kind: item.content_kind,
      content_kind_label: item.content_kind_label,
      created_at: item.created_at,
      deleted_at: item.deleted_at,
      edited_at: sourceRecord.edited_at,
      excerpt: item.excerpt,
      id: item.content_id,
      media: item.media
        ? {
            cover_url: null,
            duration_seconds: null,
            media_type: item.media.media_type,
            media_url: item.media.media_url,
          }
        : null,
      origin_preview: item.origin_preview,
      parent_post_title: item.parent_post_title,
      post_id: item.post_id,
      public_url: item.status === "published" ? item.public_url : null,
      status: item.status,
      title: item.title,
      type: item.type,
    },
    metrics: {
      comment_breakdown: buildContentCommentBreakdown(comments),
      comments_count: comments.length,
      downvotes_count: dataset.votes.filter((vote) => vote.value === -1).length,
      moderation_events_count: moderationEvents.length,
      reports_count: reports.length,
      saves_count: dataset.saves.length,
      shares_count: dataset.shares.length,
      upvotes_count: dataset.votes.filter((vote) => vote.value === 1).length,
      views_count: dataset.pageViews.length,
      whatsapp_clicks_count: dataset.whatsappClicks.length,
    },
    moderation: {
      events: moderationEvents,
      reports,
    },
    period: period.period,
    series,
    source:
      "community_post+post_reply+post_vote+post_save+post_reply_save+post_share+page_view_event+important_action_event+post_report+content_moderation_event+content_video_watch_session",
    video: buildContentVideoAnalytics(hasVideo, dataset.videoWatchSessions),
  };

  return {
    status: 200,
    ...msg("show", {}),
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
    if (item.status !== "published") {
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
  if (item.status !== "published") {
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
          profile_url: `/psicologos/${item.member.user.id}`,
          rating_avg: Number(profile?.rating_avg ?? 0),
          rating_count: Number(profile?.rating_count ?? 0),
          verified: verifiedMentor(item.member),
        },
        metrics: {
          ...item.metrics,
          participation_events: item.metrics.posts_published + item.metrics.reply_coverage_count,
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
