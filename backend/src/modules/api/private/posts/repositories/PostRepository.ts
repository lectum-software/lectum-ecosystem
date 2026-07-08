import type { Prisma } from "@/external/generated/prisma/client";
import prisma, { type ORM } from "@/infra/database/prisma";
import { canAttachCommunityMedia } from "@/utils/community-media-entitlement";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  activeProfessionalCourtesyEntitlementWhere,
  activeProfessionalEntitlementWhere,
} from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl, type LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  IPostCreateReplyDTO,
  IPostDeleteDTO,
  IPostMineDTO,
  IPostMuteDTO,
  IPostRepliesDTO,
  IPostReplyDeleteDTO,
  IPostReplySaveDTO,
  IPostReplyThreadDTO,
  IPostReportDTO,
  IPostSaveDTO,
  IPostSavedDTO,
  IPostShareDTO,
  IPostShowDTO,
  IPostUpdateDTO,
  IPostUpdateReplyDTO,
  IPostVoteDTO,
  PostAuthorDTO,
  PostCommunityDTO,
  PostDeleteResponse,
  PostDetailDTO,
  PostDetailResponse,
  PostListItemDTO,
  PostListPostDTO,
  PostListResponse,
  PostMutationResult,
  PostMuteResponse,
  PostProfessionalReplyDTO,
  PostRepliesResponse,
  PostReplyDeleteResponse,
  PostReplyDTO,
  PostReportResponse,
  PostSaveResponse,
  PostShareResponse,
  PostVoteResponse,
} from "../DTOs/IPostDTO";
import type { IPostRepository } from "./interfaces/IPostRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const INLINE_REPLY_DESCENDANT_DEPTH = 4;
const REPLY_DOWNVOTE_RANKING_WEIGHT = 0.6;
const SHARE_ANTI_SPAM_WINDOW_MS = 60 * 60 * 1000;

const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  createdAt: true,
} satisfies Prisma.communitySelect;

const professionalProfileSelect = {
  gender: true,
  crp: true,
  whatsapp: true,
  cfp_verified_at: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
      source: true,
    },
  },
} satisfies Prisma.psychologist_profileSelect;

