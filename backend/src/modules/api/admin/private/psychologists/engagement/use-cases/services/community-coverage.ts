import { error } from "@/helpers/translate";
import {
  diagnoseAdminCommunityEngagement,
  formatAdminPsychologistCommunityEngagementDiagnosis,
} from "@/utils/admin-community-engagement-diagnosis";
import { toDateKey } from "@/utils/date-range";
import type {
  AdminPsychologistEngagementQuery,
  AdminPsychologistStatisticsDTO,
} from "../../DTOs/IAdminPsychologistEngagementDTO";
import type {
  AdminPsychologistCoveragePatientPost,
  AdminPsychologistEngagementPost,
  AdminPsychologistEngagementReply,
  AdminPsychologistEngagementRepository,
} from "../../repositories/AdminPsychologistEngagementRepository";

import {
  classifyPostContentFormat,
  classifyReplyContentFormat,
  emptyCommunityVideoRate,
  finalizeCommunityVideoRate,
  incrementCommunityVideoRate,
  roundPercent,
} from "./business-content";

import { earlierDate, groupDateCounts, valueFromMap } from "./statistics-utils";

export { earlierDate } from "./statistics-utils";

export const buildCommunityItems = (input: {
  allPosts: AdminPsychologistEngagementPost[];
  allReplies: AdminPsychologistEngagementReply[];
  coverageWindow: { end: Date; start: Date };
  memberships: Awaited<ReturnType<AdminPsychologistEngagementRepository["listCommunities"]>>;
  patientPostsByCommunity: Map<string, number>;
  postVotesByUser: Awaited<
    ReturnType<AdminPsychologistEngagementRepository["listPostVotesByUser"]>
  >;
  posts: AdminPsychologistEngagementPost[];
  replies: AdminPsychologistEngagementReply[];
  replyVotesByUser: Awaited<
    ReturnType<AdminPsychologistEngagementRepository["listReplyVotesByUser"]>
  >;
}): AdminPsychologistStatisticsDTO["community"]["communities"] => {
  const communities = new Map<
    string,
    AdminPsychologistStatisticsDTO["community"]["communities"][number]
  >();

  const ensureItem = (
    community: AdminPsychologistEngagementPost["community"],
  ): AdminPsychologistStatisticsDTO["community"]["communities"][number] => {
    const current = communities.get(community.id);
    if (current) return current;

    const next = {
      avatar_url: community.avatar_url,
      color: community.visual_primary_color,
      coverage: {
        covered_patient_posts: 0,
        patient_posts: input.patientPostsByCommunity.get(community.id) ?? 0,
        rate_percent: null,
        source: "community_post.author.role=paciente+post_reply.author_id" as const,
      },
      downvotes: 0,
      engagement_diagnosis: formatAdminPsychologistCommunityEngagementDiagnosis(
        diagnoseAdminCommunityEngagement({
          interactions: 0,
          source: "community_post+post_reply+post_vote.user_id",
        }),
      ),
      following: false,
      id: community.id,
      interactions: 0,
      member_since: null,
      name: community.name,
      posts: 0,
      posts_video_rate: emptyCommunityVideoRate(),
      ranking: null,
      replies: 0,
      replies_video_rate: emptyCommunityVideoRate(),
      slug: community.slug,
      upvotes: 0,
    };

    communities.set(community.id, next);

    return next;
  };

  for (const post of input.allPosts) {
    const current = ensureItem(post.community);
    current.member_since = earlierDate(current.member_since, post.createdAt);
  }

  for (const reply of input.allReplies) {
    const current = ensureItem(reply.post.community);
    current.member_since = earlierDate(current.member_since, reply.createdAt);
  }

  for (const membership of input.memberships) {
    const current = ensureItem(membership.community);
    current.following = true;
    current.member_since = earlierDate(current.member_since, membership.createdAt);
  }

  for (const post of input.posts) {
    const current = ensureItem(post.community);
    current.interactions += 1;
    current.posts += 1;
    incrementCommunityVideoRate(
      current.posts_video_rate,
      classifyPostContentFormat(post) === "video",
    );
  }

  for (const reply of input.replies) {
    const current = ensureItem(reply.post.community);
    current.interactions += 1;
    current.replies += 1;
    incrementCommunityVideoRate(
      current.replies_video_rate,
      classifyReplyContentFormat(reply) === "video",
    );
  }

  for (const vote of input.postVotesByUser) {
    const community = vote.post?.community;
    if (!community) continue;

    const current = ensureItem(community);
    current.interactions += 1;
    if (vote.value > 0) current.upvotes += 1;
    if (vote.value < 0) current.downvotes += 1;
  }

  for (const vote of input.replyVotesByUser) {
    const community = vote.reply?.post.community;
    if (!community) continue;

    const current = ensureItem(community);
    current.interactions += 1;
    if (vote.value > 0) current.upvotes += 1;
    if (vote.value < 0) current.downvotes += 1;
  }

  for (const community of communities.values()) {
    const coveredPatientPosts = new Set(
      input.replies
        .filter(
          (reply) =>
            reply.post.community.id === community.id &&
            reply.post.author.role === "paciente" &&
            reply.post.createdAt >= input.coverageWindow.start &&
            reply.post.createdAt <= input.coverageWindow.end,
        )
        .map((reply) => reply.post.id),
    ).size;
    const patientPosts = community.coverage.patient_posts;

    community.coverage.covered_patient_posts = coveredPatientPosts;
    community.coverage.rate_percent =
      patientPosts > 0 ? roundPercent((coveredPatientPosts / patientPosts) * 100) : null;
  }

  const activeCommunities = [...communities.values()].filter(
    (community) => community.interactions > 0,
  );
  return activeCommunities
    .map((community) => ({
      ...community,
      engagement_diagnosis: formatAdminPsychologistCommunityEngagementDiagnosis(
        diagnoseAdminCommunityEngagement({
          interactions: community.interactions,
          source: "community_post+post_reply+post_vote.user_id",
        }),
      ),
      posts_video_rate: finalizeCommunityVideoRate(community.posts_video_rate),
      replies_video_rate: finalizeCommunityVideoRate(community.replies_video_rate),
    }))
    .sort((left, right) => {
      if (left.interactions !== right.interactions) return right.interactions - left.interactions;

      return left.name.localeCompare(right.name, "pt-BR");
    });
};

