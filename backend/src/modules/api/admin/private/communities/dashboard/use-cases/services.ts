import type { Resolve } from "@/helpers/return";
import { error, msg } from "@/helpers/translate";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunitiesDashboardActivitySeries,
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardGlobalStatistics,
  AdminCommunitiesDashboardMetric,
  AdminCommunitiesDashboardModerationAlert,
  AdminCommunitiesDashboardPeriod,
  AdminCommunitiesDashboardPopularPost,
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
  ModerationEventRecord,
  PendingReportRecord,
  PostReplyRecord,
  PostViewCountRecord,
} from "../repositories/interfaces/IAdminCommunitiesDashboardRepository";

const DEFAULT_PERIOD_DAYS = 7;
const MAX_PERIOD_DAYS = 3660;
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

const startOfWeek = (date: Date) => {
  const next = startOfDate(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);

  return next;
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const startOfYear = (date: Date) => new Date(date.getFullYear(), 0, 1);

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

const resolvePeriod = (
  query: AdminCommunitiesDashboardQuery,
  allPeriodStartDate?: Date | null,
): PeriodResult => {
  const hasCustomFrom = Boolean(query.from);
  const hasCustomTo = Boolean(query.to);
  const preset = query.period || (hasCustomFrom || hasCustomTo ? "custom" : null);

  let start: Date;
  let end: Date;
  let label = "Últimos 7 dias";

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
    label = "Período personalizado";
  } else if (preset === "today") {
    const today = new Date();
    start = startOfDate(today);
    end = endOfDate(today);
    label = "Hoje";
  } else if (preset === "week") {
    const today = new Date();
    start = startOfWeek(today);
    end = endOfDate(today);
    label = "Esta semana";
  } else if (preset === "month") {
    const today = new Date();
    start = startOfMonth(today);
    end = endOfDate(today);
    label = "Este mês";
  } else if (preset === "year") {
    const today = new Date();
    start = startOfYear(today);
    end = endOfDate(today);
    label = "Este ano";
  } else if (preset === "all") {
    const today = new Date();
    start = startOfDate(allPeriodStartDate ?? addDays(today, -(DEFAULT_PERIOD_DAYS - 1)));
    end = endOfDate(today);
    label = "Todo o período";
  } else if (preset) {
    return { success: false, code: "invalid_analytics_date_range" };
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

type DashboardStatisticsRole = "paciente" | "psicologo";
type DashboardStatisticsUser = {
  active?: boolean | null;
  deleted?: boolean | null;
  id?: string | null;
  psychologist_profile?: Parameters<typeof isVerifiedProfessionalEntitlement>[0] | null;
  role?: string | null;
};
type DashboardStatisticsActivity = {
  date: Date;
  role: DashboardStatisticsRole;
  userId: string;
};
type DashboardGlobalStatisticsDataset = Awaited<
  ReturnType<AdminCommunitiesDashboardRepository["listGlobalStatisticsDataset"]>
>;

const dashboardStatisticsRole = (
  user?: DashboardStatisticsUser | null,
): DashboardStatisticsRole | null => {
  if (!user || user.deleted || user.active === false) return null;
  if (user.role === "paciente" || user.role === "psicologo") return user.role;

  return null;
};

const isVerifiedDashboardStatisticsPsychologist = (user?: DashboardStatisticsUser | null) =>
  user?.role === "psicologo" && isVerifiedProfessionalEntitlement(user.psychologist_profile);

const isInDashboardStatisticsPeriod = (date: Date, period: AdminCommunitiesDashboardDateRange) =>
  date >= period.start && date <= period.end;

const dashboardStatisticsRoleCounters = (items: Array<{ role: DashboardStatisticsRole }>) => {
  const patients = items.filter((item) => item.role === "paciente").length;
  const psychologists = items.filter((item) => item.role === "psicologo").length;

  return {
    patients,
    psychologists,
    total: patients + psychologists,
  };
};

const dashboardStatisticsSplit = (
  source: string,
  items: Array<{ id: string; label: string; value: number }>,
): AdminCommunitiesDashboardGlobalStatistics["charts"]["followers_split"] =>
  items.map((item) => ({ ...item, source }));

const emptyDashboardStatisticsDailyPoint = (
  date: string,
): AdminCommunitiesDashboardGlobalStatistics["charts"]["daily"][number] => ({
  active_patients: 0,
  active_psychologists: 0,
  active_users: 0,
  anonymous_posts: 0,
  date,
  downvotes: 0,
  followers_patients: 0,
  followers_psychologists: 0,
  profile_accesses: 0,
  new_active_patients: 0,
  new_active_psychologists: 0,
  new_active_users: 0,
  patient_comments: 0,
  patient_posts: 0,
  posts: 0,
  psychologist_posts: 0,
  replies: 0,
  reports: 0,
  saves: 0,
  unverified_psychologist_replies: 0,
  upvotes: 0,
  verified_psychologist_replies: 0,
  whatsapp_clicks: 0,
});

const dashboardStatisticsDailyRoleSet = (
  map: Map<
    string,
    {
      patients: Set<string>;
      psychologists: Set<string>;
    }
  >,
  key: string,
) => {
  const existing = map.get(key);
  if (existing) return existing;
  const next = {
    patients: new Set<string>(),
    psychologists: new Set<string>(),
  };
  map.set(key, next);

  return next;
};

const dashboardStatisticsDateKeyEnd = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);

  return endOfDate(new Date(year, month - 1, day));
};

