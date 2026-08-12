import type { Prisma } from "@/external/generated/prisma/client";
import type { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import {
  activeProfessionalEntitlementWhere,
  isVerifiedProfessionalEntitlement,
  verifiedProfessionalProfileWhere,
} from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl, type LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  PostAuthorDTO,
  PostCommunityDTO,
  PostDetailDTO,
  PostListItemDTO,
  PostListPostDTO,
  PostListResponse,
  PostProfessionalReplyDTO,
  PostReplyDTO,
} from "../../DTOs/IPostDTO";

export const DEFAULT_LIMIT = 20;

export const MAX_LIMIT = 50;

// Three descendant hops + the direct comment = four visual layers in the main thread.
export const INLINE_REPLY_DESCENDANT_DEPTH = 3;

export const REPLY_DOWNVOTE_RANKING_WEIGHT = 0.6;

export const SHARE_ANTI_SPAM_WINDOW_MS = 60 * 60 * 1000;

export const communitySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  category: true,
  members_count: true,
  createdAt: true,
} satisfies Prisma.communitySelect;

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
} satisfies Prisma.community_postSelect;

export const listPostSelect = {
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

export const replyBaseSelect = {
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
  author: {
    select: authorSelect,
  },
  _count: {
    select: {
      replies: true,
    },
  },
} satisfies Prisma.post_replySelect;

export type PostResult = Prisma.community_postGetPayload<{ select: typeof postSelect }>;

export type ListPostResult = Prisma.community_postGetPayload<{ select: typeof listPostSelect }>;

export type AuthorResult = PostResult["author"];

export type ProfessionalReplyResult = ListPostResult["replies"][number];

export type ReplyBaseResult = Prisma.post_replyGetPayload<{ select: typeof replyBaseSelect }>;

export type ReplyTreeResult = ReplyBaseResult & { replies: ReplyTreeResult[] };

export type CurrentVote = 1 | -1 | null;

export type MentorRankingSignals = Awaited<ReturnType<typeof getCommunityMentorRankingSignals>>;

export type ReplyAuthorContext = {
  postAnonymous: boolean;
  postAuthorId: string;
};

export const normalizePagination = (query: { page?: number; limit?: number }) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const normalizeListType = (value?: string | null): "all" | "posts" | "replies" => {
  if (value === "posts" || value === "replies") return value;

  return "all";
};

export const toPaginatedListResponse = (
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

export const toCommunityResponse = (
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

export const toAuthorResponse = (
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
    ? buildProfessionalFullDisplayName({
        fallbackName: author.name,
        firstName: profile?.professional_first_name,
        lastName: profile?.professional_last_name,
      })
    : author.name;
  const whatsappDisplayName =
    isPsychologist && !isDeletedAuthor
      ? getProfessionalWhatsappDisplayName({
          fallbackName: displayName,
          firstName: profile?.professional_first_name,
        })
      : null;

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
    whatsapp_name: whatsappDisplayName,
    whatsapp_url:
      isPsychologist && !isDeletedAuthor
        ? buildProfessionalWhatsappUrl(
            profile,
            displayName,
            whatsappDisplayName,
            whatsappMessageSource,
          )
        : null,
  };
};

export const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

export const normalizeShareChannel = (value?: string | null): "clipboard" | "web_share" =>
  value === "clipboard" ? "clipboard" : "web_share";

export const getDeviceId = (headers?: Record<string, string | string[] | undefined>) => {
  const raw = headers?.["x-device"];

  return Array.isArray(raw) ? raw[0] : raw;
};

export const toPostMediaItemsResponse = (
  item: Pick<PostResult, "media_items" | "media_type" | "media_url" | "thumbnail_url">,
): PostDetailDTO["media_items"] => {
  const storedItems = item.media_items
    .filter((mediaItem) => mediaItem.media_url && mediaItem.media_type)
    .map((mediaItem) => {
      const mediaType: "image" | "video" = mediaItem.media_type === "video" ? "video" : "image";

      return {
        id: mediaItem.id,
        media_url: mediaItem.media_url,
        media_type: mediaType,
        thumbnail_url: mediaItem.thumbnail_url,
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
      thumbnail_url: item.thumbnail_url,
      position: 0,
    },
  ];
};

export const toPostResponse = (
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
    thumbnail_url: item.thumbnail_url,
    media_items: toPostMediaItemsResponse(item),
    current_user_vote: currentUserVote,
    saved,
    muted_by_current_user: mutedByCurrentUser,
    has_psychologist_reply: hasPsychologistReply,
    community: responseCommunity,
    author,
  };
};

export const toHighlightedProfessionalReply = (
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
    thumbnail_url: reply.thumbnail_url,
    upvotes_count: reply.upvotes_count,
    created_at: reply.createdAt,
    edited_at: reply.edited_at,
    parent_reply_id: reply.parent_reply_id,
    parent_content: reply.parent_reply?.content ?? null,
    saved: savedReplyIds?.has(reply.id) ?? false,
    author,
  };
};

export const professionalReplyPreviewScore = ({
  downvotes_count,
  upvotes_count,
}: Pick<ProfessionalReplyResult, "downvotes_count" | "upvotes_count">) =>
  upvotes_count - downvotes_count * REPLY_DOWNVOTE_RANKING_WEIGHT;

export const professionalReplyVideoTieBreakScore = ({
  media_type,
  media_url,
}: Pick<ProfessionalReplyResult, "media_type" | "media_url">) =>
  media_type === "video" && media_url ? 1 : 0;

export const selectHighlightedListProfessionalReply = (replies: ProfessionalReplyResult[]) =>
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

export const toListPostResponse = (
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

export const toReplyResponse = (
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
    thumbnail_url: item.thumbnail_url,
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
