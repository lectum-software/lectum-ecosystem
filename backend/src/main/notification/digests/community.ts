import prisma from "@/infra/database/prisma";
import { isNotificationEnabled } from "../preferences";
import {
  buildPostRedirect,
  buildPsychologistDigestContent,
  getBestPsychologistActivityCandidate,
  getPatientFollowedCommunities,
  markDigestChecked,
  sendDigestPush,
} from "./psychologist";
import {
  type CommunityDigestCandidate,
  type DigestTargetUser,
  getDigestSince,
  getDigestState,
  saveDigestState,
} from "./state";

export const processLunchDigest = async (user: DigestTargetUser, now: Date, dateKey: string) => {
  const { recordId, state } = await getDigestState(user.id);
  const current = state.favorites_lunch_digest;
  if (current?.last_sent_date === dateKey) return;

  const candidate = await getBestPsychologistActivityCandidate(
    user,
    getDigestSince(now, current),
    now,
  );
  if (!candidate) {
    markDigestChecked(state, "favorites_lunch_digest", now, dateKey, false);
    await saveDigestState(user.id, recordId, state);
    return;
  }

  const content = buildPsychologistDigestContent(candidate);
  const sent = await sendDigestPush(user, {
    ...content,
    redirect: buildPostRedirect(candidate.communitySlug, candidate.postId),
    type: "favorites_lunch_digest",
  });

  markDigestChecked(state, "favorites_lunch_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};

export const getCommunityDigestCandidates = async (params: {
  communityIds?: string[];
  excludedCommunityIds?: string[];
  excludedAuthorId?: string;
  limit?: number;
  now: Date;
  since: Date;
  categories?: string[];
}) => {
  const posts = await prisma.community_post.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      community: {
        select: {
          id: true,
          slug: true,
        },
      },
      community_id: true,
      createdAt: true,
      id: true,
      replies_count: true,
      saves_count: true,
      upvotes_count: true,
    },
    take: params.limit ?? 100,
    where: {
      community: {
        ...(params.categories && params.categories.length > 0
          ? {
              category: {
                in: params.categories,
              },
            }
          : {}),
        ...(params.excludedCommunityIds && params.excludedCommunityIds.length > 0
          ? {
              id: {
                notIn: params.excludedCommunityIds,
              },
            }
          : {}),
        deleted: false,
      },
      ...(params.communityIds && params.communityIds.length > 0
        ? {
            community_id: {
              in: params.communityIds,
            },
          }
        : {}),
      ...(params.excludedAuthorId
        ? {
            author_id: {
              not: params.excludedAuthorId,
            },
          }
        : {}),
      createdAt: {
        gte: params.since,
        lte: params.now,
      },
      deleted: false,
      status: "publicado",
    },
  });

  return posts.map<CommunityDigestCandidate>((post) => ({
    communityId: post.community_id,
    communitySlug: post.community.slug,
    createdAt: post.createdAt,
    engagement: post.upvotes_count * 3 + post.replies_count * 2 + post.saves_count * 2,
    postId: post.id,
  }));
};

export const sortCommunityCandidates = (candidates: CommunityDigestCandidate[]) =>
  candidates.sort((a, b) => {
    const engagementDiff = b.engagement - a.engagement;
    if (engagementDiff !== 0) return engagementDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });

export const getBestCommunityDigestCandidate = async (
  user: DigestTargetUser,
  since: Date,
  now: Date,
) => {
  if (!isNotificationEnabled(user.notification_preference?.prefs, "novo_post")) return null;

  const followedCommunities = await getPatientFollowedCommunities(user.id);
  const followedCommunityIds = followedCommunities.map((membership) => membership.community_id);
  const followedCategories = [
    ...new Set(
      followedCommunities
        .map((membership) => membership.community.category)
        .filter((category): category is string => Boolean(category)),
    ),
  ];

  const followedCandidates =
    followedCommunityIds.length > 0
      ? await getCommunityDigestCandidates({
          communityIds: followedCommunityIds,
          excludedAuthorId: user.id,
          now,
          since,
        })
      : [];

  if (followedCandidates.length > 0) {
    return {
      candidate: sortCommunityCandidates(followedCandidates)[0],
      source: "followed" as const,
    };
  }

  const relatedCandidates =
    followedCategories.length > 0
      ? await getCommunityDigestCandidates({
          categories: followedCategories,
          excludedCommunityIds: followedCommunityIds,
          excludedAuthorId: user.id,
          now,
          since,
        })
      : [];

  if (relatedCandidates.length > 0) {
    return {
      candidate: sortCommunityCandidates(relatedCandidates)[0],
      source: "related" as const,
    };
  }

  const generalCandidates = await getCommunityDigestCandidates({
    excludedAuthorId: user.id,
    now,
    since,
  });

  if (generalCandidates.length === 0) return null;

  return {
    candidate: sortCommunityCandidates(generalCandidates)[0],
    source: "general" as const,
  };
};

export const buildCommunityDigestContent = (source: "followed" | "general" | "related") => {
  if (source === "followed") {
    return {
      body: "Veja conversas recentes nas comunidades que você acompanha.",
      title: "Novidades nas comunidades que você segue",
    };
  }

  return {
    body: "Veja conversas recentes que podem te interessar hoje.",
    title: "Novidades nas comunidades da Lectum",
  };
};

export const processEveningDigest = async (user: DigestTargetUser, now: Date, dateKey: string) => {
  const { recordId, state } = await getDigestState(user.id);
  const current = state.community_evening_digest;
  if (current?.last_sent_date === dateKey) return;

  const result = await getBestCommunityDigestCandidate(user, getDigestSince(now, current), now);
  if (!result) {
    markDigestChecked(state, "community_evening_digest", now, dateKey, false);
    await saveDigestState(user.id, recordId, state);
    return;
  }

  const content = buildCommunityDigestContent(result.source);
  const sent = await sendDigestPush(user, {
    ...content,
    redirect: buildPostRedirect(result.candidate.communitySlug, result.candidate.postId),
    type: "community_evening_digest",
  });

  markDigestChecked(state, "community_evening_digest", now, dateKey, sent);
  await saveDigestState(user.id, recordId, state);
};