const dashboardStatisticsDateLabels = (period: AdminCommunitiesDashboardDateRange) =>
  buildLabels(period.start, daysBetweenInclusive(period.start, period.end));

const dashboardStatisticsPeriod = (
  range: AdminCommunitiesDashboardDateRange,
  label: string,
): AdminCommunitiesDashboardGlobalStatistics["period"] => ({
  days: daysBetweenInclusive(range.start, range.end),
  from: toDateKey(range.start),
  label,
  max_days: MAX_PERIOD_DAYS,
  timezone: "server-local",
  to: toDateKey(range.end),
});

const buildDashboardGlobalStatistics = (
  dataset: DashboardGlobalStatisticsDataset,
  period: AdminCommunitiesDashboardDateRange,
  label: string,
): AdminCommunitiesDashboardGlobalStatistics => {
  const periodPosts = dataset.posts.filter((post) =>
    isInDashboardStatisticsPeriod(post.createdAt, period),
  );
  const periodReplies = dataset.replies.filter((reply) =>
    isInDashboardStatisticsPeriod(reply.createdAt, period),
  );
  const periodReports = dataset.reports.filter((report) =>
    isInDashboardStatisticsPeriod(report.createdAt, period),
  );
  const periodPostVotes = dataset.postVotes.filter((vote) =>
    isInDashboardStatisticsPeriod(vote.createdAt, period),
  );
  const periodReplyVotes = dataset.replyVotes.filter((vote) =>
    isInDashboardStatisticsPeriod(vote.createdAt, period),
  );
  const periodPostSaves = dataset.postSaves.filter((save) =>
    isInDashboardStatisticsPeriod(save.createdAt, period),
  );
  const periodReplySaves = dataset.replySaves.filter((save) =>
    isInDashboardStatisticsPeriod(save.createdAt, period),
  );
  const periodWhatsappClicks = dataset.contentWhatsappClicks.filter((event) =>
    isInDashboardStatisticsPeriod(event.occurred_at, period),
  );
  const periodProfileAccesses = dataset.profileAccesses.filter((event) =>
    isInDashboardStatisticsPeriod(event.occurred_at, period),
  );
  const followerByUser = new Map<string, { date: Date; role: DashboardStatisticsRole }>();

  for (const member of dataset.members) {
    const role = dashboardStatisticsRole(member.user);
    if (!role) continue;
    const current = followerByUser.get(member.user_id);
    if (!current || member.createdAt < current.date) {
      followerByUser.set(member.user_id, { date: member.createdAt, role });
    }
  }

  const followerItems = [...followerByUser.values()];
  const followers = dashboardStatisticsRoleCounters(followerItems);
  const patientPosts = periodPosts.filter(
    (post) => dashboardStatisticsRole(post.author) === "paciente",
  );
  const psychologistPosts = periodPosts.filter(
    (post) => dashboardStatisticsRole(post.author) === "psicologo",
  );
  const verifiedPsychologistPostCount = psychologistPosts.filter((post) =>
    isVerifiedDashboardStatisticsPsychologist(post.author),
  ).length;
  const anonymousPostCount = periodPosts.filter((post) => post.anonymous).length;
  const patientComments = periodReplies.filter(
    (reply) => dashboardStatisticsRole(reply.author) === "paciente",
  );
  const psychologistReplies = periodReplies.filter(
    (reply) => dashboardStatisticsRole(reply.author) === "psicologo",
  );
  const verifiedPsychologistReplyCount = psychologistReplies.filter((reply) =>
    isVerifiedDashboardStatisticsPsychologist(reply.author),
  ).length;
  const periodVotes = [...periodPostVotes, ...periodReplyVotes];
  const upvoteCount = periodVotes.filter((vote) => vote.value === 1).length;
  const downvoteCount = periodVotes.filter((vote) => vote.value === -1).length;
  const savesCount = periodPostSaves.length + periodReplySaves.length;
  const patientPostsAnsweredByVerifiedPsychologists = patientPosts.filter((post) =>
    post.replies.some(
      (reply) =>
        reply.createdAt <= period.end && isVerifiedDashboardStatisticsPsychologist(reply.author),
    ),
  ).length;
  const activityItems: DashboardStatisticsActivity[] = [];

  for (const member of dataset.members) {
    const role = dashboardStatisticsRole(member.user);
    if (role) activityItems.push({ date: member.createdAt, role, userId: member.user_id });
  }
  for (const post of dataset.posts) {
    const role = dashboardStatisticsRole(post.author);
    if (role) activityItems.push({ date: post.createdAt, role, userId: post.author_id });
  }
  for (const reply of dataset.replies) {
    const role = dashboardStatisticsRole(reply.author);
    if (role) activityItems.push({ date: reply.createdAt, role, userId: reply.author_id });
  }
  for (const pageView of dataset.pageViews) {
    const role = dashboardStatisticsRole(pageView.user);
    if (role && pageView.user_id) {
      activityItems.push({ date: pageView.occurred_at, role, userId: pageView.user_id });
    }
  }

  const activeByUser = new Map<string, { role: DashboardStatisticsRole }>();
  const firstActivityByUser = new Map<
    string,
    { date: Date; role: DashboardStatisticsRole; userId: string }
  >();
  const daily = new Map(
    dashboardStatisticsDateLabels(period).map((day) => [
      day,
      emptyDashboardStatisticsDailyPoint(day),
    ]),
  );
  const dailyActiveUsers = new Map<
    string,
    {
      patients: Set<string>;
      psychologists: Set<string>;
    }
  >();
  const dailyNewUsers = new Map<
    string,
    {
      patients: Set<string>;
      psychologists: Set<string>;
    }
  >();

  for (const activity of activityItems) {
    const currentFirst = firstActivityByUser.get(activity.userId);
    if (!currentFirst || activity.date < currentFirst.date) {
      firstActivityByUser.set(activity.userId, activity);
    }
    if (!isInDashboardStatisticsPeriod(activity.date, period)) continue;
    activeByUser.set(activity.userId, { role: activity.role });
    const key = toDateKey(activity.date);
    const roleSet = dashboardStatisticsDailyRoleSet(dailyActiveUsers, key);
    if (activity.role === "paciente") {
      roleSet.patients.add(activity.userId);
    } else {
      roleSet.psychologists.add(activity.userId);
    }
  }

  const newActiveUsers = [...firstActivityByUser.values()].filter((item) =>
    isInDashboardStatisticsPeriod(item.date, period),
  );
  for (const item of newActiveUsers) {
    const key = toDateKey(item.date);
    const roleSet = dashboardStatisticsDailyRoleSet(dailyNewUsers, key);
    if (item.role === "paciente") {
      roleSet.patients.add(item.userId);
    } else {
      roleSet.psychologists.add(item.userId);
    }
  }

  for (const [key, point] of daily) {
    const dayEnd = dashboardStatisticsDateKeyEnd(key);
    point.followers_patients = followerItems.filter(
      (item) => item.role === "paciente" && item.date <= dayEnd,
    ).length;
    point.followers_psychologists = followerItems.filter(
      (item) => item.role === "psicologo" && item.date <= dayEnd,
    ).length;
  }

  for (const post of periodPosts) {
    const point = daily.get(toDateKey(post.createdAt));
    if (point) {
      point.posts += 1;
      if (dashboardStatisticsRole(post.author) === "paciente") {
        point.patient_posts += 1;
      } else if (dashboardStatisticsRole(post.author) === "psicologo") {
        point.psychologist_posts += 1;
      }
      if (post.anonymous) point.anonymous_posts += 1;
    }
  }
  for (const reply of periodReplies) {
    const point = daily.get(toDateKey(reply.createdAt));
    if (point) {
      point.replies += 1;
      if (dashboardStatisticsRole(reply.author) === "paciente") {
        point.patient_comments += 1;
      } else if (isVerifiedDashboardStatisticsPsychologist(reply.author)) {
        point.verified_psychologist_replies += 1;
      } else if (dashboardStatisticsRole(reply.author) === "psicologo") {
        point.unverified_psychologist_replies += 1;
      }
    }
  }
  for (const report of periodReports) {
    const point = daily.get(toDateKey(report.createdAt));
    if (point) point.reports += 1;
  }
  for (const vote of periodVotes) {
    const point = daily.get(toDateKey(vote.createdAt));
    if (point && vote.value === 1) point.upvotes += 1;
    if (point && vote.value === -1) point.downvotes += 1;
  }
  for (const save of [...periodPostSaves, ...periodReplySaves]) {
    const point = daily.get(toDateKey(save.createdAt));
    if (point) point.saves += 1;
  }
  for (const event of periodWhatsappClicks) {
    const point = daily.get(toDateKey(event.occurred_at));
    if (point) point.whatsapp_clicks += 1;
  }
  for (const event of periodProfileAccesses) {
    const point = daily.get(toDateKey(event.occurred_at));
    if (point) point.profile_accesses += 1;
  }
  for (const [key, users] of dailyActiveUsers) {
    const point = daily.get(key);
    if (point) {
      point.active_patients = users.patients.size;
      point.active_psychologists = users.psychologists.size;
      point.active_users = users.patients.size + users.psychologists.size;
    }
  }
  for (const [key, users] of dailyNewUsers) {
    const point = daily.get(key);
    if (point) {
      point.new_active_patients = users.patients.size;
      point.new_active_psychologists = users.psychologists.size;
      point.new_active_users = users.patients.size + users.psychologists.size;
    }
  }

  const activeUsers = dashboardStatisticsRoleCounters([...activeByUser.values()]);
  const newActiveUserCounters = dashboardStatisticsRoleCounters(newActiveUsers);

  return {
    charts: {
      active_users_split: dashboardStatisticsSplit(
        "community_member+community_post+post_reply+page_view_event",
        [
          { id: "patients", label: "Pacientes", value: activeUsers.patients },
          { id: "psychologists", label: "Psicólogos", value: activeUsers.psychologists },
        ],
      ),
      daily: [...daily.values()],
      followers_split: dashboardStatisticsSplit("community_member", [
        { id: "patients", label: "Pacientes", value: followers.patients },
        { id: "psychologists", label: "Psicólogos", value: followers.psychologists },
      ]),
      posts_by_author: dashboardStatisticsSplit("community_post+post_reply", [
        { id: "patients", label: "Pacientes", value: patientPosts.length },
        {
          id: "verified_psychologists",
          label: "Psicólogos verificados",
          value: verifiedPsychologistPostCount,
        },
        {
          id: "unverified_psychologists",
          label: "Psicólogos não verificados",
          value: psychologistPosts.length - verifiedPsychologistPostCount,
        },
        {
          id: "patient_posts_answered_by_verified_psychologists",
          label: "Posts de pacientes respondidos por verificados",
          value: patientPostsAnsweredByVerifiedPsychologists,
        },
      ]),
      replies_by_author: dashboardStatisticsSplit("post_reply", [
        {
          id: "verified_psychologists",
          label: "Psicólogos verificados",
          value: verifiedPsychologistReplyCount,
        },
        {
          id: "unverified_psychologists",
          label: "Psicólogos não verificados",
          value: psychologistReplies.length - verifiedPsychologistReplyCount,
        },
        {
          id: "patient_comments",
          label: "Comentários de pacientes",
          value: patientComments.length,
        },
      ]),
    },
    counters: {
      active_users: {
        ...activeUsers,
        source: "community_member+community_post+post_reply+page_view_event",
      },
      anonymous_posts: {
        source: "community_post.anonymous",
        total: anonymousPostCount,
      },
      content_engagement: {
        downvotes: downvoteCount,
        profile_accesses: periodProfileAccesses.length,
        saves: savesCount,
        source: "post_vote+post_save+post_reply_save+important_action_event+page_view_event",
        upvotes: upvoteCount,
        whatsapp_clicks: periodWhatsappClicks.length,
      },
      followers: {
        ...followers,
        source: "community_member",
      },
      new_active_users: {
        ...newActiveUserCounters,
        source: "first_activity:community_member+community_post+post_reply+page_view_event",
      },
      posts: {
        patients: patientPosts.length,
        patient_posts_answered_by_verified_psychologists:
          patientPostsAnsweredByVerifiedPsychologists,
        psychologists: psychologistPosts.length,
        source: "community_post+post_reply",
        total: periodPosts.length,
        unverified_psychologists: psychologistPosts.length - verifiedPsychologistPostCount,
        verified_psychologists: verifiedPsychologistPostCount,
      },
      replies: {
        patient_comments: patientComments.length,
        source: "post_reply",
        total: periodReplies.length,
        unverified_psychologists: psychologistReplies.length - verifiedPsychologistReplyCount,
        verified_psychologists: verifiedPsychologistReplyCount,
      },
      reports: {
        source: "post_report",
        total: periodReports.length,
      },
    },
    period: dashboardStatisticsPeriod(period, label),
    source:
      "community_member+community_post+post_reply+post_report+post_vote+post_save+post_reply_save+page_view_event+important_action_event",
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

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const buildModerationAlerts = (
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

const postAuthorName = (post: CommunityPostRecord) => {
  if (post.anonymous && roleIsPatient(post.author.role)) return "Paciente anônimo";
  if (!roleIsPsychologist(post.author.role)) return post.author.name;

  return buildProfessionalFullDisplayName({
    fallbackName: post.author.name,
    firstName: post.author.psychologist_profile?.professional_first_name,
    lastName: post.author.psychologist_profile?.professional_last_name,
  });
};

const postAuthorGender = (post: CommunityPostRecord) =>
  roleIsPsychologist(post.author.role) ? (post.author.psychologist_profile?.gender ?? null) : null;

const mapPostAuthor = (post: CommunityPostRecord) => {
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

const groupPostViewCounts = (items: PostViewCountRecord[]) => {
  const countByPost = new Map<string, number>();

  for (const item of items) {
    if (!item.target_id) continue;
    if (item.target_type !== "community_post" && item.target_type !== "post") continue;

    countByPost.set(item.target_id, (countByPost.get(item.target_id) ?? 0) + item._count._all);
  }

  return countByPost;
};

const buildRecentPosts = (
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

const postEngagementScore = (post: CommunityPostRecord) =>
  post.upvotes_count + post.replies_count + post.saves_count;

const buildPopularPosts = (
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
        avatar_url: community.avatar_url,
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
    allTimeReplies,
    previousReplies,
    members,
    allTimeMemberActivity,
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
    repository.listPostReplies(),
    repository.listPostReplies(previous),
    repository.listCommunityMembers(),
    repository.listMemberActivity(),
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
    top_communities: buildTopCommunities(
      communities,
      members,
      allTimePosts,
      allTimeReplies,
      allTimeMemberActivity,
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

export default async (data: IAdminCommunitiesDashboardDTO): Promise<Resolve> => {
  return buildCommunitiesDashboard(data.q ?? {});
};
