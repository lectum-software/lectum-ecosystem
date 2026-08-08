import type {
  AdminCommunitiesDashboard,
  CommunitiesDashboardGlobalStatistics,
  CommunitiesDashboardQuery,
} from "@/api/req/communities";
import { formatCountLabel } from "../components/post-actions";
import { dateFromInput } from "./period-support";
import {
  type DashboardStatisticMetricConfig,
  type DashboardStatisticMetricId,
  type DashboardStatisticMetricItem,
  MAX_COMMUNITY_DASHBOARD_DAYS,
  numberFormatter,
  percentageFormatter,
} from "./statistics-config";

export const roundDashboardStatisticPercent = (value: number) => Math.round(value * 10) / 10;

export const dashboardStatisticPercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : null;

  return roundDashboardStatisticPercent(((current - previous) / previous) * 100);
};

export const dashboardStatisticPercentage = (value: number, total: number) =>
  total <= 0 ? 0 : roundDashboardStatisticPercent((value / total) * 100);

export const dashboardStatisticValue = (
  statistics: CommunitiesDashboardGlobalStatistics,
  id: DashboardStatisticMetricId,
) => {
  switch (id) {
    case "active_patients":
      return statistics.counters.active_users.patients;
    case "active_psychologists":
      return statistics.counters.active_users.psychologists;
    case "downvotes":
      return statistics.counters.content_engagement.downvotes;
    case "followers_patients":
      return statistics.counters.followers.patients;
    case "followers_psychologists":
      return statistics.counters.followers.psychologists;
    case "new_active_patients":
      return statistics.counters.new_active_users.patients;
    case "new_active_psychologists":
      return statistics.counters.new_active_users.psychologists;
    case "patient_comments":
      return statistics.counters.replies.patient_comments;
    case "patient_posts":
      return statistics.counters.posts.patients;
    case "profile_accesses":
      return statistics.counters.content_engagement.profile_accesses;
    case "psychologist_posts":
      return statistics.counters.posts.psychologists;
    case "reports":
      return statistics.counters.reports.total;
    case "saves":
      return statistics.counters.content_engagement.saves;
    case "unverified_psychologist_replies":
      return statistics.counters.replies.unverified_psychologists;
    case "upvotes":
      return statistics.counters.content_engagement.upvotes;
    case "verified_psychologist_replies":
      return statistics.counters.replies.verified_psychologists;
    case "whatsapp_clicks":
      return statistics.counters.content_engagement.whatsapp_clicks;
  }
};

export const buildDashboardStatisticMetricItems = (
  current: CommunitiesDashboardGlobalStatistics,
  previous: CommunitiesDashboardGlobalStatistics,
  configs: DashboardStatisticMetricConfig[],
): DashboardStatisticMetricItem[] =>
  configs.map((config) => {
    const value = dashboardStatisticValue(current, config.id);
    const previousValue = dashboardStatisticValue(previous, config.id);

    return {
      ...config,
      changePercent: dashboardStatisticPercentageChange(value, previousValue),
      previousValue,
      value,
    };
  });

export const formatDashboardCareCoveragePercent = (value: number) =>
  `${percentageFormatter.format(Math.round(value * 10) / 10)}%`;

export const formatDashboardCareCoverageDuration = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";

  const minutes = Math.max(0, Math.round(Number(value) || 0));

  if (minutes < 60) return `${numberFormatter.format(minutes)} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${numberFormatter.format(hours)}h ${numberFormatter.format(remainingMinutes)}min`
      : `${numberFormatter.format(hours)}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${numberFormatter.format(days)}d ${numberFormatter.format(remainingHours)}h`
    : `${numberFormatter.format(days)}d`;
};

export const formatDashboardVerifiedResponseDetail = (responded: number, total: number) =>
  `${formatCountLabel(
    responded,
    "respondido por psicólogo verificado",
    "respondidos por psicólogos verificados",
  )} (${formatDashboardCareCoveragePercent(dashboardStatisticPercentage(responded, total))})`;

export const buildDashboardCareCoverageSnapshot = (
  statistics: CommunitiesDashboardGlobalStatistics,
) => {
  const coverage = statistics.counters.care_coverage;
  const breakdown = coverage.patient_posts_verified_response_breakdown;
  const totalPatientPosts = Math.max(0, breakdown.total.total);
  const respondedByVerified = Math.min(
    totalPatientPosts,
    Math.max(0, breakdown.total.responded_by_verified_psychologists),
  );
  const awaitingCoverage = Math.min(
    totalPatientPosts,
    Math.max(0, coverage.patient_posts_awaiting_verified_psychologist_response),
  );
  const anonymousPosts = Math.min(totalPatientPosts, Math.max(0, breakdown.anonymous.total));
  const identifiedPosts = Math.min(totalPatientPosts, Math.max(0, breakdown.identified.total));
  const anonymousRespondedByVerified = Math.min(
    anonymousPosts,
    Math.max(0, breakdown.anonymous.responded_by_verified_psychologists),
  );
  const identifiedRespondedByVerified = Math.min(
    identifiedPosts,
    Math.max(0, breakdown.identified.responded_by_verified_psychologists),
  );

  return {
    anonymousPosts,
    anonymousRate: dashboardStatisticPercentage(anonymousPosts, totalPatientPosts),
    anonymousRespondedByVerified,
    awaitingCoverage,
    awaitingRate: dashboardStatisticPercentage(awaitingCoverage, totalPatientPosts),
    coverageRate: dashboardStatisticPercentage(respondedByVerified, totalPatientPosts),
    identifiedPosts,
    identifiedRate: dashboardStatisticPercentage(identifiedPosts, totalPatientPosts),
    identifiedRespondedByVerified,
    responseAverageMinutes: coverage.average_first_verified_response_minutes,
    respondedByVerified,
    totalPatientPosts,
  };
};

export const totalDashboardStatisticValue = (statistics: CommunitiesDashboardGlobalStatistics) =>
  statistics.charts.daily.reduce(
    (total, point) =>
      total +
      point.active_patients +
      point.active_psychologists +
      point.anonymous_posts +
      point.downvotes +
      point.followers_patients +
      point.followers_psychologists +
      point.new_active_patients +
      point.new_active_psychologists +
      point.patient_comments +
      point.patient_posts +
      point.profile_accesses +
      point.psychologist_posts +
      point.reports +
      point.saves +
      point.unverified_psychologist_replies +
      point.upvotes +
      point.verified_psychologist_replies +
      point.whatsapp_clicks,
    0,
  );

export const isValidCustomRange = (range: CommunitiesDashboardQuery) => {
  if (!range.from || !range.to) return false;

  const from = dateFromInput(range.from);
  const to = dateFromInput(range.to);
  const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;

  return from <= to && days <= MAX_COMMUNITY_DASHBOARD_DAYS;
};

export const hasPeriodRecords = (summary: AdminCommunitiesDashboard) => {
  const hasCards = Object.values(summary.cards).some((card) => card.value > 0);
  const hasActivity = summary.activity_series.some((series) =>
    series.points.some((point) => point.value > 0),
  );
  const hasHourlyActivity = summary.global_statistics.current.charts.hourly_activity.some(
    (point) => point.total > 0,
  );

  return (
    hasCards ||
    hasActivity ||
    hasHourlyActivity ||
    totalDashboardStatisticValue(summary.global_statistics.current) > 0 ||
    summary.patient_posts_breakdown.total > 0 ||
    summary.recent_posts.total > 0 ||
    summary.popular_posts.total > 0 ||
    summary.top_communities.items.length > 0
  );
};
