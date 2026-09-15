import type { Prisma } from "@/external/generated/prisma/client";
import {
  activeProfessionalEntitlementWhere,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import type { CommunityPostSortMetricsDTO } from "../../DTOs/ICommunityDTO";

export const DEFAULT_LIMIT = 20;

export const MAX_LIMIT = 50;

export const DEFAULT_TOP_MENTORS_LIMIT = 5;

export const MAX_TOP_MENTORS_LIMIT = 10;

export const TOP_MENTOR_UPVOTE_WEIGHT = 2;

export const TOP_MENTOR_DOWNVOTE_WEIGHT = 3;

export const TOP_MENTOR_COMMENT_WEIGHT = 5;

export const TOP_MENTOR_SHARE_WEIGHT = 8;

export const TOP_MENTOR_SAVE_WEIGHT = 2;

export const TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT = 6;

export const TOP_MENTOR_POST_WEIGHT = 1;

export const TOP_MENTOR_REPLY_WEIGHT = 3;

export const TOP_MENTOR_ACTIVE_DAY_WEIGHT = 1;

export const TOP_MENTOR_REMOVED_POST_PENALTY_STEP = 30;

export const COMMUNITY_DOWNVOTE_RANKING_WEIGHT = 0.6;

export const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  avatar_url: true,
  visual_primary_color: true,
  visual_primary_dark_color: true,
  visual_soft_color: true,
  visual_text_color: true,
  visual_gradient_color: true,
  createdAt: true,
} satisfies Prisma.communitySelect;

export const communityRuleSelect = {
  description: true,
  id: true,
  position: true,
  title: true,
} satisfies Prisma.community_ruleSelect;

export const professionalProfileSelect = {
  professional_first_name: true,
  professional_last_name: true,
  gender: true,
  crp: true,
  whatsapp: true,
  cfp_verified_at: true,
  crp_status: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
      source: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

export const authorSelect = {
  id: true,
  deleted: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

export const topMentorUserSelect = {
  id: true,
  name: true,
  avatar: true,
  psychologist_profile: {
    select: {
      headline: true,
      professional_first_name: true,
      professional_last_name: true,
      whatsapp: true,
      cfp_verified_at: true,
      crp_status: true,
      crp: true,
      rating_avg: true,
      rating_count: true,
      subscriptions: {
        where: activeProfessionalEntitlementWhere(),
        select: {
          id: true,
          source: true,
        },
      },
    },
  },
} satisfies Prisma.userSelect;

export const postSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  thumbnail_url: true,
  media_items: {
    where: {
      deleted: false,
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      media_url: true,
      media_type: true,
      thumbnail_url: true,
      position: true,
    },
  },
  anonymous: true,
  status: true,
  upvotes_count: true,
  downvotes_count: true,
  replies_count: true,
  saves_count: true,
  createdAt: true,
  edited_at: true,
  community: {
    select: communitySelect,
  },
  author: {
    select: authorSelect,
  },
  replies: {
    where: {
      deleted: false,
      parent_reply_id: null,
      author: {
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            ...verifiedProfessionalProfileWhere(),
          },
        },
      },
    },
    orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      content: true,
      media_url: true,
      media_type: true,
      thumbnail_url: true,
      upvotes_count: true,
      downvotes_count: true,
      createdAt: true,
      edited_at: true,
      parent_reply_id: true,
      parent_reply: {
        select: {
          content: true,
        },
      },
      author: {
        select: authorSelect,
      },
    },
  },
} satisfies Prisma.community_postSelect;

export type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;

export type AuthorResult = PostResult["author"];

export type ProfessionalReplyResult = PostResult["replies"][number];

export type TopMentorUserResult = Prisma.userGetPayload<{ select: typeof topMentorUserSelect }>;

export type CommunityRuleResult = Prisma.community_ruleGetPayload<{
  select: typeof communityRuleSelect;
}>;

export type CurrentVote = 1 | -1 | null;

export type CommunitySortPeriodKey = keyof CommunityPostSortMetricsDTO["comments"];

export type CommunityPostSortValue = "featured" | "new" | "commented" | "voted";

