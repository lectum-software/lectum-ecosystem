import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardModerationAlert,
  AdminCommunitiesDashboardPopularPost,
  AdminCommunitiesDashboardPriorityAlert,
  AdminCommunitiesDashboardQuery,
  AdminCommunitiesDashboardRecentPost,
  AdminCommunitiesDashboardSummary,
  AdminCommunitiesDashboardTopCommunity,
} from "../../DTOs/IAdminCommunitiesDashboardDTO";
import { AdminCommunitiesDashboardRepository } from "../../repositories/AdminCommunitiesDashboardRepository";
import type {
  CommunityMemberRecord,
  CommunityPostRecord,
  CommunityRecord,
  ModerationEventRecord,
  PendingReportRecord,
  PostViewCountRecord,
} from "../../repositories/interfaces/IAdminCommunitiesDashboardRepository";
import { buildDashboardGlobalStatistics } from "./global-statistics";
import {
  buildActivitySeries,
  buildPatientPostsBreakdown,
  distinctActiveMembers,
  metric,
  resolvePeriod,
  roleIsPatient,
  roleIsPsychologist,
  SEVERITY_WEIGHTS,
} from "./period-content";
import {
  buildTopCommunityActivityByPeriod,
  type DashboardGlobalStatisticsDataset,
  emptyTopCommunityActivity,
} from "./statistics-support";

export const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

export const normalizeSeverityText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

/**
 * Regra determinística V1 de severidade de denúncias no Admin Comunidades:
 * violência, autolesão, ódio, ameaça e abuso são alta; conteúdo inadequado,
 * desrespeito, desinformação, assédio e denúncias em comentário são média;
 * spam e demais motivos ficam como baixa. Não há coluna nova de severidade.
 */
export const deriveCommunityAlertSeverity = (
  report: Pick<PendingReportRecord, "reason" | "target_type">,
) => {
  const text = normalizeSeverityText(`${report.reason} ${report.target_type}`);

  if (
    ["odio", "violencia", "risco", "ameaca", "suic", "automutil", "abuso"].some((term) =>
      text.includes(term),
    )
  ) {
    return "alta" as const;
  }

  if (
    report.target_type === "reply" ||
    ["conteudo", "inadequ", "ofens", "desrespeito", "desinform", "assedio"].some((term) =>
      text.includes(term),
    )
  ) {
    return "media" as const;
  }

  return "baixa" as const;
};

export const mapPriorityAlert = (
  report: PendingReportRecord,
): AdminCommunitiesDashboardPriorityAlert => {
  const isReply = report.target_type === "reply" && report.reply;
  const communityName = isReply ? report.reply?.post.community.name : report.post.community.name;
  const communitySlug = isReply ? report.reply?.post.community.slug : report.post.community.slug;
  const targetTitle = isReply
    ? report.reply?.title ||
      snippet(report.reply?.content, report.reply?.post.title || "Comentário denunciado")
    : report.post.title || snippet(report.post.content, "Post denunciado");

  return {
    community_name: communityName ?? null,
    community_slug: communitySlug ?? null,
    created_at: report.createdAt,
    description: report.description,
    id: report.id,
    reason: report.reason,
    reporter_role: report.reporter.role,
    severity: deriveCommunityAlertSeverity(report),
    status: report.status,
    target_id: report.target_id,
    target_title: targetTitle,
    target_type: report.target_type,
  };
};

export const buildPriorityAlerts = (reports: PendingReportRecord[], total: number) => ({
  items: reports
    .map(mapPriorityAlert)
    .sort((left, right) => {
      const severityDiff = SEVERITY_WEIGHTS[right.severity] - SEVERITY_WEIGHTS[left.severity];
      if (severityDiff !== 0) return severityDiff;

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    })
    .slice(0, 5),
  source: "post_report.status=pendente" as const,
  total,
});

export const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

