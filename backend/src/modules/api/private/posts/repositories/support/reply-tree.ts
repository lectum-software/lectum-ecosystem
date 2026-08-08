import prisma from "@/infra/database/prisma";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";

import {
  isProfessionalVerified,
  type MentorRankingSignals,
  REPLY_DOWNVOTE_RANKING_WEIGHT,
  type ReplyBaseResult,
  type ReplyTreeResult,
  replyBaseSelect,
} from "./post-response";

export const collectReplyIds = (items: Array<ReplyBaseResult | ReplyTreeResult>) => {
  const ids = new Set<string>();

  const visit = (item: ReplyBaseResult | ReplyTreeResult) => {
    ids.add(item.id);

    if ("replies" in item) {
      for (const child of item.replies) {
        visit(child);
      }
    }
  };

  for (const item of items) visit(item);

  return [...ids];
};

export const newestFirst = (a: Date, b: Date) => b.getTime() - a.getTime();

export const rankingPositionForReply = (
  item: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => rankingSignals.get(item.author.id)?.position ?? Number.POSITIVE_INFINITY;

export const replyVoteRankingScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<ReplyBaseResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

export const compareReplySiblingsByRelevance = (
  a: ReplyBaseResult,
  b: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => {
  const voteScoreDiff = replyVoteRankingScore(b) - replyVoteRankingScore(a);
  if (voteScoreDiff !== 0) return voteScoreDiff;

  const aRankingPosition = rankingPositionForReply(a, rankingSignals);
  const bRankingPosition = rankingPositionForReply(b, rankingSignals);
  const hasRankingTieBreaker =
    Number.isFinite(aRankingPosition) || Number.isFinite(bRankingPosition);

  if (hasRankingTieBreaker && aRankingPosition !== bRankingPosition) {
    return aRankingPosition - bRankingPosition;
  }

  const recencyDiff = newestFirst(a.createdAt, b.createdAt);
  if (recencyDiff !== 0) return recencyDiff;

  return b.id.localeCompare(a.id);
};

export const sortNestedReplies = <T extends ReplyBaseResult>(
  items: T[],
  rankingSignals: MentorRankingSignals,
) => [...items].sort((a, b) => compareReplySiblingsByRelevance(a, b, rankingSignals));

export const buildReplyThread = (
  rootId: string,
  replies: ReplyBaseResult[],
  rankingSignals: MentorRankingSignals,
): ReplyTreeResult | null => {
  const byParent = new Map<string | null, ReplyBaseResult[]>();

  for (const reply of replies) {
    const parentId = reply.parent_reply_id ?? null;
    const current = byParent.get(parentId) ?? [];
    current.push(reply);
    byParent.set(parentId, current);
  }

  const build = (reply: ReplyBaseResult): ReplyTreeResult => ({
    ...reply,
    replies: sortNestedReplies(byParent.get(reply.id) ?? [], rankingSignals).map(build),
  });

  const root = replies.find((reply) => reply.id === rootId);

  return root ? build(root) : null;
};

export const buildReplyTrees = (
  roots: ReplyBaseResult[],
  replies: ReplyBaseResult[],
  rankingSignals: MentorRankingSignals,
): ReplyTreeResult[] => {
  const byParent = new Map<string | null, ReplyBaseResult[]>();

  for (const reply of replies) {
    const parentId = reply.parent_reply_id ?? null;
    const current = byParent.get(parentId) ?? [];
    current.push(reply);
    byParent.set(parentId, current);
  }

  const build = (reply: ReplyBaseResult): ReplyTreeResult => ({
    ...reply,
    replies: sortNestedReplies(byParent.get(reply.id) ?? [], rankingSignals).map(build),
  });

  return roots.map(build);
};

export const loadReplyDescendants = async (
  postId: string,
  parentReplyIds: string[],
  maxDepth: number,
): Promise<ReplyBaseResult[]> => {
  const descendants: ReplyBaseResult[] = [];
  let currentParentIds = [...new Set(parentReplyIds)];

  for (let depth = 0; depth < maxDepth && currentParentIds.length > 0; depth += 1) {
    const levelItems = await prisma.post_reply.findMany({
      where: {
        post_id: postId,
        deleted: false,
        parent_reply_id: {
          in: currentParentIds,
        },
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: replyBaseSelect,
    });

    descendants.push(...levelItems);
    currentParentIds = levelItems.map((reply) => reply.id);
  }

  return descendants;
};

export const loadFocusedReplyPath = async (
  postId: string,
  rootReplyId: string | null,
  focusReplyId?: string | null,
): Promise<ReplyBaseResult[]> => {
  const normalizedFocusReplyId = focusReplyId?.trim();
  if (!normalizedFocusReplyId || !rootReplyId || normalizedFocusReplyId === rootReplyId) {
    return [];
  }

  const path: ReplyBaseResult[] = [];
  const visited = new Set<string>();
  let current = await prisma.post_reply.findFirst({
    where: {
      id: normalizedFocusReplyId,
      post_id: postId,
      deleted: false,
    },
    select: replyBaseSelect,
  });

  while (current) {
    if (visited.has(current.id)) return [];

    visited.add(current.id);
    path.push(current);

    if (current.id === rootReplyId) break;
    if (!current.parent_reply_id) return [];

    current = await prisma.post_reply.findFirst({
      where: {
        id: current.parent_reply_id,
        post_id: postId,
        deleted: false,
      },
      select: replyBaseSelect,
    });
  }

  if (!path.some((reply) => reply.id === rootReplyId)) return [];

  return path.filter((reply) => reply.id !== rootReplyId);
};

export const mergeRepliesById = (base: ReplyBaseResult[], extra: ReplyBaseResult[]) => {
  if (extra.length === 0) return base;

  const byId = new Map(base.map((reply) => [reply.id, reply]));

  for (const reply of extra) {
    if (!byId.has(reply.id)) {
      byId.set(reply.id, reply);
    }
  }

  return [...byId.values()];
};

export const isVerifiedProfessionalReply = (item: ReplyBaseResult) => {
  const profile = item.author.psychologist_profile;

  return item.author.role === "psicologo" && isProfessionalVerified(profile);
};

export const compareProfessionalReplies = (
  a: ReplyBaseResult,
  b: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => compareReplySiblingsByRelevance(a, b, rankingSignals);

export const sortRepliesForDisplay = async (communityId: string, items: ReplyBaseResult[]) => {
  const verifiedProfessionalIds = items
    .filter(isVerifiedProfessionalReply)
    .map((item) => item.author.id);
  const rankingSignals = await getCommunityMentorRankingSignals(
    communityId,
    verifiedProfessionalIds,
  );
  const professionalReply = [...items]
    .filter(isVerifiedProfessionalReply)
    .sort((a, b) => compareProfessionalReplies(a, b, rankingSignals))[0];
  const remainingReplies = items
    .filter((item) => item.id !== professionalReply?.id)
    .sort((a, b) => compareReplySiblingsByRelevance(a, b, rankingSignals));

  return professionalReply ? [professionalReply, ...remainingReplies] : remainingReplies;
};

export const findPublishedPost = (id: string) => {
  return prisma.community_post.findFirst({
    where: {
      id,
      deleted: false,
      status: "publicado",
      community: {
        active: true,
        deleted: false,
      },
    },
    select: {
      id: true,
      author_id: true,
      anonymous: true,
      author: {
        select: {
          role: true,
        },
      },
      community_id: true,
      upvotes_count: true,
      downvotes_count: true,
      replies_count: true,
      saves_count: true,
    },
  });
};

export const findPublishedReply = (postId: string, replyId: string) => {
  return prisma.post_reply.findFirst({
    where: {
      id: replyId,
      post_id: postId,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          active: true,
          deleted: false,
        },
      },
    },
    select: {
      id: true,
      post_id: true,
    },
  });
};

export const findRootReplyId = async (postId: string, replyId?: string | null) => {
  const normalizedReplyId = replyId?.trim();
  if (!normalizedReplyId) return null;

  const visited = new Set<string>();
  let current = await prisma.post_reply.findFirst({
    where: {
      id: normalizedReplyId,
      post_id: postId,
      deleted: false,
    },
    select: {
      id: true,
      parent_reply_id: true,
    },
  });

  while (current?.parent_reply_id) {
    if (visited.has(current.id)) return null;

    visited.add(current.id);
    current = await prisma.post_reply.findFirst({
      where: {
        id: current.parent_reply_id,
        post_id: postId,
        deleted: false,
      },
      select: {
        id: true,
        parent_reply_id: true,
      },
    });
  }

  return current?.id ?? null;
};

export const normalizeReplyMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

export const isPublicReplyMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};
