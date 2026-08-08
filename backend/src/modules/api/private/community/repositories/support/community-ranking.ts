import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { buildProfessionalFullDisplayName } from "@/utils/professional-name";
import { isVerifiedProfessionalEntitlement } from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl, type LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  CommunityDetailResponse,
  CommunityDTO,
  CommunityPostSortMetricsDTO,
  CommunityTopMentorsPeriodValue,
} from "../../DTOs/ICommunityDTO";

import {
  authorSelect,
  type CommunityRuleResult,
  type CurrentVote,
  DEFAULT_TOP_MENTORS_LIMIT,
  emptyCommunityPostSortMetrics,
  incrementCommunitySortPeriodMetrics,
  MAX_TOP_MENTORS_LIMIT,
  type PostResult,
  type ProfessionalReplyResult,
  professionalReplyVoteRankingScore,
  resolveCommunitySortPeriodStarts,
  TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  TOP_MENTOR_COMMENT_WEIGHT,
  TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  TOP_MENTOR_DOWNVOTE_WEIGHT,
  TOP_MENTOR_POST_WEIGHT,
  TOP_MENTOR_REMOVED_POST_PENALTY_STEP,
  TOP_MENTOR_REPLY_WEIGHT,
  TOP_MENTOR_SAVE_WEIGHT,
  TOP_MENTOR_SHARE_WEIGHT,
  TOP_MENTOR_UPVOTE_WEIGHT,
} from "./community-feed";

export const toCommunityResponse = (item: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  members_count: number;
  avatar_url: string | null;
  visual_primary_color: string | null;
  visual_primary_dark_color: string | null;
  visual_soft_color: string | null;
  visual_text_color: string | null;
  visual_gradient_color: string | null;
  createdAt: Date;
}): CommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  avatar_url: item.avatar_url,
  visual_primary_color: item.visual_primary_color,
  visual_primary_dark_color: item.visual_primary_dark_color,
  visual_soft_color: item.visual_soft_color,
  visual_text_color: item.visual_text_color,
  visual_gradient_color: item.visual_gradient_color,
  created_at: item.createdAt,
});

export const toCommunityDetailResponse = (
  community: Parameters<typeof toCommunityResponse>[0],
  postsCount: number,
  membershipCreatedAt: Date | null,
  rules: CommunityRuleResult[] = [],
): CommunityDetailResponse => {
  const following = Boolean(membershipCreatedAt);
  const communityDetail = {
    ...toCommunityResponse(community),
    posts_count: postsCount,
    following,
    membership_created_at: membershipCreatedAt,
    rules: rules.map((rule) => ({
      description: rule.description,
      id: rule.id,
      position: rule.position,
      title: rule.title,
    })),
  };

  return {
    community: communityDetail,
    participation: {
      following,
      member_since: membershipCreatedAt,
      can_post: true,
    },
  };
};

export const anonymousDisplayNameForAuthor = (authorId: string) => {
  let hash = 0;

  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

export const isProfessionalVerified = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { source?: string | null }[];
  } | null,
) => isVerifiedProfessionalEntitlement(profile);

export const hasPaidProfessionalEntitlement = (
  profile?: { subscriptions: { id: string }[] } | null,
) => {
  return Boolean(profile?.subscriptions.length);
};

export const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { id: string; source?: string | null }[];
    whatsapp: string | null;
  } | null,
  psychologistName?: string | null,
  psychologistWhatsappName?: string | null,
  source: LectumWhatsappMessageSource = "community_post",
) => {
  return buildLectumWhatsappUrl({
    phone: profile?.whatsapp,
    psychologistName,
    psychologistWhatsappName,
    source,
  });
};

export const buildUserProfessionalDisplayName = (user: {
  name?: string | null;
  psychologist_profile?: {
    professional_first_name?: string | null;
    professional_last_name?: string | null;
  } | null;
}) =>
  buildProfessionalFullDisplayName({
    fallbackName: user.name,
    firstName: user.psychologist_profile?.professional_first_name,
    lastName: user.psychologist_profile?.professional_last_name,
  });

export const mentorBadgeForScore = (
  profile?: {
    cfp_verified_at: Date | null;
    crp_status?: string | null;
    subscriptions: { id: string; source?: string | null }[];
  } | null,
  score = 0,
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;
  if (score >= 80) return "TOP #1 MENTOR";
  if (score >= 65) return "TOP #2 MENTOR";
  if (score >= 50) return "TOP #3 MENTOR";

  return null;
};