export const buildModerationAlerts = (
  events: ModerationEventRecord[],
  total: number,
  urgentTotal: number,
) => {
  const items: AdminCommunitiesDashboardModerationAlert[] = events.slice(0, 5).map((event) => ({
    categories: toStringArray(event.categories),
    community_name: event.community?.name ?? null,
    community_slug: event.community?.slug ?? null,
    content_excerpt: event.content_excerpt,
    created_at: event.createdAt,
    decision: event.decision,
    id: event.id,
    reason_code: event.reason_code,
    severity: event.severity,
    status: event.status,
    target_id: event.target_id,
    target_type: event.target_type,
  }));

  return {
    items,
    source: "content_moderation_event.status=pending|reviewing" as const,
    total,
    urgent_total: urgentTotal,
  };
};

export const postAuthorName = (post: CommunityPostRecord) => {
  if (post.anonymous && roleIsPatient(post.author.role)) return "Paciente anônimo";
  if (!roleIsPsychologist(post.author.role)) return post.author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: post.author.name,
    firstName: post.author.psychologist_profile?.professional_first_name,
    lastName: post.author.psychologist_profile?.professional_last_name,
  });
};

export const postAuthorGender = (post: CommunityPostRecord) =>
  roleIsPsychologist(post.author.role) ? (post.author.psychologist_profile?.gender ?? null) : null;

export const mapPostAuthor = (post: CommunityPostRecord) => {
  const anonymous = post.anonymous && roleIsPatient(post.author.role);

  return {
    anonymous,
    avatar: anonymous ? null : post.author.avatar,
    gender: anonymous ? null : postAuthorGender(post),
    id: anonymous ? `anonymous:${post.id}` : post.author.id,
    name: postAuthorName(post),
    role: post.author.role,
    verified:
      !anonymous &&
      roleIsPsychologist(post.author.role) &&
      isVerifiedProfessionalEntitlement(post.author.psychologist_profile),
  };
};

export const groupPostViewCounts = (items: PostViewCountRecord[]) => {
  const countByPost = new Map<string, number>();

  for (const item of items) {
    if (!item.target_id) continue;
    if (item.target_type !== "community_post" && item.target_type !== "post") continue;

    countByPost.set(item.target_id, (countByPost.get(item.target_id) ?? 0) + item._count._all);
  }

  return countByPost;
};

export const buildRecentPosts = (
  posts: CommunityPostRecord[],
  postViewsByPost: ReadonlyMap<string, number>,
) => {
  const items: AdminCommunitiesDashboardRecentPost[] = posts.slice(0, 5).map((post) => {
    const author = mapPostAuthor(post);

    return {
      anonymous: post.anonymous,
      author,
      author_name: author.name,
      author_role: author.role,
      comments_count: post.replies_count,
      community_id: post.community.id,
      community_name: post.community.name,
      community_slug: post.community.slug,
      created_at: post.createdAt,
      discussion_status: post.replies_count > 0 ? "iniciada" : "nao_iniciada",
      id: post.id,
      title: post.title,
      views_count: postViewsByPost.get(post.id) ?? 0,
    };
  });

  return {
    items,
    source: "community_post+page_view_event" as const,
    total: posts.length,
  };
};

export const postEngagementScore = (post: CommunityPostRecord) =>
  post.upvotes_count + post.replies_count + post.saves_count;

export const buildPopularPosts = (
  posts: CommunityPostRecord[],
  postViewsByPost: ReadonlyMap<string, number>,
) => {
  const items: AdminCommunitiesDashboardPopularPost[] = [...posts]
    .sort((left, right) => {
      if (right.upvotes_count !== left.upvotes_count) {
        return right.upvotes_count - left.upvotes_count;
      }
      if (right.replies_count !== left.replies_count) {
        return right.replies_count - left.replies_count;
      }
      if (right.saves_count !== left.saves_count) {
        return right.saves_count - left.saves_count;
      }

      return right.createdAt.getTime() - left.createdAt.getTime();
    })
    .slice(0, 5)
    .map((post) => {
      const author = mapPostAuthor(post);

      return {
        anonymous: post.anonymous,
        author,
        author_name: author.name,
        author_role: author.role,
        comments_count: post.replies_count,
        community_id: post.community.id,
        community_name: post.community.name,
        community_slug: post.community.slug,
        created_at: post.createdAt,
        discussion_status: post.replies_count > 0 ? "iniciada" : "nao_iniciada",
        engagement_score: postEngagementScore(post),
        id: post.id,
        saves_count: post.saves_count,
        title: post.title,
        upvotes_count: post.upvotes_count,
        views_count: postViewsByPost.get(post.id) ?? 0,
      };
    });

  return {
    items,
    source: "community_post+post_reply+post_vote+post_save+page_view_event" as const,
    total: posts.length,
  };
};

