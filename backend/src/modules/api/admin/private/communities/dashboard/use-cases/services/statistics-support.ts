import {
  buildDateLabels as buildLabels,
  daysBetweenInclusive,
  endOfDate,
  toDateKey,
} from "@/utils/date-range";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardGlobalStatistics,
} from "../../DTOs/IAdminCommunitiesDashboardDTO";
import type { AdminCommunitiesDashboardRepository } from "../../repositories/AdminCommunitiesDashboardRepository";
import type { CommunityRecord } from "../../repositories/interfaces/IAdminCommunitiesDashboardRepository";

import { MAX_PERIOD_DAYS } from "./period-content";

export type DashboardStatisticsRole = "paciente" | "psicologo";

export type DashboardStatisticsUser = {
  active?: boolean | null;
  deleted?: boolean | null;
  id?: string | null;
  psychologist_profile?: Parameters<typeof isVerifiedProfessionalEntitlement>[0] | null;
  role?: string | null;
};

export type DashboardStatisticsActivity = {
  date: Date;
  role: DashboardStatisticsRole;
  userId: string;
};

export type DashboardGlobalStatisticsDataset = Awaited<
  ReturnType<AdminCommunitiesDashboardRepository["listGlobalStatisticsDataset"]>
>;

export type DashboardTopCommunityActivity = {
  accesses_count: number;
  activity_count: number;
  engagement_count: number;
  posts_count: number;
  replies_count: number;
  reports_count: number;
};

export const dashboardStatisticsRole = (
  user?: DashboardStatisticsUser | null,
): DashboardStatisticsRole | null => {
  if (!user || user.deleted || user.active === false) return null;
  if (user.role === "paciente" || user.role === "psicologo") return user.role;

  return null;
};

export const isVerifiedDashboardStatisticsPsychologist = (user?: DashboardStatisticsUser | null) =>
  user?.role === "psicologo" && isVerifiedProfessionalEntitlement(user.psychologist_profile);

export const isInDashboardStatisticsPeriod = (
  date: Date,
  period: AdminCommunitiesDashboardDateRange,
) => date >= period.start && date <= period.end;

export const dashboardStatisticsRoleCounters = (
  items: Array<{ role: DashboardStatisticsRole }>,
) => {
  const patients = items.filter((item) => item.role === "paciente").length;
  const psychologists = items.filter((item) => item.role === "psicologo").length;

  return {
    patients,
    psychologists,
    total: patients + psychologists,
  };
};

export const dashboardStatisticsSplit = (
  source: string,
  items: Array<{ id: string; label: string; value: number }>,
): AdminCommunitiesDashboardGlobalStatistics["charts"]["followers_split"] =>
  items.map((item) => ({ ...item, source }));