export type GeneralFeedQueueItem = {
  communityHotScore: number;
  communityId: string;
  communitySizeWeight: number;
  freshnessWeight: number;
  post: PostResult;
};

export const COMMUNITY_SORT_PERIOD_KEYS: CommunitySortPeriodKey[] = [
  "week",
  "month",
  "year",
  "all",
];

export const GENERAL_FEED_INITIAL_POOL_SIZE_PER_COMMUNITY = 5;

export const GENERAL_FEED_REFILL_SIZE_PER_COMMUNITY = 3;

export const GENERAL_FEED_REFILL_THRESHOLD_PER_COMMUNITY = 1;

export const GENERAL_FEED_RECENT_WINDOW_HOURS = 7 * 24;

export const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const emptyCommunitySortPeriodMetrics = (): CommunityPostSortMetricsDTO["comments"] => ({
  week: 0,
  month: 0,
  year: 0,
  all: 0,
});

export const emptyCommunityPostSortMetrics = (): CommunityPostSortMetricsDTO => ({
  comments: emptyCommunitySortPeriodMetrics(),
  upvotes: emptyCommunitySortPeriodMetrics(),
  psychologist_replies_count: 0,
  top_mentor_replies_count: 0,
  shares_count: 0,
  penalty: 0,
});

export const resolveCommunitySortPeriodStarts = () => {
  const now = new Date();
  const week = new Date(now);
  const day = week.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  week.setDate(week.getDate() - diffToMonday);
  week.setHours(0, 0, 0, 0);

  const month = new Date(now);
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const year = new Date(now);
  year.setMonth(0, 1);
  year.setHours(0, 0, 0, 0);

  return {
    week: week.getTime(),
    month: month.getTime(),
    year: year.getTime(),
    all: null,
  } satisfies Record<CommunitySortPeriodKey, number | null>;
};

export const incrementCommunitySortPeriodMetrics = (
  metrics: CommunityPostSortMetricsDTO["comments"],
  createdAt: Date,
  periodStarts: ReturnType<typeof resolveCommunitySortPeriodStarts>,
  amount = 1,
) => {
  const createdAtTime = createdAt.getTime();

  for (const period of COMMUNITY_SORT_PERIOD_KEYS) {
    const periodStart = periodStarts[period];

    if (!periodStart || createdAtTime >= periodStart) {
      metrics[period] += amount;
    }
  }
};

export const normalizeCommunityPostSort = (value?: string | null): CommunityPostSortValue => {
  if (value === "new" || value === "commented" || value === "voted") return value;

  return "featured";
};

export const normalizeCommunityPostSortPeriod = (value?: string | null): CommunitySortPeriodKey => {
  if (value === "month" || value === "year" || value === "all") return value;

  return "week";
};

export const compareCommunityPostDates = (a: PostResult, b: PostResult) => {
  const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (dateDiff !== 0) return dateDiff;

  return b.id.localeCompare(a.id);
};

export const communityPostMetrics = (
  postId: string,
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
) => metricsByPostId.get(postId) ?? emptyCommunityPostSortMetrics();

export const communityVoteRankingScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<PostResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * COMMUNITY_DOWNVOTE_RANKING_WEIGHT;

export const professionalReplyVoteRankingScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<ProfessionalReplyResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * COMMUNITY_DOWNVOTE_RANKING_WEIGHT;

export const communityPostFeaturedScore = (
  post: PostResult,
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
  now: number,
) => {
  const metrics = communityPostMetrics(post.id, metricsByPostId);
  const hoursSincePublication = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
  const highlightScore =
    metrics.upvotes.all * 3 +
    metrics.comments.all * 5 +
    metrics.psychologist_replies_count * 15 +
    metrics.top_mentor_replies_count * 25 +
    metrics.shares_count * 4 -
    metrics.penalty -
    post.downvotes_count * COMMUNITY_DOWNVOTE_RANKING_WEIGHT;

  return highlightScore / (hoursSincePublication + 2) ** 0.5;
};