export const buildTopCommunities = (
  communities: CommunityRecord[],
  members: CommunityMemberRecord[],
  dataset: DashboardGlobalStatisticsDataset,
  period: AdminCommunitiesDashboardDateRange,
) => {
  const memberCounts = new Map<string, number>();
  for (const member of members) {
    memberCounts.set(member.community_id, (memberCounts.get(member.community_id) ?? 0) + 1);
  }
  const periodActivity = buildTopCommunityActivityByPeriod(communities, dataset, period);

  const items: AdminCommunitiesDashboardTopCommunity[] = communities
    .map((community) => {
      const membersCount = memberCounts.get(community.id) ?? community.members_count;
      const activity = periodActivity.get(community.id) ?? emptyTopCommunityActivity();

      return {
        accesses_count: activity.accesses_count,
        activity_count: activity.activity_count,
        avatar_url: community.avatar_url,
        id: community.id,
        members_count: membersCount,
        name: community.name,
        posts_count: activity.posts_count,
        slug: community.slug,
        visual_primary_color: community.visual_primary_color,
      };
    })
    .filter(
      (community) =>
        community.activity_count > 0 || community.posts_count > 0 || community.accesses_count > 0,
    )
    .sort((left, right) => {
      if (right.activity_count !== left.activity_count)
        return right.activity_count - left.activity_count;
      if (right.accesses_count !== left.accesses_count)
        return right.accesses_count - left.accesses_count;
      if (right.members_count !== left.members_count)
        return right.members_count - left.members_count;
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5);

  return {
    items,
    source:
      "community+community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event" as const,
    total: communities.length,
  };
};

export const buildCommunitiesDashboard = async (
  query: AdminCommunitiesDashboardQuery,
): Promise<Resolve> => {
  const repository = new AdminCommunitiesDashboardRepository();
  const safeQuery = query ?? {};
  const allPeriodStartDate =
    safeQuery.period === "all" ? await repository.findEarliestDashboardEventDate() : null;
  const resolvedPeriod = resolvePeriod(safeQuery, allPeriodStartDate);
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const { current, labels, period, previous } = resolvedPeriod.period;

  const [
    posts,
    allTimePosts,
    previousPosts,
    replies,
    previousReplies,
    members,
    currentMemberActivity,
    previousMemberActivity,
    pendingReportsTotal,
    previousPendingReportsTotal,
    pendingReports,
    pendingModerationEventsTotal,
    urgentModerationEventsTotal,
    pendingModerationEvents,
    communities,
    globalStatisticsDataset,
  ] = await Promise.all([
    repository.listCommunityPosts(current),
    repository.listCommunityPosts(),
    repository.listCommunityPosts(previous),
    repository.listPostReplies(current),
    repository.listPostReplies(previous),
    repository.listCommunityMembers(),
    repository.listMemberActivity(current),
    repository.listMemberActivity(previous),
    repository.countPendingReports(current),
    repository.countPendingReports(previous),
    repository.listPendingReports(current),
    repository.countPendingModerationEvents(current),
    repository.countUrgentModerationEvents(current),
    repository.listPendingModerationEvents(current),
    repository.listCommunities(),
    repository.listGlobalStatisticsDataset(current.end),
  ]);

  const postViewsByPost = groupPostViewCounts(
    await repository.countPostViews(allTimePosts.map((post) => post.id)),
  );

  const psychologistPosts = posts.filter((post) => roleIsPsychologist(post.author.role)).length;
  const previousPsychologistPosts = previousPosts.filter((post) =>
    roleIsPsychologist(post.author.role),
  ).length;
  const patientPosts = posts.filter((post) => roleIsPatient(post.author.role)).length;
  const previousPatientPosts = previousPosts.filter((post) =>
    roleIsPatient(post.author.role),
  ).length;
  const psychologistReplies = replies.filter((reply) =>
    roleIsPsychologist(reply.author.role),
  ).length;
  const previousPsychologistReplies = previousReplies.filter((reply) =>
    roleIsPsychologist(reply.author.role),
  ).length;
  const patientComments = replies.filter((reply) => roleIsPatient(reply.author.role)).length;
  const previousPatientComments = previousReplies.filter((reply) =>
    roleIsPatient(reply.author.role),
  ).length;
  const activeMembers = distinctActiveMembers(currentMemberActivity, members);
  const previousActiveMembers = distinctActiveMembers(previousMemberActivity, members);

  const summary: AdminCommunitiesDashboardSummary = {
    activity_series: buildActivitySeries(posts, replies, labels),
    cards: {
      active_members: metric({
        current: activeMembers,
        description:
          "Membros únicos com atividade no período, considerando posts, respostas, votos e salvamentos.",
        id: "active_members",
        label: "Membros ativos",
        previous: previousActiveMembers,
        source: "community_member+post/save/vote/reply",
      }),
      patient_comments: metric({
        current: patientComments,
        description: "Comentários/respostas criados por pacientes no período.",
        id: "patient_comments",
        label: "Comentários de pacientes",
        previous: previousPatientComments,
        source: "post_reply.author.role=paciente",
      }),
      patient_posts: metric({
        current: patientPosts,
        description: "Posts publicados por pacientes no período selecionado.",
        id: "patient_posts",
        label: "Postagens de pacientes",
        previous: previousPatientPosts,
        source: "community_post.author.role=paciente",
      }),
      psychologist_posts: metric({
        current: psychologistPosts,
        description: "Posts publicados por psicólogos no período selecionado.",
        id: "psychologist_posts",
        label: "Postagens de psicólogos",
        previous: previousPsychologistPosts,
        source: "community_post.author.role=psicologo",
      }),
      psychologist_replies: metric({
        current: psychologistReplies,
        description: "Respostas criadas por psicólogos em posts da comunidade.",
        id: "psychologist_replies",
        label: "Respostas de psicólogos",
        previous: previousPsychologistReplies,
        source: "post_reply.author.role=psicologo",
      }),
    },
    global_statistics: {
      current: buildDashboardGlobalStatistics(globalStatisticsDataset, current, period.label),
      previous: buildDashboardGlobalStatistics(
        globalStatisticsDataset,
        previous,
        "Período anterior",
      ),
    },
    patient_posts_breakdown: buildPatientPostsBreakdown(posts),
    period,
    priority_alerts: buildPriorityAlerts(pendingReports, pendingReportsTotal),
    moderation_alerts: buildModerationAlerts(
      pendingModerationEvents,
      pendingModerationEventsTotal,
      urgentModerationEventsTotal,
    ),
    popular_posts: buildPopularPosts(allTimePosts, postViewsByPost),
    recent_posts: buildRecentPosts(allTimePosts, postViewsByPost),
    top_communities: buildTopCommunities(communities, members, globalStatisticsDataset, current),
    unavailable: [
      ...(pendingReportsTotal === 0 && previousPendingReportsTotal === 0
        ? [
            {
              description:
                "Sem post_report pendente no período atual nem anterior; alertas aparecem vazios sem simular risco.",
              id: "priority_alerts_empty",
              label: "Alertas de prioridade",
              source: "post_report.status=pendente",
            },
          ]
        : []),
      ...(pendingModerationEventsTotal === 0
        ? [
            {
              description:
                "Sem content_moderation_event pendente no período atual; alertas automáticos aparecem vazios sem simular risco.",
              id: "moderation_alerts_empty",
              label: "Alertas automáticos de moderação",
              source: "content_moderation_event.status=pending|reviewing",
            },
          ]
        : []),
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};