export const authorTypeLabel = (
  role?: string | null,
  gender?: string | null,
  anonymous = false,
) => {
  if (role === "psicologo") {
    const normalizedGender = String(gender ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();

    if (normalizedGender.includes("feminino")) return "Psicóloga";
    if (normalizedGender.includes("masculino")) return "Psicólogo";

    return "Psicólogo(a)";
  }

  return anonymous ? "Membro Anônimo" : "Paciente";
};

export const normalizeScope = (value?: string | null) => {
  return value === "following" ? "following" : "all";
};

export const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

export const getPostCurrentVotes = async (userId: string | undefined, postIds: string[]) => {
  if (!userId || postIds.length === 0) return new Map<string, CurrentVote>();

  const votes = await prisma.post_vote.findMany({
    where: {
      user_id: userId,
      deleted: false,
      post_id: {
        in: postIds,
      },
    },
    select: {
      post_id: true,
      value: true,
    },
  });

  return new Map(
    votes
      .filter((vote): vote is { post_id: string; value: number } => Boolean(vote.post_id))
      .map((vote) => [vote.post_id, normalizeVoteValue(vote.value)]),
  );
};

export const getSavedPostIds = async (userId: string | undefined, postIds: string[]) => {
  if (!userId || postIds.length === 0) return new Set<string>();

  const saves = await prisma.post_save.findMany({
    where: {
      user_id: userId,
      deleted: false,
      post_id: {
        in: postIds,
      },
    },
    select: {
      post_id: true,
    },
  });

  return new Set(saves.map((save) => save.post_id));
};

export const getSavedReplyIds = async (userId: string | undefined, replyIds: string[]) => {
  if (!userId || replyIds.length === 0) return new Set<string>();

  const saves = await prisma.post_reply_save.findMany({
    where: {
      user_id: userId,
      deleted: false,
      reply_id: {
        in: replyIds,
      },
    },
    select: {
      reply_id: true,
    },
  });

  return new Set(saves.map((save) => save.reply_id));
};

export const professionalReplyRankingPosition = (
  reply: ProfessionalReplyResult,
  rankingSignals: Awaited<ReturnType<typeof getCommunityMentorRankingSignals>>,
) => rankingSignals.get(reply.author.id)?.position ?? Number.POSITIVE_INFINITY;

export const professionalReplyVideoTieBreakScore = ({
  media_type,
  media_url,
}: Pick<ProfessionalReplyResult, "media_type" | "media_url">) =>
  media_type === "video" && media_url ? 1 : 0;

export const compareProfessionalRepliesForHighlight = (
  a: ProfessionalReplyResult,
  b: ProfessionalReplyResult,
  rankingSignals: Awaited<ReturnType<typeof getCommunityMentorRankingSignals>>,
) => {
  const voteScoreDiff = professionalReplyVoteRankingScore(b) - professionalReplyVoteRankingScore(a);
  if (voteScoreDiff !== 0) return voteScoreDiff;

  const rankingDiff =
    professionalReplyRankingPosition(a, rankingSignals) -
    professionalReplyRankingPosition(b, rankingSignals);
  if (rankingDiff !== 0) return rankingDiff;

  const videoDiff = professionalReplyVideoTieBreakScore(b) - professionalReplyVideoTieBreakScore(a);
  if (videoDiff !== 0) return videoDiff;

  const recencyDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (recencyDiff !== 0) return recencyDiff;

  return b.id.localeCompare(a.id);
};

export const selectHighlightedProfessionalReplies = async (items: PostResult[]) => {
  const repliesByPostId = new Map<string, ProfessionalReplyResult>();
  const itemsByCommunityId = new Map<string, PostResult[]>();

  for (const item of items) {
    if (item.replies.length === 0) continue;

    const communityItems = itemsByCommunityId.get(item.community.id) ?? [];
    communityItems.push(item);
    itemsByCommunityId.set(item.community.id, communityItems);
  }

  for (const [communityId, communityItems] of itemsByCommunityId.entries()) {
    const professionalIds = communityItems.flatMap((item) =>
      item.replies.map((reply) => reply.author.id),
    );
    const rankingSignals = await getCommunityMentorRankingSignals(communityId, professionalIds);

    for (const item of communityItems) {
      const highlightedReply = [...item.replies].sort((a, b) =>
        compareProfessionalRepliesForHighlight(a, b, rankingSignals),
      )[0];

      if (highlightedReply) repliesByPostId.set(item.id, highlightedReply);
    }
  }

  return repliesByPostId;
};

export const getFollowedCommunityIds = async (
  userId: string | undefined,
  communityIds: string[],
) => {
  if (!userId || communityIds.length === 0) return new Set<string>();

  const memberships = await prisma.community_member.findMany({
    where: {
      user_id: userId,
      deleted: false,
      community_id: {
        in: communityIds,
      },
      community: {
        active: true,
        deleted: false,
      },
    },
    select: {
      community_id: true,
    },
  });

  return new Set(memberships.map((membership) => membership.community_id));
};

export const getCommunityPostSortMetrics = async (postIds: string[]) => {
  const metricsByPostId = new Map<string, CommunityPostSortMetricsDTO>(
    postIds.map((postId) => [postId, emptyCommunityPostSortMetrics()]),
  );

  if (postIds.length === 0) return metricsByPostId;

  const periodStarts = resolveCommunitySortPeriodStarts();
  const [upvotes, replies, shares] = await Promise.all([
    prisma.post_vote.findMany({
      where: {
        deleted: false,
        value: 1,
        post_id: {
          in: postIds,
        },
      },
      select: {
        post_id: true,
        createdAt: true,
      },
    }),
    prisma.post_reply.findMany({
      where: {
        deleted: false,
        post_id: {
          in: postIds,
        },
      },
      select: {
        post_id: true,
        createdAt: true,
        upvotes_count: true,
        author: {
          select: authorSelect,
        },
      },
    }),
    prisma.post_share.findMany({
      where: {
        deleted: false,
        post_id: {
          in: postIds,
        },
      },
      select: {
        post_id: true,
      },
    }),
  ]);

  for (const upvote of upvotes) {
    if (!upvote.post_id) continue;

    const metrics = metricsByPostId.get(upvote.post_id);
    if (!metrics) continue;

    incrementCommunitySortPeriodMetrics(metrics.upvotes, upvote.createdAt, periodStarts);
  }

  for (const share of shares) {
    const metrics = metricsByPostId.get(share.post_id);
    if (!metrics) continue;

    metrics.shares_count += 1;
  }

  for (const reply of replies) {
    if (!reply.post_id) continue;

    const metrics = metricsByPostId.get(reply.post_id);
    if (!metrics) continue;

    incrementCommunitySortPeriodMetrics(metrics.comments, reply.createdAt, periodStarts);

    const profile = reply.author.psychologist_profile;
    const isVerifiedPsychologist =
      reply.author.role === "psicologo" && isProfessionalVerified(profile);

    if (!isVerifiedPsychologist) continue;

    metrics.psychologist_replies_count += 1;

    if (mentorBadgeForScore(profile, reply.upvotes_count)) {
      metrics.top_mentor_replies_count += 1;
    }
  }

  return metricsByPostId;
};

export const resolveTopMentorsPeriod = (value?: string | null) => {
  const key: CommunityTopMentorsPeriodValue = value === "90d" || value === "all" ? value : "30d";
  const endAt = new Date();
  const startAt = key === "all" ? null : new Date(endAt);

  if (startAt && key === "30d") startAt.setDate(startAt.getDate() - 30);
  if (startAt && key === "90d") startAt.setDate(startAt.getDate() - 90);

  const labels = {
    "30d": "Últimos 30 dias",
    "90d": "Últimos 90 dias",
    all: "Histórico completo",
  } as const;

  return {
    key,
    label: labels[key],
    start_at: startAt,
    end_at: endAt,
  };
};

export const topMentorsCreatedAtWindow = (period: ReturnType<typeof resolveTopMentorsPeriod>) => {
  const range: Prisma.DateTimeFilter = {
    lte: period.end_at,
  };

  if (period.start_at) range.gte = period.start_at;

  return range;
};

export const normalizeTopMentorsLimit = (limit?: number) => {
  return Math.min(MAX_TOP_MENTORS_LIMIT, Math.max(1, Number(limit || DEFAULT_TOP_MENTORS_LIMIT)));
};

export type TopMentorMutableMetrics = {
  upvotes_received: number;
  downvotes_received: number;
  comments_received: number;
  shares_received: number;
  saves_received: number;
  community_whatsapp_clicks: number;
  posts_published: number;
  reply_coverage_count: number;
  replies_published: number;
  active_days: number;
  removed_posts: number;
  removed_posts_penalty: number;
};

export const emptyTopMentorMetrics = (): TopMentorMutableMetrics => ({
  upvotes_received: 0,
  downvotes_received: 0,
  comments_received: 0,
  shares_received: 0,
  saves_received: 0,
  community_whatsapp_clicks: 0,
  posts_published: 0,
  reply_coverage_count: 0,
  replies_published: 0,
  active_days: 0,
  removed_posts: 0,
  removed_posts_penalty: 0,
});

export const topMentorRemovedPostsPenalty = (removedPosts: number) => {
  return (removedPosts * (removedPosts + 1) * TOP_MENTOR_REMOVED_POST_PENALTY_STEP) / 2;
};

export const topMentorScore = (metrics: TopMentorMutableMetrics) => {
  const positivePoints =
    metrics.upvotes_received * TOP_MENTOR_UPVOTE_WEIGHT +
    metrics.comments_received * TOP_MENTOR_COMMENT_WEIGHT +
    metrics.shares_received * TOP_MENTOR_SHARE_WEIGHT +
    metrics.saves_received * TOP_MENTOR_SAVE_WEIGHT +
    metrics.community_whatsapp_clicks * TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT +
    metrics.posts_published * TOP_MENTOR_POST_WEIGHT +
    metrics.reply_coverage_count * TOP_MENTOR_REPLY_WEIGHT +
    metrics.active_days * TOP_MENTOR_ACTIVE_DAY_WEIGHT;
  const penaltyPoints =
    metrics.downvotes_received * TOP_MENTOR_DOWNVOTE_WEIGHT + metrics.removed_posts_penalty;

  return positivePoints - penaltyPoints;
};

export const hasTopMentorRankingSignal = (metrics: TopMentorMutableMetrics) => {
  return (
    metrics.upvotes_received > 0 ||
    metrics.downvotes_received > 0 ||
    metrics.comments_received > 0 ||
    metrics.shares_received > 0 ||
    metrics.saves_received > 0 ||
    metrics.community_whatsapp_clicks > 0 ||
    metrics.posts_published > 0 ||
    metrics.reply_coverage_count > 0 ||
    metrics.replies_published > 0 ||
    metrics.active_days > 0 ||
    metrics.removed_posts > 0
  );
};

export const topMentorsFormula = () => ({
  upvote_weight: TOP_MENTOR_UPVOTE_WEIGHT,
  downvote_weight: TOP_MENTOR_DOWNVOTE_WEIGHT,
  comment_weight: TOP_MENTOR_COMMENT_WEIGHT,
  share_weight: TOP_MENTOR_SHARE_WEIGHT,
  save_weight: TOP_MENTOR_SAVE_WEIGHT,
  community_whatsapp_weight: TOP_MENTOR_COMMUNITY_WHATSAPP_WEIGHT,
  post_weight: TOP_MENTOR_POST_WEIGHT,
  reply_weight: TOP_MENTOR_REPLY_WEIGHT,
  reply_coverage_weight: TOP_MENTOR_REPLY_WEIGHT,
  active_day_weight: TOP_MENTOR_ACTIVE_DAY_WEIGHT,
  removed_post_penalty_step: TOP_MENTOR_REMOVED_POST_PENALTY_STEP,
  description:
    "score = (upvotes × 2) - (downvotes × 3) + (comentários recebidos × 5) + (compartilhamentos × 8) + (salvamentos × 2) + (cliques WhatsApp da comunidade × 6) + (posts publicados × 1) + (cobertura de respostas × 3) + (dias ativos × 1) - penalidade progressiva por posts removidos",
  notes: [
    "Cobertura de respostas conta no máximo 1 ponto de cobertura por post de paciente respondido pelo psicólogo no período.",
    "Upvotes, downvotes, salvamentos e compartilhamentos feitos pelo próprio psicólogo no próprio conteúdo não entram no score.",
    "Compartilhamentos consideram posts e respostas compartilhados; cliques no WhatsApp só entram quando a comunidade de origem pode ser identificada.",
  ],
});

export const topMentorBadgeForPosition = (position: number) => {
  if (position === 1) return "TOP #1 MENTOR";
  if (position === 2) return "TOP #2 MENTOR";
  if (position === 3) return "TOP #3 MENTOR";

  return null;
};
