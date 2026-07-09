import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import type {
  AdminCommunitiesDashboardActivitySeries,
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardMetric,
  AdminCommunitiesDashboardPeriod,
  AdminCommunitiesDashboardPriorityAlert,
  AdminCommunitiesDashboardQuery,
  AdminCommunitiesDashboardRecentPost,
  AdminCommunitiesDashboardSeverity,
  AdminCommunitiesDashboardSummary,
  AdminCommunitiesDashboardTopCommunity,
  IAdminCommunitiesDashboardDTO,
} from "../DTOs/IAdminCommunitiesDashboardDTO";
import { AdminCommunitiesDashboardRepository } from "../repositories/AdminCommunitiesDashboardRepository";
import type {
  CommunityMemberRecord,
  CommunityPostRecord,
  CommunityRecord,
  MemberActivityRecord,
  PendingReportRecord,
  PostReplyRecord,
} from "../repositories/interfaces/IAdminCommunitiesDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 90;
const SEVERITY_WEIGHTS: Record<AdminCommunitiesDashboardSeverity, number> = {
  alta: 3,
  media: 2,
  baixa: 1,
};
const ACTIVITY_COLORS = {
  patient_comments: "#ff5b1a",
  patient_posts: "#1b7cff",
  psychologist_posts: "#f8288f",
  psychologist_replies: "#12b76a",
};

type CommunitiesPeriodResolution = {
  current: AdminCommunitiesDashboardDateRange;
  days: number;
  labels: string[];
  period: AdminCommunitiesDashboardPeriod;
  previous: AdminCommunitiesDashboardDateRange;
};

type PeriodResult =
  | {
      period: CommunitiesPeriodResolution;
      success: true;
    }
  | {
      code: string;
      success: false;
    };

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

const endOfDate = (date: Date) => {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
};

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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

  return Math.floor((end - start) / 86_400_000) + 1;
};

const buildLabels = (from: Date, days: number) =>
  Array.from({ length: days }, (_, index) => toDateKey(addDays(from, index)));

const resolvePeriod = (query: AdminCommunitiesDashboardQuery): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

  if (hasCustomFrom || hasCustomTo) {
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
  } else {
    const today = new Date();
    end = endOfDate(today);
    start = startOfDate(addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
  }

  const days = daysBetweenInclusive(start, end);
  if (days < 1 || days > MAX_PERIOD_DAYS) {
    return { success: false, code: "invalid_analytics_date_range" };
  }

  const previousEnd = endOfDate(addDays(start, -1));
  const previousStart = startOfDate(addDays(start, -days));

  return {
    success: true,
    period: {
      current: { start, end },
      days,
      labels: buildLabels(start, days),
      previous: { start: previousStart, end: previousEnd },
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
    },
  };
};

const roundPercent = (value: number) => Math.round(value * 10) / 10;

const percentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundPercent(((current - previous) / previous) * 100);
};