export const withCommunityRankings = async (input: {
  communities: AdminPsychologistStatisticsDTO["community"]["communities"];
  psychologistId: string;
  repository: AdminPsychologistEngagementRepository;
}): Promise<AdminPsychologistStatisticsDTO["community"]["communities"]> => {
  if (input.communities.length === 0) return input.communities;

  const eligibleMentorIds = await input.repository.listTopMentorEligiblePsychologistIds();
  if (!eligibleMentorIds.includes(input.psychologistId)) {
    return input.communities.map((community) => ({ ...community, ranking: null }));
  }

  const rankingsByCommunityId = new Map<
    string,
    NonNullable<AdminPsychologistStatisticsDTO["community"]["communities"][number]["ranking"]>
  >();

  await Promise.all(
    input.communities.map(async (community) => {
      const rankingSignals = await input.repository.getCommunityMentorRankingSignals(community.id, [
        ...eligibleMentorIds,
      ]);
      const ranking = rankingSignals.get(input.psychologistId);

      if (ranking) rankingsByCommunityId.set(community.id, ranking);
    }),
  );

  return input.communities.map((community) => ({
    ...community,
    ranking: rankingsByCommunityId.get(community.id) ?? null,
  }));
};

export const normalizeStatisticsQuery = (query: AdminPsychologistEngagementQuery = {}) => ({
  community: query.community?.trim() || "all",
  from: query.from,
  period: query.period,
  to: query.to,
});

export const matchesCommunityFilter = (
  community: { id: string; slug: string },
  communityFilter: string,
) =>
  communityFilter === "all" ||
  community.id === communityFilter ||
  community.slug === communityFilter;