export const sortCommunityPostResults = (
  items: PostResult[],
  sort: CommunityPostSortValue,
  period: CommunitySortPeriodKey,
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
) => {
  const sortedItems = items.filter((item) => item.status !== "removido");

  if (sort === "new") {
    return sortedItems.sort(compareCommunityPostDates);
  }

  if (sort === "commented" || sort === "voted") {
    const primaryMetric = sort === "commented" ? "comments" : "upvotes";
    const secondaryMetric = sort === "commented" ? "upvotes" : "comments";

    return sortedItems.sort((a, b) => {
      const aMetrics = communityPostMetrics(a.id, metricsByPostId);
      const bMetrics = communityPostMetrics(b.id, metricsByPostId);
      const primaryDiff = bMetrics[primaryMetric][period] - aMetrics[primaryMetric][period];
      if (primaryDiff !== 0) return primaryDiff;

      const secondaryDiff = bMetrics[secondaryMetric][period] - aMetrics[secondaryMetric][period];
      if (secondaryDiff !== 0) return secondaryDiff;

      const voteScoreDiff = communityVoteRankingScore(b) - communityVoteRankingScore(a);
      if (voteScoreDiff !== 0) return voteScoreDiff;

      return compareCommunityPostDates(a, b);
    });
  }

  const now = Date.now();

  return sortedItems.sort((a, b) => {
    const scoreDiff =
      communityPostFeaturedScore(b, metricsByPostId, now) -
      communityPostFeaturedScore(a, metricsByPostId, now);
    if (scoreDiff !== 0) return scoreDiff;

    return compareCommunityPostDates(a, b);
  });
};

export const clamp = (min: number, max: number, value: number) => {
  return Math.min(max, Math.max(min, value));
};

export const generalFeedFreshnessWeight = (hoursSincePublication: number) => {
  if (hoursSincePublication <= 24) return 1.3;
  if (hoursSincePublication <= 72) return 1.1;
  if (hoursSincePublication <= GENERAL_FEED_RECENT_WINDOW_HOURS) return 1;

  return 0.8;
};

export const generalFeedPostHotScore = (
  post: PostResult,
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
) => {
  const metrics = communityPostMetrics(post.id, metricsByPostId);
  const downvotePenalty = post.downvotes_count * COMMUNITY_DOWNVOTE_RANKING_WEIGHT;

  return (
    metrics.upvotes.all * 3 +
    metrics.comments.all * 5 +
    metrics.psychologist_replies_count * 25 +
    metrics.top_mentor_replies_count * 40 +
    metrics.shares_count * 4 -
    metrics.penalty -
    downvotePenalty
  );
};

export const generalFeedCommunityHotScore = (
  post: PostResult,
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
  now: number,
) => {
  const hoursSincePublication = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);

  return generalFeedPostHotScore(post, metricsByPostId) / (hoursSincePublication + 2) ** 0.5;
};

export const generalFeedDiversityWeight = (
  communityId: string,
  recentCommunityHistory: string[],
) => {
  const previousCommunityId = recentCommunityHistory[recentCommunityHistory.length - 1];
  if (previousCommunityId === communityId) return 0.35;

  const lastThreeCommunityIds = recentCommunityHistory.slice(-3);
  if (lastThreeCommunityIds.includes(communityId)) return 0.7;

  return 1;
};

export const generalFeedCandidateScore = (
  item: GeneralFeedQueueItem,
  recentCommunityHistory: string[],
) => {
  return (
    item.communityHotScore *
    item.freshnessWeight *
    item.communitySizeWeight *
    generalFeedDiversityWeight(item.communityId, recentCommunityHistory)
  );
};

export const buildGeneralFeedCommunitySizeWeights = (items: PostResult[], now: number) => {
  const recentCountsByCommunityId = new Map<string, number>();

  for (const item of items) {
    const communityId = item.community.id;
    const hoursSincePublication = Math.max(0, (now - item.createdAt.getTime()) / 3_600_000);
    const increment = hoursSincePublication <= GENERAL_FEED_RECENT_WINDOW_HOURS ? 1 : 0;

    recentCountsByCommunityId.set(
      communityId,
      (recentCountsByCommunityId.get(communityId) ?? 0) + increment,
    );
  }

  const communityIds = [...new Set(items.map((item) => item.community.id))];
  const normalizedRecentCounts = communityIds.map((communityId) =>
    Math.max(1, recentCountsByCommunityId.get(communityId) ?? 0),
  );
  const averageRecentCount =
    normalizedRecentCounts.length > 0
      ? normalizedRecentCounts.reduce((total, value) => total + value, 0) /
        normalizedRecentCounts.length
      : 1;

  return new Map(
    communityIds.map((communityId) => {
      const recentCount = Math.max(1, recentCountsByCommunityId.get(communityId) ?? 0);
      const weight = clamp(0.75, 1.15, 1 / Math.sqrt(recentCount / averageRecentCount));

      return [communityId, weight];
    }),
  );
};

