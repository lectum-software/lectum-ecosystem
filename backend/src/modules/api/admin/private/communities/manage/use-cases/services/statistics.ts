import { toDateKey as dateKey } from "@/utils/date-range";
import type { AdminCommunityStatisticsDTO } from "../../DTOs/IAdminCommunityManageDTO";
import {
  buildPostContentFormatDistribution,
  buildReplyContentFormatDistribution,
} from "./community-list";

import type { StatisticsPeriodRange } from "./content";
import {
  type CommunityStatisticsActivity,
  type CommunityStatisticsRole,
  createStatisticsHourlyActivityMap,
  emptyStatisticsDailyPoint,
  incrementStatisticsHourlyActivityCollections,
  isInStatisticsPeriod,
  isVerifiedStatisticsPsychologist,
  type StatisticsDataset,
  statisticsDailyRoleSet,
  statisticsDateKeyEnd,
  statisticsDateLabels,
  statisticsRole,
  statisticsRoleCounters,
  statisticsSplit,
  statisticsWeekdayLabels,
} from "./statistics-support";

export const buildCommunityStatistics = (
  dataset: StatisticsDataset,
  period: StatisticsPeriodRange,
): Omit<AdminCommunityStatisticsDTO, "community" | "period" | "source"> => {
  const periodPosts = dataset.posts.filter((post) => isInStatisticsPeriod(post.createdAt, period));
  const periodReplies = dataset.replies.filter((reply) =>
    isInStatisticsPeriod(reply.createdAt, period),
  );
  const periodReports = dataset.reports.filter((report) =>
    isInStatisticsPeriod(report.createdAt, period),
  );
  const periodPostVotes = dataset.postVotes.filter((vote) =>
    isInStatisticsPeriod(vote.createdAt, period),
  );
  const periodReplyVotes = dataset.replyVotes.filter((vote) =>
    isInStatisticsPeriod(vote.createdAt, period),
  );
  const periodPostSaves = dataset.postSaves.filter((save) =>
    isInStatisticsPeriod(save.createdAt, period),
  );
  const periodReplySaves = dataset.replySaves.filter((save) =>
    isInStatisticsPeriod(save.createdAt, period),
  );
  const periodWhatsappClicks = dataset.contentWhatsappClicks.filter((event) =>
    isInStatisticsPeriod(event.occurred_at, period),
  );
  const periodProfileAccesses = dataset.profileAccesses.filter((event) =>
    isInStatisticsPeriod(event.occurred_at, period),
  );
  const periodPageViews = dataset.pageViews.filter((event) =>
    isInStatisticsPeriod(event.occurred_at, period),
  );
  const followerItems = dataset.members.flatMap((member) => {
    const role = statisticsRole(member.user);

    return role ? [{ date: member.createdAt, role }] : [];
  });
  const followerRoles = followerItems.map((item) => ({ role: item.role }));
  const followers = statisticsRoleCounters(followerRoles);
  const patientPosts = periodPosts.filter((post) => statisticsRole(post.author) === "paciente");
  const psychologistPosts = periodPosts.filter(
    (post) => statisticsRole(post.author) === "psicologo",
  );
  const verifiedPsychologistPostCount = psychologistPosts.filter((post) =>
    isVerifiedStatisticsPsychologist(post.author),
  ).length;
  const anonymousPostCount = periodPosts.filter((post) => post.anonymous).length;
  const patientComments = periodReplies.filter(
    (reply) => statisticsRole(reply.author) === "paciente",
  );
  const psychologistReplies = periodReplies.filter(
    (reply) => statisticsRole(reply.author) === "psicologo",
  );
  const verifiedPsychologistReplyCount = psychologistReplies.filter((reply) =>
    isVerifiedStatisticsPsychologist(reply.author),
  ).length;
  const periodVotes = [...periodPostVotes, ...periodReplyVotes];
  const upvoteCount = periodVotes.filter((vote) => vote.value === 1).length;
  const downvoteCount = periodVotes.filter((vote) => vote.value === -1).length;
  const savesCount = periodPostSaves.length + periodReplySaves.length;
  const patientPostsWithAnyResponse = patientPosts.filter((post) =>
    post.replies.some((reply) => reply.createdAt <= period.end),
  ).length;
  const patientPostsWithVerifiedResponse = patientPosts.flatMap((post) => {
    const firstVerifiedReply = post.replies
      .filter(
        (reply) => reply.createdAt <= period.end && isVerifiedStatisticsPsychologist(reply.author),
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
  const patientPostVerifiedResponseMinutes = patientPostsWithVerifiedResponse.map(
    (item) => item.minutes,
  );
  const patientPostsAnsweredByVerifiedPsychologists = patientPostVerifiedResponseMinutes.length;
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
  const activityItems: CommunityStatisticsActivity[] = [];

  for (const member of dataset.members) {
    const role = statisticsRole(member.user);
    if (role) activityItems.push({ date: member.createdAt, role, userId: member.user_id });
  }
  for (const post of dataset.posts) {
    const role = statisticsRole(post.author);
    if (role) activityItems.push({ date: post.createdAt, role, userId: post.author_id });
  }
  for (const reply of dataset.replies) {
    const role = statisticsRole(reply.author);
    if (role) activityItems.push({ date: reply.createdAt, role, userId: reply.author_id });
  }
  for (const pageView of dataset.pageViews) {
    const role = statisticsRole(pageView.user);
    if (role && pageView.user_id) {
      activityItems.push({ date: pageView.occurred_at, role, userId: pageView.user_id });
    }
  }

  const activeByUser = new Map<string, { role: CommunityStatisticsRole }>();
  const firstActivityByUser = new Map<
    string,
    { date: Date; role: CommunityStatisticsRole; userId: string }
  >();
  const daily = new Map(
    statisticsDateLabels(period).map((label) => [label, emptyStatisticsDailyPoint(label)]),
  );
  const hourlyActivity = createStatisticsHourlyActivityMap();
  const hourlyActivityByWeekday = new Map(
    statisticsWeekdayLabels.map((label, day) => [
      day,
      {
        hours: createStatisticsHourlyActivityMap(),
        label,
      },
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
    if (!isInStatisticsPeriod(activity.date, period)) continue;
    activeByUser.set(activity.userId, { role: activity.role });
    const key = dateKey(activity.date);
    const roleSet = statisticsDailyRoleSet(dailyActiveUsers, key);
    if (activity.role === "paciente") {
      roleSet.patients.add(activity.userId);
    } else {
      roleSet.psychologists.add(activity.userId);
    }
  }

  const newActiveUsers = [...firstActivityByUser.values()].filter((item) =>
    isInStatisticsPeriod(item.date, period),
  );
  for (const item of newActiveUsers) {
    const key = dateKey(item.date);
    const roleSet = statisticsDailyRoleSet(dailyNewUsers, key);
    if (item.role === "paciente") {
      roleSet.patients.add(item.userId);
    } else {
      roleSet.psychologists.add(item.userId);
    }
  }

  for (const [key, point] of daily) {
    const dayEnd = statisticsDateKeyEnd(key);
    point.followers_patients = followerItems.filter(
      (item) => item.role === "paciente" && item.date <= dayEnd,
    ).length;
    point.followers_psychologists = followerItems.filter(
      (item) => item.role === "psicologo" && item.date <= dayEnd,
    ).length;
  }

  for (const post of periodPosts) {
    const point = daily.get(dateKey(post.createdAt));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      post.createdAt,
      "posts",
    );
    if (point) {
      point.posts += 1;
      if (statisticsRole(post.author) === "paciente") {
        point.patient_posts += 1;
      } else if (statisticsRole(post.author) === "psicologo") {
        point.psychologist_posts += 1;
      }
      if (post.anonymous) point.anonymous_posts += 1;
    }
  }
  for (const reply of periodReplies) {
    const point = daily.get(dateKey(reply.createdAt));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      reply.createdAt,
      "replies",
    );
    if (point) {
      point.replies += 1;
      if (statisticsRole(reply.author) === "paciente") {
        point.patient_comments += 1;
      } else if (isVerifiedStatisticsPsychologist(reply.author)) {
        point.verified_psychologist_replies += 1;
      } else if (statisticsRole(reply.author) === "psicologo") {
        point.unverified_psychologist_replies += 1;
      }
    }
  }
  for (const report of periodReports) {
    const point = daily.get(dateKey(report.createdAt));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      report.createdAt,
      "reports",
    );
    if (point) point.reports += 1;
  }
  for (const vote of periodVotes) {
    const point = daily.get(dateKey(vote.createdAt));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      vote.createdAt,
      "engagement",
    );
    if (point && vote.value === 1) point.upvotes += 1;
    if (point && vote.value === -1) point.downvotes += 1;
  }
  for (const save of [...periodPostSaves, ...periodReplySaves]) {
    const point = daily.get(dateKey(save.createdAt));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      save.createdAt,
      "engagement",
    );
    if (point) point.saves += 1;
  }
  for (const event of periodWhatsappClicks) {
    const point = daily.get(dateKey(event.occurred_at));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      event.occurred_at,
      "engagement",
    );
    if (point) point.whatsapp_clicks += 1;
  }
  for (const event of periodProfileAccesses) {
    const point = daily.get(dateKey(event.occurred_at));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      event.occurred_at,
      "engagement",
    );
    if (point) point.profile_accesses += 1;
  }
  for (const event of periodPageViews) {
    const point = daily.get(dateKey(event.occurred_at));
    incrementStatisticsHourlyActivityCollections(
      hourlyActivity,
      hourlyActivityByWeekday,
      event.occurred_at,
      "accesses",
    );
    if (point) point.accesses += 1;
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

  const activeUsers = statisticsRoleCounters([...activeByUser.values()]);
  const newActiveUserCounters = statisticsRoleCounters(newActiveUsers);

  return {
    charts: {
      active_users_split: statisticsSplit(
        "community_member+community_post+post_reply+page_view_event",
        [
          { id: "patients", label: "Pacientes", value: activeUsers.patients },
          { id: "psychologists", label: "Psic\u00f3logos", value: activeUsers.psychologists },
        ],
      ),
      daily: [...daily.values()],
      followers_split: statisticsSplit("community_member", [
        { id: "patients", label: "Pacientes", value: followers.patients },
        { id: "psychologists", label: "Psic\u00f3logos", value: followers.psychologists },
      ]),
      hourly_activity: [...hourlyActivity.values()],
      hourly_activity_by_weekday: [...hourlyActivityByWeekday.entries()].map(([day, item]) => ({
        day,
        hours: [...item.hours.values()],
        label: item.label,
      })),
      posts_by_content_format: buildPostContentFormatDistribution(psychologistPosts),
      replies_by_content_format: buildReplyContentFormatDistribution(psychologistReplies),
      posts_by_author: statisticsSplit("community_post+post_reply", [
        { id: "patients", label: "Pacientes", value: patientPosts.length },
        {
          id: "verified_psychologists",
          label: "Psic\u00f3logos verificados",
          value: verifiedPsychologistPostCount,
        },
        {
          id: "unverified_psychologists",
          label: "Psic\u00f3logos n\u00e3o verificados",
          value: psychologistPosts.length - verifiedPsychologistPostCount,
        },
        {
          id: "patient_posts_answered_by_verified_psychologists",
          label: "Posts de pacientes respondidos por verificados",
          value: patientPostsAnsweredByVerifiedPsychologists,
        },
      ]),
      replies_by_author: statisticsSplit("post_reply", [
        {
          id: "verified_psychologists",
          label: "Psic\u00f3logos verificados",
          value: verifiedPsychologistReplyCount,
        },
        {
          id: "unverified_psychologists",
          label: "Psic\u00f3logos n\u00e3o verificados",
          value: psychologistReplies.length - verifiedPsychologistReplyCount,
        },
        {
          id: "patient_comments",
          label: "Coment\u00e1rios de pacientes",
          value: patientComments.length,
        },
      ]),
    },
    counters: {
      accesses: {
        source: "page_view_event",
        total: periodPageViews.length,
      },
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
        patient_posts_with_any_response: patientPostsWithAnyResponse,
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
  };
};