export const filterPostsByCommunity = (
  posts: AdminPsychologistEngagementPost[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? posts
    : posts.filter((post) => matchesCommunityFilter(post.community, communityFilter));

export const filterRepliesByCommunity = (
  replies: AdminPsychologistEngagementReply[],
  communityFilter: string,
) =>
  communityFilter === "all"
    ? replies
    : replies.filter((reply) => matchesCommunityFilter(reply.post.community, communityFilter));

export type CommunityReference = { id: string; slug: string };

export type CommunityContentAttentionSessions = Awaited<
  ReturnType<AdminPsychologistEngagementRepository["listCommunityContentAttentionSessions"]>
>;

export const uniqueCommunityReferences = (communities: CommunityReference[]) => {
  const map = new Map<string, CommunityReference>();

  for (const community of communities) {
    map.set(community.id, community);
  }

  return [...map.values()];
};

export const resolveCommunityFilterIds = (
  communityFilter: string,
  communities: CommunityReference[],
) => {
  if (communityFilter === "all") return null;

  const ids = new Set(
    communities
      .filter((community) => matchesCommunityFilter(community, communityFilter))
      .map((community) => community.id),
  );

  if (ids.size === 0) ids.add(communityFilter);

  return ids;
};

export const filterPatientPostsByCommunity = (
  posts: AdminPsychologistCoveragePatientPost[],
  communityFilterIds: Set<string> | null,
) =>
  communityFilterIds === null
    ? posts
    : posts.filter((post) => communityFilterIds.has(post.community.id));

export const filterCommunityContentAttentionSessions = (
  sessions: CommunityContentAttentionSessions,
  communityFilterIds: Set<string> | null,
) =>
  communityFilterIds === null
    ? sessions
    : sessions.filter((session) => communityFilterIds.has(session.community_id));

export const countPatientPostsByCommunity = (posts: AdminPsychologistCoveragePatientPost[]) => {
  const counts = new Map<string, number>();

  for (const post of posts) {
    counts.set(post.community.id, (counts.get(post.community.id) ?? 0) + 1);
  }

  return counts;
};

export const countCoveredPatientPosts = (input: {
  coverageWindow: { end: Date; start: Date };
  replies: AdminPsychologistEngagementReply[];
}) =>
  new Set(
    input.replies
      .filter(
        (reply) =>
          reply.post.author.role === "paciente" &&
          reply.post.createdAt >= input.coverageWindow.start &&
          reply.post.createdAt <= input.coverageWindow.end,
      )
      .map((reply) => reply.post.id),
  ).size;

export const coverageRatePercent = (coveredPatientPosts: number, patientPosts: number) =>
  patientPosts > 0 ? roundPercent((coveredPatientPosts / patientPosts) * 100) : null;

export const buildCoverageRatePercentByDate = (input: {
  coverageWindow: { end: Date; start: Date };
  labels: string[];
  patientPosts: AdminPsychologistCoveragePatientPost[];
  replies: AdminPsychologistEngagementReply[];
}) => {
  const patientPostsByDate = groupDateCounts(input.patientPosts, input.labels);
  const coveredPatientPostsByDate = new Map<string, Set<string>>();

  for (const reply of input.replies) {
    if (reply.post.author.role !== "paciente") continue;
    if (reply.post.createdAt < input.coverageWindow.start) continue;
    if (reply.post.createdAt > input.coverageWindow.end) continue;

    const date = toDateKey(reply.post.createdAt);
    if (!input.labels.includes(date)) continue;

    const current = coveredPatientPostsByDate.get(date) ?? new Set<string>();
    current.add(reply.post.id);
    coveredPatientPostsByDate.set(date, current);
  }

  return new Map(
    input.labels.map((date) => {
      const patientPosts = valueFromMap(patientPostsByDate, date);
      const coveredPatientPosts = coveredPatientPostsByDate.get(date)?.size ?? 0;

      return [date, coverageRatePercent(coveredPatientPosts, patientPosts) ?? 0] as const;
    }),
  );
};

export const notFound = () => ({
  status: 404,
  ...error("not_found", { model: "psychologist" }),
});