const metric = (params: {
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

const safePercentage = (value: number, total: number) => {
  if (total <= 0) return 0;

  return roundPercent((value / total) * 100);
};

const countByDate = (items: Array<{ createdAt: Date }>, labels: string[]) => {
  const counts = new Map(labels.map((label) => [label, 0]));

  for (const item of items) {
    const label = toDateKey(item.createdAt);
    if (counts.has(label)) counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return labels.map((date) => ({ date, value: counts.get(date) ?? 0 }));
};

const roleIsPsychologist = (role: string) => role === "psicologo";
const roleIsPatient = (role: string) => role === "paciente";

const distinctActiveMembers = (
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

const buildActivitySeries = (
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

const buildPatientPostsBreakdown = (posts: CommunityPostRecord[]) => {
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

const snippet = (text: string | null | undefined, fallback: string) => {
  const normalized = text?.replace(/\s+/g, " ").trim();
  if (!normalized) return fallback;

  return normalized.length > 80 ? `${normalized.slice(0, 77)}...` : normalized;
};

const normalizeSeverityText = (value: string) =>
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

const mapPriorityAlert = (report: PendingReportRecord): AdminCommunitiesDashboardPriorityAlert => {
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

const buildPriorityAlerts = (reports: PendingReportRecord[], total: number) => ({
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

const publicAuthorName = (post: CommunityPostRecord) => {
  if (post.anonymous && roleIsPatient(post.author.role)) return "Paciente anônimo";

  return post.author.name;
};

const buildRecentPosts = (posts: CommunityPostRecord[]) => {
  const items: AdminCommunitiesDashboardRecentPost[] = posts.slice(0, 5).map((post) => ({
    anonymous: post.anonymous,
    author_name: publicAuthorName(post),
    author_role: post.author.role,
    comments_count: post.replies_count,
    community_id: post.community.id,
    community_name: post.community.name,
    community_slug: post.community.slug,
    created_at: post.createdAt,
    discussion_status: post.replies_count > 0 ? "iniciada" : "nao_iniciada",
    id: post.id,
    title: post.title,
  }));

  return {
    items,
    source: "community_post" as const,
    total: posts.length,
  };
};

const buildTopCommunities = (
  communities: CommunityRecord[],
  members: CommunityMemberRecord[],
  posts: CommunityPostRecord[],
  replies: PostReplyRecord[],
  activities: MemberActivityRecord[],
) => {
  const memberCounts = new Map<string, number>();
  for (const member of members) {
    memberCounts.set(member.community_id, (memberCounts.get(member.community_id) ?? 0) + 1);
  }

  const postCounts = new Map<string, number>();
  for (const post of posts) {
    postCounts.set(post.community_id, (postCounts.get(post.community_id) ?? 0) + 1);
  }

  const replyCounts = new Map<string, number>();
  for (const reply of replies) {
    replyCounts.set(reply.post.community_id, (replyCounts.get(reply.post.community_id) ?? 0) + 1);
  }

  const activityCounts = new Map<string, number>();
  for (const activity of activities) {
    if (!activity.community_id) continue;
    activityCounts.set(activity.community_id, (activityCounts.get(activity.community_id) ?? 0) + 1);
  }

  const items: AdminCommunitiesDashboardTopCommunity[] = communities
    .map((community) => {
      const membersCount = memberCounts.get(community.id) ?? community.members_count;
      const postsCount = postCounts.get(community.id) ?? 0;
      const activityCount =
        postsCount + (replyCounts.get(community.id) ?? 0) + (activityCounts.get(community.id) ?? 0);

      return {
        activity_count: activityCount,
        id: community.id,
        members_count: membersCount,
        name: community.name,
        posts_count: postsCount,
        slug: community.slug,
        visual_primary_color: community.visual_primary_color,
      };
    })
    .sort((left, right) => {
      if (right.activity_count !== left.activity_count)
        return right.activity_count - left.activity_count;
      if (right.members_count !== left.members_count)
        return right.members_count - left.members_count;
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5);

  return {
    items,
    source: "community+community_member+community_post+post_reply+post_vote+post_save" as const,
    total: communities.length,
  };
};

export const buildCommunitiesDashboard = async (
  query: AdminCommunitiesDashboardQuery,
): Promise<Resolve> => {
  const resolvedPeriod = resolvePeriod(query ?? {});
  if (!resolvedPeriod.success) {
    return {
      status: 400,
      ...error(resolvedPeriod.code, {}),
    };
  }

  const repository = new AdminCommunitiesDashboardRepository();
  const { current, labels, period, previous } = resolvedPeriod.period;

  const [
    posts,
    previousPosts,
    replies,
    previousReplies,
    members,
    currentMemberActivity,
    previousMemberActivity,
    pendingReportsTotal,
    previousPendingReportsTotal,
    pendingReports,
    communities,
  ] = await Promise.all([
    repository.listCommunityPosts(current),
    repository.listCommunityPosts(previous),
    repository.listPostReplies(current),
    repository.listPostReplies(previous),
    repository.listCommunityMembers(),
    repository.listMemberActivity(current),
    repository.listMemberActivity(previous),
    repository.countPendingReports(current),
    repository.countPendingReports(previous),
    repository.listPendingReports(current),
    repository.listCommunities(),
  ]);

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
          "Membros únicos com atividade real no período, cruzando posts, respostas, votos ou salvamentos com community_member.",
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
    patient_posts_breakdown: buildPatientPostsBreakdown(posts),
    period,
    priority_alerts: buildPriorityAlerts(pendingReports, pendingReportsTotal),
    recent_posts: buildRecentPosts(posts),
    top_communities: buildTopCommunities(
      communities,
      members,
      posts,
      replies,
      currentMemberActivity,
    ),
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
    ],
  };

  return {
    status: 200,
    ...msg("index", {}),
    data: summary,
  };
};

export default async (data: IAdminCommunitiesDashboardDTO): Promise<Resolve> => {
  return buildCommunitiesDashboard(data.q ?? {});
};