const authorSelect = {
  id: true,
  deleted: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

const postSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  media_items: {
    where: {
      deleted: false,
    },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      media_url: true,
      media_type: true,
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
} satisfies Prisma.community_postSelect;

const listPostSelect = {
  ...postSelect,
  replies: {
    where: {
      deleted: false,
      parent_reply_id: null,
      author: {
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            OR: [
              {
                cfp_verified_at: {
                  not: null,
                },
              },
              {
                subscriptions: {
                  some: activeProfessionalCourtesyEntitlementWhere(),
                },
              },
            ],
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

const replyBaseSelect = {
  id: true,
  title: true,
  content: true,
  media_url: true,
  media_type: true,
  upvotes_count: true,
  downvotes_count: true,
  createdAt: true,
  edited_at: true,
  parent_reply_id: true,
  author: {
    select: authorSelect,
  },
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.post_replySelect;

type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;
type ListPostResult = Prisma.community_postGetPayload<{ select: typeof listPostSelect }>;
type AuthorResult = PostResult["author"];
type ProfessionalReplyResult = ListPostResult["replies"][number];
type ReplyBaseResult = Prisma.post_replyGetPayload<{ select: typeof replyBaseSelect }>;
type ReplyTreeResult = ReplyBaseResult & { replies: ReplyTreeResult[] };
type CurrentVote = 1 | -1 | null;
type MentorRankingSignals = Awaited<ReturnType<typeof getCommunityMentorRankingSignals>>;
type ReplyAuthorContext = {
  postAnonymous: boolean;
  postAuthorId: string;
};

const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const normalizeListType = (value?: string | null): "all" | "posts" | "replies" => {
  if (value === "posts" || value === "replies") return value;

  return "all";
};

const toPaginatedListResponse = (
  data: PostListItemDTO[],
  page: number,
  limit: number,
  count: number,
): PostListResponse => ({
  data,
  items: data,
  page,
  pages: Math.ceil(count / limit),
  count,
  total: count,
  limit,
});

const toCommunityResponse = (
  item: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    category: string | null;
    members_count: number;
    createdAt: Date;
  },
  following?: boolean,
): PostCommunityDTO => ({
  id: item.id,
  name: item.name,
  slug: item.slug,
  description: item.description,
  category: item.category,
  members_count: item.members_count,
  created_at: item.createdAt,
  ...(typeof following === "boolean" ? { following } : {}),
});

const anonymousDisplayNameForAuthor = (authorId: string) => {
  let hash = 0;

  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

const isProfessionalVerified = (
  profile?: { cfp_verified_at: Date | null; subscriptions: { source?: string | null }[] } | null,
) => {
  return Boolean(
    profile?.cfp_verified_at ||
      profile?.subscriptions.some((subscription) => subscription.source === "admin_grant"),
  );
};

const hasPaidProfessionalEntitlement = (profile?: { subscriptions: { id: string }[] } | null) => {
  return Boolean(profile?.subscriptions.length);
};

const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    subscriptions: { id: string; source?: string | null }[];
    whatsapp: string | null;
  } | null,
  psychologistName?: string | null,
  source: LectumWhatsappMessageSource = "community_post",
) => {
  return buildLectumWhatsappUrl({
    phone: profile?.whatsapp,
    psychologistName,
    source,
  });
};

const mentorBadgeForScore = (
  profile?: {
    cfp_verified_at: Date | null;
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

const authorTypeLabel = (role?: string | null, gender?: string | null, anonymous = false) => {
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

const toAuthorResponse = (
  author: AuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
  whatsappMessageSource: LectumWhatsappMessageSource = "community_post",
): PostAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const isDeletedAuthor = Boolean(author.deleted);
  const shouldMaskAuthor = !isPsychologist && anonymous;
  const shouldHideIdentity = isDeletedAuthor || shouldMaskAuthor;
  const deletedName = isPsychologist ? "Psicólogo Excluído" : "Membro Excluído";
  const displayName = isPsychologist
    ? normalizeProfessionalDisplayName(author.name) || author.name
    : author.name;

  return {
    id: author.id,
    name: isDeletedAuthor
      ? deletedName
      : shouldMaskAuthor
        ? (anonymousDisplayName ?? "Membro Anônimo")
        : displayName,
    avatar: shouldHideIdentity ? null : author.avatar,
    role: author.role,
    type_label: isDeletedAuthor
      ? isPsychologist
        ? "Psicólogo"
        : "Paciente"
      : authorTypeLabel(author.role, profile?.gender, anonymous),
    anonymous: shouldMaskAuthor,
    crp: isPsychologist && !isDeletedAuthor ? (profile?.crp ?? null) : null,
    verified: isPsychologist && !isDeletedAuthor && isProfessionalVerified(profile),
    featured_badge:
      isPsychologist && !isDeletedAuthor ? mentorBadgeForScore(profile, mentorScore) : null,
    whatsapp_url:
      isPsychologist && !isDeletedAuthor
        ? buildProfessionalWhatsappUrl(profile, displayName, whatsappMessageSource)
        : null,
  };
};

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const normalizeShareChannel = (value?: string | null): "clipboard" | "web_share" =>
  value === "clipboard" ? "clipboard" : "web_share";

const getDeviceId = (headers?: Record<string, string | string[] | undefined>) => {
  const raw = headers?.["x-device"];

  return Array.isArray(raw) ? raw[0] : raw;
};

const toPostMediaItemsResponse = (
  item: Pick<PostResult, "media_items" | "media_type" | "media_url">,
): PostDetailDTO["media_items"] => {
  const storedItems = item.media_items
    .filter((mediaItem) => mediaItem.media_url && mediaItem.media_type)
    .map((mediaItem) => {
      const mediaType: "image" | "video" = mediaItem.media_type === "video" ? "video" : "image";

      return {
        id: mediaItem.id,
        media_url: mediaItem.media_url,
        media_type: mediaType,
        position: mediaItem.position,
      };
    });

  if (storedItems.length > 0) return storedItems;

  if (!item.media_url || (item.media_type !== "image" && item.media_type !== "video")) return [];

  return [
    {
      id: null,
      media_url: item.media_url,
      media_type: item.media_type,
      position: 0,
    },
  ];
};

const toPostResponse = (
  item: PostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  communityFollowing?: boolean,
  mutedByCurrentUser = false,
  hasPsychologistReply = false,
): PostDetailDTO => {
  const responseCommunity = toCommunityResponse(item.community, communityFollowing);
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForAuthor(item.author.id) : undefined,
  );

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    anonymous,
    status: item.status,
    upvotes_count: item.upvotes_count,
    downvotes_count: item.downvotes_count,
    replies_count: item.replies_count,
    saves_count: item.saves_count,
    created_at: item.createdAt,
    edited_at: item.edited_at,
    tags: responseCommunity.category ? [responseCommunity.category] : [],
    featured_badge: author.featured_badge,
    media_url: item.media_url,
    media_type: item.media_type,
    media_items: toPostMediaItemsResponse(item),
    current_user_vote: currentUserVote,
    saved,
    muted_by_current_user: mutedByCurrentUser,
    has_psychologist_reply: hasPsychologistReply,
    community: responseCommunity,
    author,
  };
};

const toHighlightedProfessionalReply = (
  reply?: ProfessionalReplyResult,
  savedReplyIds?: Set<string>,
): PostProfessionalReplyDTO | null => {
  if (!reply) return null;

  const author = toAuthorResponse(
    reply.author,
    reply.upvotes_count,
    false,
    undefined,
    "community_reply",
  );
  if (!author.verified) return null;

  return {
    id: reply.id,
    title: reply.title,
    content: reply.content,
    media_url: reply.media_url,
    media_type: reply.media_type,
    upvotes_count: reply.upvotes_count,
    created_at: reply.createdAt,
    edited_at: reply.edited_at,
    parent_reply_id: reply.parent_reply_id,
    parent_content: reply.parent_reply?.content ?? null,
    saved: savedReplyIds?.has(reply.id) ?? false,
    author,
  };
};

const professionalReplyPreviewScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<ProfessionalReplyResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

const professionalReplyVideoTieBreakScore = ({
  media_type,
  media_url,
}: Pick<ProfessionalReplyResult, "media_type" | "media_url">) =>
  media_type === "video" && media_url ? 1 : 0;

const selectHighlightedListProfessionalReply = (replies: ProfessionalReplyResult[]) =>
  [...replies].sort((a, b) => {
    const scoreDiff = professionalReplyPreviewScore(b) - professionalReplyPreviewScore(a);
    if (scoreDiff !== 0) return scoreDiff;

    const videoDiff =
      professionalReplyVideoTieBreakScore(b) - professionalReplyVideoTieBreakScore(a);
    if (videoDiff !== 0) return videoDiff;

    const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (dateDiff !== 0) return dateDiff;

    return b.id.localeCompare(a.id);
  })[0];

const toListPostResponse = (
  item: ListPostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  savedReplyIds?: Set<string>,
  mutedByCurrentUser = false,
  hasPsychologistReply = false,
): PostListPostDTO => ({
  ...toPostResponse(
    item,
    currentUserVote,
    saved,
    undefined,
    mutedByCurrentUser,
    hasPsychologistReply,
  ),
  highlighted_professional_reply: toHighlightedProfessionalReply(
    selectHighlightedListProfessionalReply(item.replies),
    savedReplyIds,
  ),
});

const toReplyResponse = (
  item: ReplyBaseResult | ReplyTreeResult,
  currentVotes: Map<string, CurrentVote>,
  savedReplyIds?: Set<string>,
  authorContext?: ReplyAuthorContext,
): PostReplyDTO => {
  const nestedReplies = "replies" in item ? item.replies : [];
  const isPostAuthor = authorContext?.postAuthorId === item.author.id;
  const shouldInheritPostAnonymity = Boolean(
    authorContext?.postAnonymous && isPostAuthor && item.author.role !== "psicologo",
  );

  return {
    id: item.id,
    title: item.title,
    content: item.content,
    media_url: item.media_url,
    media_type: item.media_type,
    upvotes_count: item.upvotes_count,
    downvotes_count: item.downvotes_count,
    replies_count: item._count.replies,
    created_at: item.createdAt,
    edited_at: item.edited_at,
    parent_reply_id: item.parent_reply_id,
    is_post_author: isPostAuthor,
    current_user_vote: currentVotes.get(item.id) ?? null,
    saved: savedReplyIds?.has(item.id) ?? false,
    author: toAuthorResponse(
      item.author,
      item.upvotes_count,
      shouldInheritPostAnonymity,
      shouldInheritPostAnonymity ? anonymousDisplayNameForAuthor(item.author.id) : undefined,
      "community_reply",
    ),
    replies: nestedReplies.map((reply) =>
      toReplyResponse(reply, currentVotes, savedReplyIds, authorContext),
    ),
  };
};

const collectReplyIds = (items: Array<ReplyBaseResult | ReplyTreeResult>) => {
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

const newestFirst = (a: Date, b: Date) => b.getTime() - a.getTime();

const rankingPositionForReply = (item: ReplyBaseResult, rankingSignals: MentorRankingSignals) =>
  rankingSignals.get(item.author.id)?.position ?? Number.POSITIVE_INFINITY;

const replyVoteRankingScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<ReplyBaseResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

const compareReplySiblingsByRelevance = (
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

const sortNestedReplies = <T extends ReplyBaseResult>(
  items: T[],
  rankingSignals: MentorRankingSignals,
) => [...items].sort((a, b) => compareReplySiblingsByRelevance(a, b, rankingSignals));

const buildReplyThread = (
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

const buildReplyTrees = (
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

const loadReplyDescendants = async (
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

const loadFocusedReplyPath = async (
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

const mergeRepliesById = (base: ReplyBaseResult[], extra: ReplyBaseResult[]) => {
  if (extra.length === 0) return base;

  const byId = new Map(base.map((reply) => [reply.id, reply]));

  for (const reply of extra) {
    if (!byId.has(reply.id)) {
      byId.set(reply.id, reply);
    }
  }

  return [...byId.values()];
};

const isVerifiedProfessionalReply = (item: ReplyBaseResult) => {
  const profile = item.author.psychologist_profile;

  return item.author.role === "psicologo" && isProfessionalVerified(profile);
};

const compareProfessionalReplies = (
  a: ReplyBaseResult,
  b: ReplyBaseResult,
  rankingSignals: MentorRankingSignals,
) => compareReplySiblingsByRelevance(a, b, rankingSignals);

const sortRepliesForDisplay = async (communityId: string, items: ReplyBaseResult[]) => {
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

const findPublishedPost = (id: string) => {
  return prisma.community_post.findFirst({
    where: {
      id,
      deleted: false,
      status: "publicado",
      community: {
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

const findPublishedReply = (postId: string, replyId: string) => {
  return prisma.post_reply.findFirst({
    where: {
      id: replyId,
      post_id: postId,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
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

const findRootReplyId = async (postId: string, replyId?: string | null) => {
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

const normalizeReplyMediaType = (value?: string | null): "image" | "video" | null => {
  if (value === "image" || value === "video") return value;

  return null;
};

const isPublicReplyMediaUrl = (value?: string | null) => {
  if (!value) return false;

  try {
    return new URL(value).pathname.startsWith("/public/files/posts/media/");
  } catch (_err) {
    return value.startsWith("/public/files/posts/media/");
  }
};

export class PostRepository implements IPostRepository {
  readonly repository: ORM["community_post"];

  constructor() {
    this.repository = prisma.community_post;
  }

  async exists(id: string): Promise<boolean> {
    const post = await findPublishedPost(id);

    return Boolean(post);
  }

  async canAttachReplyMedia(userId: string): Promise<boolean> {
    return canAttachCommunityMedia(userId);
  }

  async updatePost(data: IPostUpdateDTO): Promise<PostMutationResult<PostDetailResponse["post"]>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    const mediaItemsChangeRequested = Object.hasOwn(data.b, "mediaItems");
    const mediaChangeRequested =
      Object.hasOwn(data.b, "mediaUrl") ||
      Object.hasOwn(data.b, "mediaType") ||
      mediaItemsChangeRequested;
    const updateData: Prisma.community_postUpdateInput = {
      content: data.b.content,
      edited_at: new Date(),
      title: data.b.title,
    };

    if (mediaChangeRequested) {
      updateData.media_url = data.b.mediaUrl ?? null;
      updateData.media_type = data.b.mediaType ?? null;
    }

    if (mediaItemsChangeRequested) {
      const mediaItems = data.b.mediaItems ?? [];
      await prisma.$transaction(async (transaction) => {
        await transaction.community_post.update({
          where: {
            id: post.id,
          },
          data: updateData,
        });
        await transaction.community_post_media.updateMany({
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
          where: {
            deleted: false,
            post_id: post.id,
          },
        });

        if (mediaItems.length > 0) {
          await transaction.community_post_media.createMany({
            data: mediaItems.map((mediaItem, index) => ({
              media_url: mediaItem.mediaUrl.trim(),
              media_type: "image",
              position: typeof mediaItem.position === "number" ? mediaItem.position : index,
              post_id: post.id,
            })),
          });
        }
      });
    } else {
      await this.repository.update({
        where: {
          id: post.id,
        },
        data: updateData,
      });
    }

    const updated = await this.show({
      auth: data.auth,
      p: data.p,
    });

    if (!updated) return { kind: "not_found" };

    return {
      kind: "ok",
      data: updated.post,
    };
  }

  async mine(data: IPostMineDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;

    const [posts, postsCount, replies, repliesCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.community_post.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              community: {
                deleted: false,
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: listPostSelect,
          })
        : Promise.resolve([]),
      shouldLoadPosts
        ? prisma.community_post.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              community: {
                deleted: false,
              },
            },
          })
        : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply.findMany({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  deleted: false,
                },
              },
            },
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              title: true,
              content: true,
              media_url: true,
              media_type: true,
              upvotes_count: true,
              downvotes_count: true,
              createdAt: true,
              edited_at: true,
              parent_reply_id: true,
              author: {
                select: authorSelect,
              },
              _count: {
                select: {
                  replies: {
                    where: {
                      deleted: false,
                    },
                  },
                  saves: {
                    where: {
                      deleted: false,
                    },
                  },
                },
              },
              replies: {
                where: {
                  deleted: false,
                  author_id: {
                    not: data.auth.id!,
                  },
                  author: {
                    role: "psicologo",
                    psychologist_profile: {
                      is: {
                        deleted: false,
                        OR: [
                          {
                            cfp_verified_at: {
                              not: null,
                            },
                          },
                          {
                            subscriptions: {
                              some: activeProfessionalCourtesyEntitlementWhere(),
                            },
                          },
                        ],
                      },
                    },
                  },
                },
                select: {
                  id: true,
                },
                take: 1,
              },
              parent_reply: {
                select: {
                  content: true,
                },
              },
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies
        ? prisma.post_reply.count({
            where: {
              author_id: data.auth.id!,
              deleted: false,
              post: {
                deleted: false,
                status: "publicado",
                community: {
                  deleted: false,
                },
              },
            },
          })
        : Promise.resolve(0),
    ]);
    const postVoteMap = new Map<string, CurrentVote>();
    const replyVoteMap = new Map<string, CurrentVote>();
    const savedPostIds = new Set<string>();
    const savedReplyIds = new Set<string>();
    const postIds = posts.map((post) => post.id);
    const replyIds = replies.map((reply) => reply.id);
    const contextPostIds = [...new Set([...postIds, ...replies.map((reply) => reply.post.id)])];

    if (postIds.length > 0 || replyIds.length > 0) {
      const [postVotes, replyVotes, postSaves, replySaves] = await Promise.all([
        postIds.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postIds,
                },
              },
              select: {
                post_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        replyIds.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replyIds,
                },
              },
              select: {
                reply_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        postIds.length > 0
          ? prisma.post_save.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postIds,
                },
              },
              select: {
                post_id: true,
              },
            })
          : Promise.resolve([]),
        replyIds.length > 0
          ? prisma.post_reply_save.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replyIds,
                },
              },
              select: {
                reply_id: true,
              },
            })
          : Promise.resolve([]),
      ]);

      for (const vote of postVotes) {
        if (vote.post_id) {
          postVoteMap.set(vote.post_id, normalizeVoteValue(vote.value));
        }
      }

      for (const vote of replyVotes) {
        if (vote.reply_id) {
          replyVoteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
        }
      }

      for (const save of postSaves) {
        if (save.post_id) {
          savedPostIds.add(save.post_id);
        }
      }

      for (const save of replySaves) {
        if (save.reply_id) {
          savedReplyIds.add(save.reply_id);
        }
      }
    }

    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(data.auth.id!, contextPostIds),
      getPostIdsWithPsychologistReplies(contextPostIds),
    ]);

    const postItems = posts.map<PostListItemDTO>((post) => ({
      id: post.id,
      type: "post",
      created_at: post.createdAt,
      saved_at: null,
      status: post.status,
      saved: savedPostIds.has(post.id),
      post: toListPostResponse(
        post,
        postVoteMap.get(post.id) ?? null,
        savedPostIds.has(post.id),
        savedReplyIds,
        mutedPostIds.has(post.id),
        postsWithPsychologistReplies.has(post.id),
      ),
      reply: null,
    }));
    const replyItems = replies.map<PostListItemDTO>((reply) => ({
      id: reply.id,
      type: "reply",
      created_at: reply.createdAt,
      saved_at: null,
      status: "publicado",
      saved: savedReplyIds.has(reply.id),
      post: toListPostResponse(
        reply.post,
        null,
        false,
        undefined,
        mutedPostIds.has(reply.post.id),
        postsWithPsychologistReplies.has(reply.post.id),
      ),
      reply: {
        id: reply.id,
        title: reply.title,
        content: reply.content,
        media_url: reply.media_url,
        media_type: reply.media_type,
        upvotes_count: reply.upvotes_count,
        downvotes_count: reply.downvotes_count,
        saves_count: reply._count.saves,
        replies_received_count: reply._count.replies,
        has_verified_professional_reply: reply.replies.length > 0,
        created_at: reply.createdAt,
        edited_at: reply.edited_at,
        parent_reply_id: reply.parent_reply_id,
        parent_content: reply.parent_reply?.content ?? null,
        current_user_vote: replyVoteMap.get(reply.id) ?? null,
        saved: savedReplyIds.has(reply.id),
        author: toAuthorResponse(
          reply.author,
          reply.upvotes_count,
          false,
          undefined,
          "community_reply",
        ),
      },
    }));
    const merged =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const createdAtDiff =
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              if (createdAtDiff !== 0) return createdAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postsCount + repliesCount;

    return toPaginatedListResponse(merged, pagination.page, pagination.limit, count);
  }

  async saved(data: IPostSavedDTO): Promise<PostListResponse> {
    const pagination = normalizePagination(data.q);
    const type = normalizeListType(data.q.type);
    const shouldLoadPosts = type === "all" || type === "posts";
    const shouldLoadReplies = type === "all" || type === "replies";
    const take = type === "all" ? pagination.skip + pagination.limit : pagination.limit;
    const skip = type === "all" ? 0 : pagination.skip;
    const postWhere: Prisma.post_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    };
    const replyWhere: Prisma.post_reply_saveWhereInput = {
      user_id: data.auth.id!,
      deleted: false,
      reply: {
        deleted: false,
        post: {
          deleted: false,
          status: "publicado",
          community: {
            deleted: false,
          },
        },
      },
    };
    const [postSaves, postCount, replySaves, replyCount] = await Promise.all([
      shouldLoadPosts
        ? prisma.post_save.findMany({
            where: postWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              post: {
                select: listPostSelect,
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadPosts ? prisma.post_save.count({ where: postWhere }) : Promise.resolve(0),
      shouldLoadReplies
        ? prisma.post_reply_save.findMany({
            where: replyWhere,
            take,
            skip,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              createdAt: true,
              reply: {
                select: {
                  id: true,
                  title: true,
                  content: true,
                  media_url: true,
                  media_type: true,
                  upvotes_count: true,
                  downvotes_count: true,
                  createdAt: true,
                  edited_at: true,
                  parent_reply_id: true,
                  author: {
                    select: authorSelect,
                  },
                  _count: {
                    select: {
                      replies: {
                        where: {
                          deleted: false,
                        },
                      },
                      saves: {
                        where: {
                          deleted: false,
                        },
                      },
                    },
                  },
                  replies: {
                    where: {
                      deleted: false,
                      author: {
                        role: "psicologo",
                        psychologist_profile: {
                          is: {
                            deleted: false,
                            OR: [
                              {
                                cfp_verified_at: {
                                  not: null,
                                },
                              },
                              {
                                subscriptions: {
                                  some: activeProfessionalCourtesyEntitlementWhere(),
                                },
                              },
                            ],
                          },
                        },
                      },
                    },
                    select: {
                      id: true,
                    },
                    take: 1,
                  },
                  parent_reply: {
                    select: {
                      content: true,
                    },
                  },
                  post: {
                    select: listPostSelect,
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      shouldLoadReplies ? prisma.post_reply_save.count({ where: replyWhere }) : Promise.resolve(0),
    ]);
    const postVoteMap = new Map<string, CurrentVote>();
    const replyVoteMap = new Map<string, CurrentVote>();

    if (postSaves.length > 0 || replySaves.length > 0) {
      const [postVotes, replyVotes] = await Promise.all([
        postSaves.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                post_id: {
                  in: postSaves.map((item) => item.post.id),
                },
              },
              select: {
                post_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
        replySaves.length > 0
          ? prisma.post_vote.findMany({
              where: {
                user_id: data.auth.id!,
                deleted: false,
                reply_id: {
                  in: replySaves.map((item) => item.reply.id),
                },
              },
              select: {
                reply_id: true,
                value: true,
              },
            })
          : Promise.resolve([]),
      ]);

      for (const vote of postVotes) {
        if (vote.post_id) {
          postVoteMap.set(vote.post_id, normalizeVoteValue(vote.value));
        }
      }

      for (const vote of replyVotes) {
        if (vote.reply_id) {
          replyVoteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
        }
      }
    }

    const contextPostIds = [
      ...new Set([
        ...postSaves.map((item) => item.post.id),
        ...replySaves.map((item) => item.reply.post.id),
      ]),
    ];
    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(data.auth.id!, contextPostIds),
      getPostIdsWithPsychologistReplies(contextPostIds),
    ]);

    const postItems = postSaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "post",
      created_at: item.post.createdAt,
      saved_at: item.createdAt,
      status: item.post.status,
      saved: true,
      post: toListPostResponse(
        item.post,
        postVoteMap.get(item.post.id) ?? null,
        true,
        undefined,
        mutedPostIds.has(item.post.id),
        postsWithPsychologistReplies.has(item.post.id),
      ),
      reply: null,
    }));
    const replyItems = replySaves.map<PostListItemDTO>((item) => ({
      id: item.id,
      type: "reply",
      created_at: item.reply.createdAt,
      saved_at: item.createdAt,
      status: "publicado",
      saved: true,
      post: toListPostResponse(
        item.reply.post,
        null,
        false,
        undefined,
        mutedPostIds.has(item.reply.post.id),
        postsWithPsychologistReplies.has(item.reply.post.id),
      ),
      reply: {
        id: item.reply.id,
        title: item.reply.title,
        content: item.reply.content,
        media_url: item.reply.media_url,
        media_type: item.reply.media_type,
        upvotes_count: item.reply.upvotes_count,
        downvotes_count: item.reply.downvotes_count,
        saves_count: item.reply._count.saves,
        replies_received_count: item.reply._count.replies,
        has_verified_professional_reply: item.reply.replies.length > 0,
        created_at: item.reply.createdAt,
        edited_at: item.reply.edited_at,
        parent_reply_id: item.reply.parent_reply_id,
        parent_content: item.reply.parent_reply?.content ?? null,
        current_user_vote: replyVoteMap.get(item.reply.id) ?? null,
        saved: true,
        author: toAuthorResponse(
          item.reply.author,
          item.reply.upvotes_count,
          false,
          undefined,
          "community_reply",
        ),
      },
    }));
    const responseItems =
      type === "all"
        ? [...postItems, ...replyItems]
            .sort((a, b) => {
              const savedAtDiff =
                new Date(b.saved_at ?? b.created_at).getTime() -
                new Date(a.saved_at ?? a.created_at).getTime();
              if (savedAtDiff !== 0) return savedAtDiff;

              return b.id.localeCompare(a.id);
            })
            .slice(pagination.skip, pagination.skip + pagination.limit)
        : [...postItems, ...replyItems];
    const count = postCount + replyCount;

    return toPaginatedListResponse(responseItems, pagination.page, pagination.limit, count);
  }

  async show(data: IPostShowDTO): Promise<PostDetailResponse | null> {
    const post = await this.repository.findFirst({
      where: {
        id: data.p.id,
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
      select: postSelect,
    });

    if (!post) return null;

    const userId = data.auth?.id;
    const [vote, save, membership, mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      userId
        ? prisma.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
              value: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.post_save.findUnique({
            where: {
              user_id_post_id: {
                user_id: userId,
                post_id: post.id,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
      userId
        ? prisma.community_member.findUnique({
            where: {
              community_id_user_id: {
                community_id: post.community.id,
                user_id: userId,
              },
            },
            select: {
              deleted: true,
            },
          })
        : Promise.resolve(null),
      getMutedPostIds(userId ?? undefined, [post.id]),
      getPostIdsWithPsychologistReplies([post.id]),
    ]);

    return {
      post: toPostResponse(
        post,
        vote && !vote.deleted ? normalizeVoteValue(vote.value) : null,
        Boolean(save && !save.deleted),
        Boolean(membership && !membership.deleted),
        mutedPostIds.has(post.id),
        postsWithPsychologistReplies.has(post.id),
      ),
    };
  }

  async replies(data: IPostRepliesDTO): Promise<PostRepliesResponse | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const pagination = normalizePagination(data.q);
    const where: Prisma.post_replyWhereInput = {
      post_id: post.id,
      parent_reply_id: null,
      deleted: false,
    };

    const [topLevelItems, count] = await Promise.all([
      prisma.post_reply.findMany({
        where,
        orderBy: [{ upvotes_count: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: replyBaseSelect,
      }),
      prisma.post_reply.count({ where }),
    ]);
    const sortedItems = await sortRepliesForDisplay(post.community_id, topLevelItems);
    const focusRootReplyId = await findRootReplyId(post.id, data.q.focusReplyId);
    const focusRootIndex = focusRootReplyId
      ? sortedItems.findIndex((reply) => reply.id === focusRootReplyId)
      : -1;
    const effectivePage =
      focusRootIndex >= 0 ? Math.floor(focusRootIndex / pagination.limit) + 1 : pagination.page;
    const effectiveSkip =
      focusRootIndex >= 0 ? (effectivePage - 1) * pagination.limit : pagination.skip;
    const paginatedTopLevelItems = sortedItems.slice(
      effectiveSkip,
      effectiveSkip + pagination.limit,
    );
    const baseDescendants = await loadReplyDescendants(
      post.id,
      paginatedTopLevelItems.map((reply) => reply.id),
      INLINE_REPLY_DESCENDANT_DEPTH,
    );
    const focusedReplyPath = await loadFocusedReplyPath(
      post.id,
      focusRootReplyId,
      data.q.focusReplyId,
    );
    const descendants = mergeRepliesById(baseDescendants, focusedReplyPath);
    const treeRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      [...paginatedTopLevelItems, ...descendants]
        .filter((reply) => reply.author.role === "psicologo")
        .map((reply) => reply.author.id),
    );
    const items = buildReplyTrees(paginatedTopLevelItems, descendants, treeRankingSignals);

    const replyIds = collectReplyIds(items);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return {
      data: items.map((item) =>
        toReplyResponse(item, voteMap, savedReplyIds, {
          postAnonymous: post.author.role !== "psicologo" && post.anonymous,
          postAuthorId: post.author_id,
        }),
      ),
      page: effectivePage,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }

  async replyThread(data: IPostReplyThreadDTO): Promise<PostReplyDTO | null> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return null;

    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: post.id,
        deleted: false,
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: replyBaseSelect,
    });
    const threadRankingSignals = await getCommunityMentorRankingSignals(
      post.community_id,
      replies.filter((reply) => reply.author.role === "psicologo").map((reply) => reply.author.id),
    );
    const thread = buildReplyThread(data.p.replyId, replies, threadRankingSignals);
    if (!thread) return null;

    const replyIds = collectReplyIds([thread]);
    const userId = data.auth?.id;
    const [votes, saves] =
      replyIds.length > 0 && userId
        ? await Promise.all([
            prisma.post_vote.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
                value: true,
              },
            }),
            prisma.post_reply_save.findMany({
              where: {
                user_id: userId,
                reply_id: {
                  in: replyIds,
                },
                deleted: false,
              },
              select: {
                reply_id: true,
              },
            }),
          ])
        : [[], []];
    const voteMap = new Map<string, CurrentVote>();
    const savedReplyIds = new Set(saves.map((save) => save.reply_id));

    for (const vote of votes) {
      if (vote.reply_id) {
        voteMap.set(vote.reply_id, normalizeVoteValue(vote.value));
      }
    }

    return toReplyResponse(thread, voteMap, savedReplyIds, {
      postAnonymous: post.author.role !== "psicologo" && post.anonymous,
      postAuthorId: post.author_id,
    });
  }

  async createReply(data: IPostCreateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const content = String(data.b.content ?? "").trim();
    const mediaUrl = data.b.mediaUrl?.trim() || null;
    const mediaType = normalizeReplyMediaType(data.b.mediaType);
    const hasMedia = Boolean(mediaUrl || data.b.mediaType);

    if (!content && !hasMedia) {
      return { kind: "invalid_content" };
    }

    if (hasMedia) {
      if (!mediaUrl || !mediaType || !isPublicReplyMediaUrl(mediaUrl)) {
        return { kind: "invalid_media" };
      }

      const canAttachMedia = await this.canAttachReplyMedia(data.auth.id!);
      if (!canAttachMedia) {
        return { kind: "media_not_allowed" };
      }
    }

    if (data.b.parentReplyId) {
      const parent = await prisma.post_reply.findFirst({
        where: {
          id: data.b.parentReplyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!parent) return { kind: "invalid_parent" };
    }

    const reply = await prisma.$transaction(async (transaction) => {
      const created = await transaction.post_reply.create({
        data: {
          post_id: post.id,
          author_id: data.auth.id!,
          parent_reply_id: data.b.parentReplyId || null,
          content,
          media_type: mediaType,
          media_url: mediaUrl,
        },
        select: replyBaseSelect,
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: {
            increment: 1,
          },
        },
      });

      return created;
    });

    return {
      kind: "ok",
      data: toReplyResponse(reply, new Map(), undefined, {
        postAnonymous: post.author.role !== "psicologo" && post.anonymous,
        postAuthorId: post.author_id,
      }),
    };
  }

  async updateReply(data: IPostUpdateReplyDTO): Promise<PostMutationResult<PostReplyDTO>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const reply = await prisma.post_reply.findFirst({
      where: {
        id: data.p.replyId,
        post_id: post.id,
        deleted: false,
      },
      select: {
        id: true,
        author_id: true,
        content: true,
        media_type: true,
        media_url: true,
        author: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!reply) return { kind: "invalid_target" };
    if (reply.author_id !== data.auth.id) return { kind: "forbidden" };

    const mediaChangeRequested =
      Object.hasOwn(data.b, "mediaUrl") || Object.hasOwn(data.b, "mediaType");
    const contentChangeRequested = Object.hasOwn(data.b, "content");
    const content = contentChangeRequested
      ? String(data.b.content ?? "").trim()
      : reply.content.trim();
    const nextMediaUrl = mediaChangeRequested ? (data.b.mediaUrl ?? null) : reply.media_url;
    const nextMediaType = mediaChangeRequested ? (data.b.mediaType ?? null) : reply.media_type;

    if (!content && !nextMediaUrl && !nextMediaType) {
      return { kind: "invalid_content" };
    }

    const updateData: Prisma.post_replyUpdateInput = {
      content,
      edited_at: new Date(),
    };

    if (mediaChangeRequested) {
      updateData.media_url = data.b.mediaUrl ?? null;
      updateData.media_type = data.b.mediaType ?? null;
    }

    const updated = await prisma.post_reply.update({
      where: {
        id: reply.id,
      },
      data: updateData,
      select: replyBaseSelect,
    });

    const [currentVote, currentSave] = await Promise.all([
      prisma.post_vote.findFirst({
        where: {
          user_id: data.auth.id!,
          reply_id: updated.id,
          deleted: false,
        },
        select: {
          value: true,
        },
      }),
      prisma.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: updated.id,
          },
        },
        select: {
          deleted: true,
        },
      }),
    ]);
    const voteMap = new Map<string, CurrentVote>([
      [updated.id, normalizeVoteValue(currentVote?.value)],
    ]);
    const savedReplyIds = new Set<string>();

    if (currentSave && !currentSave.deleted) {
      savedReplyIds.add(updated.id);
    }

    return {
      kind: "ok",
      data: toReplyResponse(updated, voteMap, savedReplyIds, {
        postAnonymous: post.author.role !== "psicologo" && post.anonymous,
        postAuthorId: post.author_id,
      }),
    };
  }

  async report(data: IPostReportDTO): Promise<PostMutationResult<PostReportResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.p.replyId?.trim() || null;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const targetType = replyId ? "reply" : "post";
    const targetId = replyId || post.id;

    const report = await prisma.post_report.upsert({
      where: {
        target_type_target_id_reporter_id: {
          reporter_id: data.auth.id!,
          target_id: targetId,
          target_type: targetType,
        },
      },
      update: {
        deleted: false,
        deletedAt: null,
        description: data.b.description || null,
        post_id: post.id,
        reason: data.b.reason,
        reply_id: replyId,
        status: "pendente",
        target_id: targetId,
        target_type: targetType,
      },
      create: {
        description: data.b.description || null,
        post_id: post.id,
        reason: data.b.reason,
        reply_id: replyId,
        reporter_id: data.auth.id!,
        target_id: targetId,
        target_type: targetType,
      },
      select: {
        id: true,
        post_id: true,
        reply_id: true,
        target_id: true,
        target_type: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    return {
      kind: "ok",
      data: {
        id: report.id,
        post_id: report.post_id,
        reply_id: report.reply_id,
        target_id: report.target_id,
        target_type: report.target_type === "reply" ? "reply" : "post",
        reason: report.reason,
        description: report.description,
        status: report.status,
        created_at: report.createdAt,
      },
    };
  }

  async share(data: IPostShareDTO): Promise<PostMutationResult<PostShareResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.p.replyId?.trim() || data.b.replyId?.trim() || null;
    let targetAuthorId = post.author_id;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          author_id: true,
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };

      targetAuthorId = reply.author_id;
    }

    const actorId = data.auth?.id ?? null;
    const deviceId = getDeviceId(data.headers);
    const targetType = replyId ? "reply" : "post";

    if (actorId && actorId === targetAuthorId) {
      return {
        kind: "ok",
        data: {
          id: "",
          notification_event_id: null,
          post_id: post.id,
          reply_id: replyId,
          shared: false,
          target_type: targetType,
        },
      };
    }

    const actorScope: Prisma.post_shareWhereInput[] = [];
    if (actorId) actorScope.push({ user_id: actorId });
    if (deviceId) actorScope.push({ device_id: deviceId });

    if (actorScope.length > 0) {
      const recent = await prisma.post_share.findFirst({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
        },
        where: {
          OR: actorScope,
          createdAt: {
            gte: new Date(Date.now() - SHARE_ANTI_SPAM_WINDOW_MS),
          },
          deleted: false,
          post_id: post.id,
          reply_id: replyId,
        },
      });

      if (recent) {
        return {
          kind: "ok",
          data: {
            id: recent.id,
            notification_event_id: null,
            post_id: post.id,
            reply_id: replyId,
            shared: false,
            target_type: targetType,
          },
        };
      }
    }

    const share = await prisma.post_share.create({
      data: {
        channel: normalizeShareChannel(data.b.channel),
        device_id: deviceId ?? null,
        post_id: post.id,
        reply_id: replyId,
        target_type: targetType,
        user_id: actorId,
      },
      select: {
        id: true,
      },
    });

    return {
      kind: "ok",
      data: {
        id: share.id,
        notification_event_id: share.id,
        post_id: post.id,
        reply_id: replyId,
        shared: true,
        target_type: targetType,
      },
    };
  }

  async vote(data: IPostVoteDTO): Promise<PostMutationResult<PostVoteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const replyId = data.b.replyId || null;
    const value = data.b.value;

    if (replyId) {
      const reply = await prisma.post_reply.findFirst({
        where: {
          id: replyId,
          post_id: post.id,
          deleted: false,
        },
        select: {
          id: true,
        },
      });

      if (!reply) return { kind: "invalid_target" };
    }

    const response = await prisma.$transaction(async (transaction) => {
      const existing = replyId
        ? await transaction.post_vote.findUnique({
            where: {
              user_id_reply_id: {
                user_id: data.auth.id!,
                reply_id: replyId,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          })
        : await transaction.post_vote.findUnique({
            where: {
              user_id_post_id: {
                user_id: data.auth.id!,
                post_id: post.id,
              },
            },
            select: {
              id: true,
              deleted: true,
              value: true,
            },
          });

      const oldValue = existing && !existing.deleted ? normalizeVoteValue(existing.value) : null;
      const nextValue: CurrentVote = oldValue === value ? null : value;
      const upDelta = (nextValue === 1 ? 1 : 0) - (oldValue === 1 ? 1 : 0);
      const downDelta = (nextValue === -1 ? 1 : 0) - (oldValue === -1 ? 1 : 0);

      if (existing) {
        await transaction.post_vote.update({
          where: {
            id: existing.id,
          },
          data: {
            value,
            deleted: nextValue === null,
            deletedAt: nextValue === null ? new Date() : null,
          },
        });
      } else if (nextValue !== null) {
        await transaction.post_vote.create({
          data: {
            user_id: data.auth.id!,
            post_id: replyId ? null : post.id,
            reply_id: replyId,
            value,
          },
        });
      }

      if (replyId) {
        const updatedReply = await transaction.post_reply.update({
          where: {
            id: replyId,
          },
          data: {
            upvotes_count: {
              increment: upDelta,
            },
            downvotes_count: {
              increment: downDelta,
            },
          },
          select: {
            upvotes_count: true,
            downvotes_count: true,
          },
        });

        return {
          target_type: "reply" as const,
          post_id: post.id,
          reply_id: replyId,
          value: nextValue,
          upvotes_count: updatedReply.upvotes_count,
          downvotes_count: updatedReply.downvotes_count,
        };
      }

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          upvotes_count: {
            increment: upDelta,
          },
          downvotes_count: {
            increment: downDelta,
          },
        },
        select: {
          upvotes_count: true,
          downvotes_count: true,
        },
      });

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        value: nextValue,
        upvotes_count: updatedPost.upvotes_count,
        downvotes_count: updatedPost.downvotes_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async save(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      let saveId = existing?.id ?? null;

      if (existing) {
        if (existing.deleted) {
          const save = await transaction.post_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          });
          saveId = save.id;
        }
      } else {
        const save = await transaction.post_save.create({
          data: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
          select: {
            id: true,
          },
        });
        saveId = save.id;
      }

      const shouldIncrement = !existing || existing.deleted;
      const updatedPost = shouldIncrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                increment: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: true,
        saves_count: updatedPost.saves_count,
        notification_event_id: shouldIncrement ? saveId : null,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsave(data: IPostSaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_save.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const shouldDecrement = Boolean(existing && !existing.deleted && post.saves_count > 0);
      const updatedPost = shouldDecrement
        ? await transaction.community_post.update({
            where: {
              id: post.id,
            },
            data: {
              saves_count: {
                decrement: 1,
              },
            },
            select: {
              saves_count: true,
            },
          })
        : { saves_count: post.saves_count };

      return {
        target_type: "post" as const,
        post_id: post.id,
        reply_id: null,
        saved: false,
        saves_count: updatedPost.saves_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async mute(data: IPostMuteDTO): Promise<PostMutationResult<PostMuteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_notification_mute.findUnique({
        where: {
          user_id_post_id: {
            user_id: data.auth.id!,
            post_id: post.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_notification_mute.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
        return;
      }

      await transaction.post_notification_mute.create({
        data: {
          user_id: data.auth.id!,
          post_id: post.id,
        },
      });
    });

    return {
      kind: "ok",
      data: {
        post_id: post.id,
        muted: true,
      },
    };
  }

  async unmute(data: IPostMuteDTO): Promise<PostMutationResult<PostMuteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    const existing = await prisma.post_notification_mute.findUnique({
      where: {
        user_id_post_id: {
          user_id: data.auth.id!,
          post_id: post.id,
        },
      },
      select: {
        id: true,
        deleted: true,
      },
    });

    if (existing && !existing.deleted) {
      await prisma.post_notification_mute.update({
        where: {
          id: existing.id,
        },
        data: {
          deleted: true,
          deletedAt: new Date(),
        },
      });
    }

    return {
      kind: "ok",
      data: {
        post_id: post.id,
        muted: false,
      },
    };
  }

  async deletePost(data: IPostDeleteDTO): Promise<PostMutationResult<PostDeleteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };
    if (post.author_id !== data.auth.id) return { kind: "forbidden" };

    const now = new Date();
    const response = await prisma.$transaction(async (transaction) => {
      const shouldBlockProfessionalReplies = post.author.role !== "psicologo";
      const professionalRepliesCount = shouldBlockProfessionalReplies
        ? await transaction.post_reply.count({
            where: {
              post_id: post.id,
              deleted: false,
              author: {
                role: "psicologo",
              },
            },
          })
        : 0;

      if (shouldBlockProfessionalReplies && professionalRepliesCount > 0) {
        return null;
      }

      const deletedReplies = await transaction.post_reply.updateMany({
        where: {
          post_id: post.id,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          deleted: true,
          deletedAt: now,
          status: "removido",
        },
      });

      return {
        post_id: post.id,
        deleted: true,
        replies_deleted_count: deletedReplies.count,
      };
    });

    if (!response) return { kind: "professional_replies_block" };

    return {
      kind: "ok",
      data: response,
    };
  }

  async saveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing) {
        if (existing.deleted) {
          await transaction.post_reply_save.update({
            where: {
              id: existing.id,
            },
            data: {
              deleted: false,
              deletedAt: null,
            },
          });
        }
      } else {
        await transaction.post_reply_save.create({
          data: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        });
      }

      const savesCount = await transaction.post_reply_save.count({
        where: {
          reply_id: reply.id,
          deleted: false,
        },
      });

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: true,
        saves_count: savesCount,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async unsaveReply(data: IPostReplySaveDTO): Promise<PostMutationResult<PostSaveResponse>> {
    const reply = await findPublishedReply(data.p.id, data.p.replyId);
    if (!reply) return { kind: "not_found" };

    const response = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.post_reply_save.findUnique({
        where: {
          user_id_reply_id: {
            user_id: data.auth.id!,
            reply_id: reply.id,
          },
        },
        select: {
          id: true,
          deleted: true,
        },
      });

      if (existing && !existing.deleted) {
        await transaction.post_reply_save.update({
          where: {
            id: existing.id,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });
      }

      const savesCount = await transaction.post_reply_save.count({
        where: {
          reply_id: reply.id,
          deleted: false,
        },
      });

      return {
        target_type: "reply" as const,
        post_id: reply.post_id,
        reply_id: reply.id,
        saved: false,
        saves_count: savesCount,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }

  async deleteReply(
    data: IPostReplyDeleteDTO,
  ): Promise<PostMutationResult<PostReplyDeleteResponse>> {
    const post = await findPublishedPost(data.p.id);
    if (!post) return { kind: "not_found" };

    const reply = await prisma.post_reply.findFirst({
      where: {
        id: data.p.replyId,
        post_id: post.id,
        deleted: false,
      },
      select: {
        id: true,
        author_id: true,
        author: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!reply) return { kind: "invalid_target" };
    if (reply.author_id !== data.auth.id) return { kind: "forbidden" };

    const replies = await prisma.post_reply.findMany({
      where: {
        post_id: post.id,
        deleted: false,
      },
      select: {
        id: true,
        parent_reply_id: true,
        author: {
          select: {
            role: true,
          },
        },
      },
    });
    const childrenByParent = new Map<string, string[]>();

    for (const item of replies) {
      if (!item.parent_reply_id) continue;
      const children = childrenByParent.get(item.parent_reply_id) ?? [];
      children.push(item.id);
      childrenByParent.set(item.parent_reply_id, children);
    }

    const replyIds = new Set<string>();
    const stack = [reply.id];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId || replyIds.has(currentId)) continue;

      replyIds.add(currentId);
      for (const childId of childrenByParent.get(currentId) ?? []) {
        stack.push(childId);
      }
    }

    const ids = [...replyIds];
    const shouldBlockProfessionalReplies = reply.author.role !== "psicologo";
    const hasProfessionalDescendant =
      shouldBlockProfessionalReplies &&
      replies.some(
        (item) => item.id !== reply.id && replyIds.has(item.id) && item.author.role === "psicologo",
      );

    if (hasProfessionalDescendant) {
      return { kind: "professional_replies_block" };
    }

    const now = new Date();
    const nextRepliesCount = Math.max(0, post.replies_count - ids.length);

    const response = await prisma.$transaction(async (transaction) => {
      await transaction.post_reply.updateMany({
        where: {
          id: {
            in: ids,
          },
          post_id: post.id,
          deleted: false,
        },
        data: {
          deleted: true,
          deletedAt: now,
        },
      });

      const updatedPost = await transaction.community_post.update({
        where: {
          id: post.id,
        },
        data: {
          replies_count: nextRepliesCount,
        },
        select: {
          replies_count: true,
        },
      });

      return {
        post_id: post.id,
        reply_ids: ids,
        deleted_count: ids.length,
        replies_count: updatedPost.replies_count,
      };
    });

    return {
      kind: "ok",
      data: response,
    };
  }
}