export const sortGeneralFeedPostResults = (
  items: PostResult[],
  metricsByPostId: Map<string, CommunityPostSortMetricsDTO>,
) => {
  const now = Date.now();
  const communitySizeWeights = buildGeneralFeedCommunitySizeWeights(items, now);
  const queuesByCommunityId = new Map<string, GeneralFeedQueueItem[]>();

  for (const post of items.filter((item) => item.status !== "removido")) {
    const communityId = post.community.id;
    const hoursSincePublication = Math.max(0, (now - post.createdAt.getTime()) / 3_600_000);
    const queue = queuesByCommunityId.get(communityId) ?? [];

    queue.push({
      communityHotScore: generalFeedCommunityHotScore(post, metricsByPostId, now),
      communityId,
      communitySizeWeight: communitySizeWeights.get(communityId) ?? 1,
      freshnessWeight: generalFeedFreshnessWeight(hoursSincePublication),
      post,
    });
    queuesByCommunityId.set(communityId, queue);
  }

  for (const queue of queuesByCommunityId.values()) {
    queue.sort((a, b) => {
      const scoreDiff = b.communityHotScore - a.communityHotScore;
      if (scoreDiff !== 0) return scoreDiff;

      return compareCommunityPostDates(a.post, b.post);
    });
  }

  const pool: GeneralFeedQueueItem[] = [];
  const queueCursorsByCommunityId = new Map<string, number>();
  const loadNextCandidates = (communityId: string, count: number) => {
    const queue = queuesByCommunityId.get(communityId);
    if (!queue) return;

    const cursor = queueCursorsByCommunityId.get(communityId) ?? 0;
    const nextCursor = Math.min(queue.length, cursor + count);

    pool.push(...queue.slice(cursor, nextCursor));
    queueCursorsByCommunityId.set(communityId, nextCursor);
  };

  for (const communityId of queuesByCommunityId.keys()) {
    loadNextCandidates(communityId, GENERAL_FEED_INITIAL_POOL_SIZE_PER_COMMUNITY);
  }

  const rankedItems: GeneralFeedQueueItem[] = [];
  const recentCommunityHistory: string[] = [];
  const totalCandidates = [...queuesByCommunityId.values()].reduce(
    (total, queue) => total + queue.length,
    0,
  );

  while (rankedItems.length < totalCandidates && pool.length > 0) {
    let selectedIndex = 0;
    let selectedScore = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < pool.length; index += 1) {
      const candidate = pool[index];
      const score = generalFeedCandidateScore(candidate, recentCommunityHistory);

      if (score > selectedScore) {
        selectedIndex = index;
        selectedScore = score;
        continue;
      }

      if (score === selectedScore) {
        const selected = pool[selectedIndex];
        const hotScoreDiff = candidate.communityHotScore - selected.communityHotScore;

        if (
          hotScoreDiff > 0 ||
          (hotScoreDiff === 0 && compareCommunityPostDates(candidate.post, selected.post) < 0)
        ) {
          selectedIndex = index;
        }
      }
    }

    const [selected] = pool.splice(selectedIndex, 1);
    rankedItems.push(selected);
    recentCommunityHistory.push(selected.communityId);

    const selectedCommunityPoolSize = pool.filter(
      (candidate) => candidate.communityId === selected.communityId,
    ).length;

    if (selectedCommunityPoolSize <= GENERAL_FEED_REFILL_THRESHOLD_PER_COMMUNITY) {
      loadNextCandidates(selected.communityId, GENERAL_FEED_REFILL_SIZE_PER_COMMUNITY);
    }
  }

  return rankedItems.map((item) => item.post);
};
