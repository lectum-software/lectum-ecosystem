import {
  addDays,
  toDateKey as dateKey,
  endOfDate as endOfDay,
  startOfDate as startOfDay,
} from "@/utils/date-range";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import type {
  AdminCommunityPerformancePointDTO,
  AdminCommunityStatisticsDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import type { AdminCommunityManageRepository } from "../../repositories/AdminCommunityManageRepository";

import { resolvePeriod } from "./activity-ranking";

import { DETAIL_PERIOD_DAYS } from "./community-list";

import type { StatisticsPeriodRange } from "./content";

export const buildPoints = (
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

export type CommunityStatisticsRole = "paciente" | "psicologo";

export type CommunityStatisticsUser = {
  active?: boolean | null;
  deleted?: boolean | null;
  id?: string | null;
  psychologist_profile?: Parameters<typeof isVerifiedProfessionalEntitlement>[0] | null;
  role?: string | null;
};

export type CommunityStatisticsActivity = {
  date: Date;
  role: CommunityStatisticsRole;
  userId: string;
};

export type StatisticsDataset = Awaited<
  ReturnType<AdminCommunityManageRepository["listStatisticsDataset"]>
>;

export const statisticsRole = (
  user?: CommunityStatisticsUser | null,
): CommunityStatisticsRole | null => {
  if (!user || user.deleted || user.active === false) return null;
  if (user.role === "paciente" || user.role === "psicologo") return user.role;

  return null;
};

export const isVerifiedStatisticsPsychologist = (user?: CommunityStatisticsUser | null) =>
  user?.role === "psicologo" && isVerifiedProfessionalEntitlement(user.psychologist_profile);

export const isInStatisticsPeriod = (date: Date, period: StatisticsPeriodRange) =>
  date >= period.start && date <= period.end;

export const statisticsRoleCounters = (items: Array<{ role: CommunityStatisticsRole }>) => {
  const patients = items.filter((item) => item.role === "paciente").length;
  const psychologists = items.filter((item) => item.role === "psicologo").length;

  return {
    patients,
    psychologists,
    total: patients + psychologists,
  };
};

export const statisticsSplit = (
  source: string,
  items: Array<{ id: string; label: string; value: number }>,
): AdminCommunityStatisticsDTO["charts"]["followers_split"] =>
  items.map((item) => ({ ...item, source }));

export const emptyStatisticsDailyPoint = (
  date: string,
): AdminCommunityStatisticsDTO["charts"]["daily"][number] => ({
  accesses: 0,
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

export const emptyStatisticsHourlyActivityPoint = (
  hour: number,
): AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number] => ({
  accesses: 0,
  engagement: 0,
  hour,
  label: `${String(hour).padStart(2, "0")}:00`,
  posts: 0,
  replies: 0,
  reports: 0,
  total: 0,
});

export const statisticsWeekdayLabels = [
  "Dom",
  "Seg",
  "Ter",
  "Qua",
  "Qui",
  "Sex",
  "S\u00e1b",
] as const;

export const createStatisticsHourlyActivityMap = () =>
  new Map(
    Array.from({ length: 24 }, (_, hour) => [hour, emptyStatisticsHourlyActivityPoint(hour)]),
  );

export const incrementStatisticsHourlyActivity = (
  hourly: Map<number, AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number]>,
  date: Date,
  field: Exclude<
    keyof AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number],
    "hour" | "label" | "total"
  >,
) => {
  const point = hourly.get(date.getHours());
  if (!point) return;

  point[field] += 1;
  point.total += 1;
};

export const incrementStatisticsHourlyActivityCollections = (
  hourly: Map<number, AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number]>,
  hourlyByWeekday: Map<
    number,
    {
      hours: Map<number, AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number]>;
      label: string;
    }
  >,
  date: Date,
  field: Exclude<
    keyof AdminCommunityStatisticsDTO["charts"]["hourly_activity"][number],
    "hour" | "label" | "total"
  >,
) => {
  incrementStatisticsHourlyActivity(hourly, date, field);
  const weekday = hourlyByWeekday.get(date.getDay());
  if (weekday) incrementStatisticsHourlyActivity(weekday.hours, date, field);
};

export const statisticsDailyRoleSet = (
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

export const statisticsDateKeyEnd = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);

  return endOfDay(new Date(year, month - 1, day));
};

export const statisticsDateLabels = (period: StatisticsPeriodRange) => {
  const labels: string[] = [];
  const cursor = startOfDay(period.start);

  while (cursor <= period.end) {
    labels.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return labels;
};