export const emptyDashboardStatisticsDailyPoint = (
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

export const emptyDashboardStatisticsHourlyActivityPoint = (
  hour: number,
): AdminCommunitiesDashboardGlobalStatistics["charts"]["hourly_activity"][number] => ({
  accesses: 0,
  engagement: 0,
  hour,
  label: `${String(hour).padStart(2, "0")}:00`,
  posts: 0,
  replies: 0,
  reports: 0,
  total: 0,
});

export const createDashboardHourlyActivityMap = () =>
  new Map(
    Array.from({ length: 24 }, (_, hour) => [
      hour,
      emptyDashboardStatisticsHourlyActivityPoint(hour),
    ]),
  );

export const incrementDashboardHourlyActivity = (
  hourly: Map<
    number,
    AdminCommunitiesDashboardGlobalStatistics["charts"]["hourly_activity"][number]
  >,
  date: Date,
  field: Exclude<
    keyof AdminCommunitiesDashboardGlobalStatistics["charts"]["hourly_activity"][number],
    "hour" | "label" | "total"
  >,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

export const emptyTopCommunityActivity = (): DashboardTopCommunityActivity => ({
  accesses_count: 0,
  activity_count: 0,
  engagement_count: 0,
  posts_count: 0,
  replies_count: 0,
  reports_count: 0,
});

export const createTopCommunityActivityMap = (communities: CommunityRecord[]) =>
  new Map(communities.map((community) => [community.id, emptyTopCommunityActivity()]));

export const incrementTopCommunityActivity = (
  map: Map<string, DashboardTopCommunityActivity>,
  communityId: string | null | undefined,
  field: Exclude<keyof DashboardTopCommunityActivity, "activity_count">,
) => {
  if (!communityId) return;
  const point = map.get(communityId);
  if (!point) return;

  point[field] += 1;
  point.activity_count += 1;
};

export const dashboardTargetCommunityId = (
  targetType: string | null | undefined,
  targetId: string | null | undefined,
  targets: {
    communityIdByTarget: ReadonlyMap<string, string>;
    postCommunityIdByTarget: ReadonlyMap<string, string>;
    replyCommunityIdByTarget: ReadonlyMap<string, string>;
  },
) => {
  if (!targetType || !targetId) return null;
  if (targetType === "community") return targets.communityIdByTarget.get(targetId) ?? null;
  if (targetType === "community_post" || targetType === "post") {
    return targets.postCommunityIdByTarget.get(targetId) ?? null;
  }
  if (targetType === "post_reply" || targetType === "reply") {
    return targets.replyCommunityIdByTarget.get(targetId) ?? null;
  }

  return null;
};

export const buildTopCommunityActivityByPeriod = (
  communities: CommunityRecord[],
  dataset: DashboardGlobalStatisticsDataset,
  period: AdminCommunitiesDashboardDateRange,
) => {
  const activity = createTopCommunityActivityMap(communities);
  const communityIdByTarget = new Map<string, string>();
  for (const community of communities) {
    communityIdByTarget.set(community.id, community.id);
    communityIdByTarget.set(community.slug, community.id);
  }

  const postCommunityIdByTarget = new Map(
    dataset.posts.map((post) => [post.id, post.community_id]),
  );
  const replyCommunityIdByTarget = new Map(
    dataset.replies.map((reply) => [reply.id, reply.post.community_id]),
  );
  const targets = {
    communityIdByTarget,
    postCommunityIdByTarget,
    replyCommunityIdByTarget,
  };
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
  const periodPageViews = dataset.pageViews.filter((event) =>
    isInDashboardStatisticsPeriod(event.occurred_at, period),
  );

  for (const post of periodPosts) {
    incrementTopCommunityActivity(activity, post.community_id, "posts_count");
  }
  for (const reply of periodReplies) {
    incrementTopCommunityActivity(activity, reply.post.community_id, "replies_count");
  }
  for (const report of periodReports) {
    incrementTopCommunityActivity(
      activity,
      report.reply?.post.community_id ?? report.post.community_id,
      "reports_count",
    );
  }
  for (const vote of periodPostVotes) {
    incrementTopCommunityActivity(
      activity,
      vote.post_id ? postCommunityIdByTarget.get(vote.post_id) : null,
      "engagement_count",
    );
  }
  for (const vote of periodReplyVotes) {
    incrementTopCommunityActivity(
      activity,
      vote.reply_id ? replyCommunityIdByTarget.get(vote.reply_id) : null,
      "engagement_count",
    );
  }
  for (const save of periodPostSaves) {
    incrementTopCommunityActivity(
      activity,
      postCommunityIdByTarget.get(save.post_id),
      "engagement_count",
    );
  }
  for (const save of periodReplySaves) {
    incrementTopCommunityActivity(
      activity,
      replyCommunityIdByTarget.get(save.reply_id),
      "engagement_count",
    );
  }
  for (const event of periodWhatsappClicks) {
    incrementTopCommunityActivity(
      activity,
      dashboardTargetCommunityId(event.target_type, event.target_id, targets),
      "engagement_count",
    );
  }
  for (const event of periodPageViews) {
    incrementTopCommunityActivity(
      activity,
      dashboardTargetCommunityId(event.target_type, event.target_id, targets),
      "accesses_count",
    );
  }

  return activity;
};

export const dashboardStatisticsDailyRoleSet = (
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

export const dashboardStatisticsDateKeyEnd = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);

  return endOfDate(new Date(year, month - 1, day));
};

export const dashboardStatisticsDateLabels = (period: AdminCommunitiesDashboardDateRange) =>
  buildLabels(period.start, daysBetweenInclusive(period.start, period.end));

export const dashboardStatisticsPeriod = (
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
