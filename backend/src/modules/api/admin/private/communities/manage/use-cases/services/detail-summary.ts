import { error } from "@/helpers/translate";
import { toDateKey as dateKey } from "@/utils/date-range";
import type {
  AdminCommunityHighlightCountersDTO,
  AdminCommunityReportItemDTO,
  AdminCommunityTodaySummaryDTO,
  AdminCommunityUrgentPendingReportDTO,
  AdminCommunityUrgentSummaryDTO,
} from "../../DTOs/IAdminCommunityManageDTO";
import type {
  AdminCommunityManageRepository,
  AdminCommunityRecord,
  AdminCommunityReportRecord,
} from "../../repositories/AdminCommunityManageRepository";
import type { StatisticsPeriodRange } from "./content";
import { mapReport } from "./content-analytics";

import { buildCommunityStatistics } from "./statistics";
import {
  isInStatisticsPeriod,
  type StatisticsDataset,
  statisticsRole,
  statisticsRoleCounters,
} from "./statistics-support";

export const buildCommunityTodaySummary = (
  dataset: StatisticsDataset,
  period: StatisticsPeriodRange,
): AdminCommunityTodaySummaryDTO => {
  const statistics = buildCommunityStatistics(dataset, period);
  const newFollowers = statisticsRoleCounters(
    dataset.members.flatMap((member) => {
      if (!isInStatisticsPeriod(member.createdAt, period)) return [];

      const role = statisticsRole(member.user);

      return role ? [{ role }] : [];
    }),
  );

  return {
    new_active_patients_count: statistics.counters.new_active_users.patients,
    new_active_psychologists_count: statistics.counters.new_active_users.psychologists,
    new_patient_followers_count: newFollowers.patients,
    new_psychologist_followers_count: newFollowers.psychologists,
    patient_comments_count: statistics.counters.replies.patient_comments,
    patient_posts_count: statistics.counters.posts.patients,
    period: {
      date: dateKey(period.start),
      from: dateKey(period.start),
      label: "Hoje",
      timezone: "server-local",
      to: dateKey(period.end),
    },
    psychologist_posts_count: statistics.counters.posts.psychologists,
    source: "community_member+community_post+post_reply+page_view_event",
    unverified_psychologist_replies_count: statistics.counters.replies.unverified_psychologists,
    verified_psychologist_replies_count: statistics.counters.replies.verified_psychologists,
  };
};

export const buildCommunityHighlightCounters = (
  dataset: StatisticsDataset,
): AdminCommunityHighlightCountersDTO => ({
  accesses_count: dataset.pageViews.length,
  patient_comments_count: dataset.replies.filter(
    (reply) => statisticsRole(reply.author) === "paciente",
  ).length,
  patient_posts_count: dataset.posts.filter((post) => statisticsRole(post.author) === "paciente")
    .length,
  psychologist_posts_count: dataset.posts.filter(
    (post) => statisticsRole(post.author) === "psicologo",
  ).length,
  psychologist_replies_count: dataset.replies.filter(
    (reply) => statisticsRole(reply.author) === "psicologo",
  ).length,
  reports_count: dataset.reports.length,
  source: "community_post+post_reply+post_report+page_view_event",
});

export const latestReportDate = (items: AdminCommunityReportItemDTO[]) =>
  items.reduce<Date | null>(
    (latest, item) => (!latest || item.last_reported_at > latest ? item.last_reported_at : latest),
    null,
  );

export const mapUrgentPendingReport = (
  item: AdminCommunityReportItemDTO,
): AdminCommunityUrgentPendingReportDTO => {
  const reporter = item.reporters[0];

  return {
    content: {
      author: item.content.author
        ? {
            name: item.content.author.name,
            role_label: item.content.author.role_label,
          }
        : null,
      available: item.content.available,
      content_kind_label: item.content.content_kind_label,
      excerpt: item.content.excerpt,
      id: item.content.id,
      title: item.content.title,
      type: item.content.type,
      unavailable_reason: item.content.unavailable_reason,
    },
    created_at: item.created_at,
    id: item.id,
    reason_label: item.reason_label,
    reporter: {
      label: reporter?.reporter.label ?? item.reported_by.label,
      name: reporter?.reporter.name ?? "Usuário não informado",
      role: reporter?.reporter.role ?? item.reported_by.role,
    },
    status_label: item.status_label,
  };
};

export const buildCommunityUrgentSummary = (
  community: AdminCommunityRecord,
  reports: AdminCommunityReportRecord[],
): AdminCommunityUrgentSummaryDTO => {
  const pendingReports = reports
    .map((report) => mapReport(community, report))
    .filter((item) => item.status_group === "pending")
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());

  return {
    pending_reports_count: pendingReports.length,
    pending_reports_last_reported_at: latestReportDate(pendingReports),
    pending_reports: pendingReports.map(mapUrgentPendingReport),
    source: "post_report",
  };
};

export const buildMentors = (
  replies: Awaited<ReturnType<AdminCommunityManageRepository["listTopMentors"]>>,
) => {
  const mentors = new Map<
    string,
    {
      avatar: string | null;
      crp: string | null;
      id: string;
      name: string;
      rating_avg: number;
      replies_count: number;
      upvotes_count: number;
      verified: boolean;
    }
  >();

  for (const reply of replies) {
    const profile = reply.author.psychologist_profile;
    const current = mentors.get(reply.author.id) ?? {
      avatar: reply.author.avatar,
      crp: profile?.crp ?? null,
      id: reply.author.id,
      name: reply.author.name,
      rating_avg: Number(profile?.rating_avg ?? 0),
      replies_count: 0,
      upvotes_count: 0,
      verified: Boolean(
        profile?.crp_status === "aprovado" ||
          profile?.cfp_verified_at ||
          profile?.subscriptions.length,
      ),
    };

    current.replies_count += 1;
    current.upvotes_count += reply.upvotes_count;
    mentors.set(reply.author.id, current);
  }

  return Array.from(mentors.values())
    .map((mentor) => ({
      ...mentor,
      score: mentor.replies_count * 10 + mentor.upvotes_count * 5,
    }))
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.name.localeCompare(right.name, "pt-BR");
    })
    .slice(0, 5)
    .map((mentor, index) => ({ ...mentor, position: index + 1 }));
};

export { publicFileUrl } from "@/utils/public-origin";

export const findCommunityOrNotFound = async (
  repository: AdminCommunityManageRepository,
  idOrSlug: string,
) => {
  const community = await repository.findCommunity(idOrSlug);

  if (!community) return null;

  return community;
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "community" }),
});
