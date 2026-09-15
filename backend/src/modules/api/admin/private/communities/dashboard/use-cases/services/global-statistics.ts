import { toDateKey } from "@/utils/date-range";
import type {
  AdminCommunitiesDashboardDateRange,
  AdminCommunitiesDashboardGlobalStatistics,
} from "../../DTOs/IAdminCommunitiesDashboardDTO";
import {
  buildPostContentFormatDistribution,
  buildReplyContentFormatDistribution,
} from "./period-content";
import {
  createDashboardHourlyActivityMap,
  type DashboardGlobalStatisticsDataset,
  type DashboardStatisticsActivity,
  type DashboardStatisticsRole,
  dashboardStatisticsDailyRoleSet,
  dashboardStatisticsDateKeyEnd,
  dashboardStatisticsDateLabels,
  dashboardStatisticsPeriod,
  dashboardStatisticsRole,
  dashboardStatisticsRoleCounters,
  dashboardStatisticsSplit,
  emptyDashboardStatisticsDailyPoint,
  incrementDashboardHourlyActivity,
  isInDashboardStatisticsPeriod,
  isVerifiedDashboardStatisticsPsychologist,
} from "./statistics-support";

export const buildDashboardGlobalStatistics = (
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
  const periodPageViews = dataset.pageViews.filter((event) =>
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
  const patientPostsWithVerifiedResponse = patientPosts.flatMap((post) => {
    const firstVerifiedReply = post.replies
      .filter(
        (reply) =>
          reply.createdAt <= period.end && isVerifiedDashboardStatisticsPsychologist(reply.author),
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0];

    if (!firstVerifiedReply) return [];

    return [
      {
        minutes: Math.max(
          0,
          Math.round((firstVerifiedReply.createdAt.getTime() - post.createdAt.getTime()) / 60_000),
        ),
        post,
      },
    ];
  });
  const patientPostsAnsweredByVerifiedPsychologists = patientPostsWithVerifiedResponse.length;
  const patientPostVerifiedResponseMinutes = patientPostsWithVerifiedResponse.map(
    (item) => item.minutes,
  );
  const patientPostsAwaitingVerifiedPsychologistResponse = Math.max(
    0,
    patientPosts.length - patientPostsAnsweredByVerifiedPsychologists,
  );
  const anonymousPatientPosts = patientPosts.filter((post) => post.anonymous);
  const identifiedPatientPosts = patientPosts.filter((post) => !post.anonymous);
  const anonymousPatientPostsAnsweredByVerifiedPsychologists =
    patientPostsWithVerifiedResponse.filter((item) => item.post.anonymous).length;
  const identifiedPatientPostsAnsweredByVerifiedPsychologists =
    patientPostsWithVerifiedResponse.filter((item) => !item.post.anonymous).length;
  const averageFirstVerifiedResponseMinutes =
    patientPostVerifiedResponseMinutes.length > 0
      ? Math.round(
          patientPostVerifiedResponseMinutes.reduce((total, value) => total + value, 0) /
            patientPostVerifiedResponseMinutes.length,
        )
      : null;
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
  const hourlyActivity = createDashboardHourlyActivityMap();
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
    incrementDashboardHourlyActivity(hourlyActivity, post.createdAt, "posts");
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
    incrementDashboardHourlyActivity(hourlyActivity, reply.createdAt, "replies");
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
    incrementDashboardHourlyActivity(hourlyActivity, report.createdAt, "reports");
    const point = daily.get(toDateKey(report.createdAt));
    if (point) point.reports += 1;
  }
  for (const vote of periodVotes) {
    incrementDashboardHourlyActivity(hourlyActivity, vote.createdAt, "engagement");
    const point = daily.get(toDateKey(vote.createdAt));
    if (point && vote.value === 1) point.upvotes += 1;
    if (point && vote.value === -1) point.downvotes += 1;
  }
  for (const save of [...periodPostSaves, ...periodReplySaves]) {
    incrementDashboardHourlyActivity(hourlyActivity, save.createdAt, "engagement");
    const point = daily.get(toDateKey(save.createdAt));
    if (point) point.saves += 1;
  }
  for (const event of periodWhatsappClicks) {
    incrementDashboardHourlyActivity(hourlyActivity, event.occurred_at, "engagement");
    const point = daily.get(toDateKey(event.occurred_at));
    if (point) point.whatsapp_clicks += 1;
  }
  for (const event of periodProfileAccesses) {
    // Acessos a perfis permanecem nas estatísticas de conteúdo, mas não entram
    // no gráfico horário geral porque não têm comunidade única atribuível.
    const point = daily.get(toDateKey(event.occurred_at));
    if (point) point.profile_accesses += 1;
  }
  for (const event of periodPageViews) {
    incrementDashboardHourlyActivity(hourlyActivity, event.occurred_at, "accesses");
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
      hourly_activity: [...hourlyActivity.values()],
      posts_by_content_format: buildPostContentFormatDistribution(psychologistPosts),
      replies_by_content_format: buildReplyContentFormatDistribution(psychologistReplies),
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
      care_coverage: {
        average_first_verified_response_minutes: averageFirstVerifiedResponseMinutes,
        patient_posts_awaiting_verified_psychologist_response:
          patientPostsAwaitingVerifiedPsychologistResponse,
        patient_posts_responded_by_verified_psychologists:
          patientPostsAnsweredByVerifiedPsychologists,
        patient_posts_verified_response_breakdown: {
          anonymous: {
            responded_by_verified_psychologists:
              anonymousPatientPostsAnsweredByVerifiedPsychologists,
            total: anonymousPatientPosts.length,
          },
          identified: {
            responded_by_verified_psychologists:
              identifiedPatientPostsAnsweredByVerifiedPsychologists,
            total: identifiedPatientPosts.length,
          },
          total: {
            responded_by_verified_psychologists: patientPostsAnsweredByVerifiedPsychologists,
            total: patientPosts.length,
          },
        },
        source: "community_post+post_reply",
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
