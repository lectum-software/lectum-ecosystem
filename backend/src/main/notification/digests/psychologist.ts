import prisma from "@/infra/database/prisma";
import { sendWebPushToSubscriptions } from "@/main/notification/push";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { getNewPostAuthorScope, isNotificationEnabled } from "../preferences";

import {
  type DigestKind,
  type DigestState,
  type DigestTargetUser,
  type DigestWindowState,
  type PsychologistActivityCandidate,
  TOP_MENTOR_MAX_POSITION,
  toStringSet,
} from "./state";

export const sendDigestPush = async (
  user: DigestTargetUser,
  params: {
    body: string;
    redirect: string;
    title: string;
    type: DigestKind;
  },
) => {
  const result = await sendWebPushToSubscriptions({
    body: params.body,
    redirect: params.redirect,
    subscriptions: user.notification_subscriptions,
    title: params.title,
  });

  console.log(
    `[WEB NOTIFICATION] digest "${params.type}": ${result.sentCount} enviado(s), ${result.failedCount} falha(s).`,
  );

  return result.sentCount > 0;
};

export const getPatientFavoritePsychologistIds = async (userId: string) => {
  const favorites = await prisma.psychologist_favorite.findMany({
    select: {
      psychologist_id: true,
    },
    where: {
      deleted: false,
      user_id: userId,
    },
  });

  return favorites.map((favorite) => favorite.psychologist_id);
};

export const getPatientFollowedCommunities = async (userId: string) => {
  return prisma.community_member.findMany({
    select: {
      community: {
        select: {
          category: true,
          id: true,
          slug: true,
        },
      },
      community_id: true,
    },
    where: {
      deleted: false,
      user_id: userId,
    },
  });
};

export const getPsychologistActivityCandidates = async (params: {
  favoriteIds: Set<string>;
  followedCommunityIds: Set<string>;
  now: Date;
  since: Date;
}) => {
  const [posts, replies] = await Promise.all([
    prisma.community_post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        author_id: true,
        community: {
          select: {
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
      take: 150,
      where: {
        author: {
          deleted: false,
          role: "psicologo",
        },
        createdAt: {
          gte: params.since,
          lte: params.now,
        },
        deleted: false,
        status: "publicado",
      },
    }),
    prisma.post_reply.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        author_id: true,
        createdAt: true,
        post: {
          select: {
            community: {
              select: {
                slug: true,
              },
            },
            community_id: true,
            id: true,
          },
        },
        upvotes_count: true,
      },
      take: 150,
      where: {
        author: {
          deleted: false,
          role: "psicologo",
        },
        createdAt: {
          gte: params.since,
          lte: params.now,
        },
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
        },
      },
    }),
  ]);

  const candidates: PsychologistActivityCandidate[] = [
    ...posts.map((post) => ({
      authorId: post.author_id,
      communityId: post.community_id,
      communitySlug: post.community.slug,
      createdAt: post.createdAt,
      engagement: post.upvotes_count * 3 + post.replies_count * 2 + post.saves_count * 2,
      isFavorite: params.favoriteIds.has(post.author_id),
      isFollowedCommunity: params.followedCommunityIds.has(post.community_id),
      isTopMentor: false,
      postId: post.id,
    })),
    ...replies.map((reply) => ({
      authorId: reply.author_id,
      communityId: reply.post.community_id,
      communitySlug: reply.post.community.slug,
      createdAt: reply.createdAt,
      engagement: reply.upvotes_count * 3,
      isFavorite: params.favoriteIds.has(reply.author_id),
      isFollowedCommunity: params.followedCommunityIds.has(reply.post.community_id),
      isTopMentor: false,
      postId: reply.post.id,
    })),
  ];

  if (candidates.length === 0) return candidates;

  const communityIds = [...new Set(candidates.map((candidate) => candidate.communityId))];
  for (const communityId of communityIds) {
    const authorIds = [
      ...new Set(
        candidates
          .filter((candidate) => candidate.communityId === communityId)
          .map((candidate) => candidate.authorId),
      ),
    ];
    const rankingSignals = await getCommunityMentorRankingSignals(communityId, authorIds);

    for (const candidate of candidates) {
      if (candidate.communityId !== communityId) continue;

      const signal = rankingSignals.get(candidate.authorId);
      candidate.isTopMentor = Boolean(signal && signal.position <= TOP_MENTOR_MAX_POSITION);
    }
  }

  return candidates;
};

export const scorePsychologistActivity = (candidate: PsychologistActivityCandidate, now: Date) => {
  const recency = Math.max(
    0,
    100 - Math.floor((now.getTime() - candidate.createdAt.getTime()) / 3600000),
  );

  return (
    (candidate.isFavorite ? 10_000 : 0) +
    (candidate.isFollowedCommunity ? 5_000 : 0) +
    (candidate.isTopMentor ? 2_500 : 0) +
    candidate.engagement +
    recency
  );
};

export const getBestPsychologistActivityCandidate = async (
  user: DigestTargetUser,
  since: Date,
  now: Date,
) => {
  if (!isNotificationEnabled(user.notification_preference?.prefs, "novo_post")) return null;

  const scope = getNewPostAuthorScope(user.notification_preference?.prefs, "paciente");
  if (scope === "patients_only") return null;

  const [favoritePsychologistIds, followedCommunities] = await Promise.all([
    getPatientFavoritePsychologistIds(user.id),
    getPatientFollowedCommunities(user.id),
  ]);
  const favoriteIds = toStringSet(favoritePsychologistIds);
  const followedCommunityIds = toStringSet(
    followedCommunities.map((membership) => membership.community_id),
  );

  let candidates = await getPsychologistActivityCandidates({
    favoriteIds,
    followedCommunityIds,
    now,
    since,
  });

  if (scope === "favorites") {
    candidates = candidates.filter((candidate) => candidate.isFavorite);
  }

  if (candidates.length === 0) return null;

  return candidates.sort((a, b) => {
    const scoreDiff = scorePsychologistActivity(b, now) - scorePsychologistActivity(a, now);
    if (scoreDiff !== 0) return scoreDiff;

    return b.createdAt.getTime() - a.createdAt.getTime();
  })[0];
};

export const buildPsychologistDigestContent = (candidate: PsychologistActivityCandidate) => {
  if (candidate.isFavorite) {
    return {
      body: "Psicólogos que você acompanha publicaram novos conteúdos hoje.",
      title: "Novidades dos seus psicólogos favoritos",
    };
  }

  if (candidate.isTopMentor) {
    return {
      body: "Veja respostas e conteúdos de psicólogos em destaque na Lectum.",
      title: "Top Mentores publicaram novidades",
    };
  }

  return {
    body: "Psicólogos relevantes publicaram conteúdos que podem te interessar hoje.",
    title: "Novidades de psicólogos na Lectum",
  };
};

export const buildPostRedirect = (communitySlug: string, postId: string) =>
  `/comunidades/${communitySlug}/publicacao/${postId}`;

export const markDigestChecked = (
  state: DigestState,
  kind: DigestKind,
  now: Date,
  dateKey: string,
  sent: boolean,
) => {
  const next: DigestWindowState = {
    ...state[kind],
    last_checked_at: now.toISOString(),
  };

  if (sent) {
    next.last_sent_at = now.toISOString();
    next.last_sent_date = dateKey;
  }

  state[kind] = next;
};
