import type { Prisma } from "@/external/generated/prisma/client";
import prisma from "@/infra/database/prisma";
import type {
  CommunityAuthorDTO,
  CommunityDTO,
  CommunityPostDTO,
  CommunityProfessionalReplyDTO,
} from "@/modules/api/private/community/DTOs/ICommunityDTO";
import { getCommunityMentorRankingSignals } from "@/utils/community-mentor-ranking";
import { getPostIdsWithPsychologistReplies } from "@/utils/community-post-replies";
import { getMutedPostIds } from "@/utils/post-notification-mute";
import { crpExperienceYears } from "@/utils/professional-experience";
import { activeProfessionalEntitlementWhere } from "@/utils/subscription-entitlement";
import { buildLectumWhatsappUrl, type LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  DirectoryProfileCatalogItem,
  DirectoryPsychologistAcademicFormation,
  DirectoryPsychologistPost,
  DirectoryPsychologistPostsResponse,
  DirectoryPsychologistProfile,
  DirectoryPsychologistReviewsResponse,
  DirectoryPsychologistTopMentorCommunity,
  DirectoryReviewAuthor,
  IProfileListDTO,
  IProfileShowDTO,
} from "../DTOs/IProfileDTO";
import type { IProfileRepository } from "./interfaces/IProfileRepository";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const catalogSelect = {
  id: true,
  name: true,
  slug: true,
};

const communityCardSelect = {
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

const professionalProfileSelect = {
  gender: true,
  crp: true,
  whatsapp: true,
  cfp_verified_at: true,
  subscriptions: {
    where: activeProfessionalEntitlementWhere(),
    select: {
      id: true,
    },
    take: 1,
  },
} satisfies Prisma.psychologist_profileSelect;

const postAuthorSelect = {
  id: true,
  name: true,
  avatar: true,
  role: true,
  psychologist_profile: {
    select: professionalProfileSelect,
  },
} satisfies Prisma.userSelect;

const profilePostSelect = {
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
    select: communityCardSelect,
  },
  author: {
    select: postAuthorSelect,
  },
  replies: {
    where: {
      deleted: false,
      author: {
        role: "psicologo",
        psychologist_profile: {
          is: {
            deleted: false,
            cfp_verified_at: {
              not: null,
            },
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
        select: postAuthorSelect,
      },
    },
  },
} satisfies Prisma.community_postSelect;

const profileReplySelect = {
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
  post: {
    select: profilePostSelect,
  },
  author: {
    select: postAuthorSelect,
  },
} satisfies Prisma.post_replySelect;

const profileReviewSelect = {
  id: true,
  rating: true,
  comment: true,
  response: true,
  responded_at: true,
  createdAt: true,
  author: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.professional_reviewSelect;

type ProfilePostResult = Prisma.community_postGetPayload<{ select: typeof profilePostSelect }>;
type ProfileReplyResult = Prisma.post_replyGetPayload<{ select: typeof profileReplySelect }>;
type ProfileReviewResult = Prisma.professional_reviewGetPayload<{
  select: typeof profileReviewSelect;
}>;
type ProfileAuthorResult = ProfilePostResult["author"];
type ProfileProfessionalReplyResult = ProfilePostResult["replies"][number];
type CurrentVote = 1 | -1 | null;
type MentorBadgeByCommunityId = Map<string, string>;

type ProfilePublicationCandidate =
  | {
      createdAt: Date;
      id: string;
      kind: "post";
      post: ProfilePostResult;
      score: number;
    }
  | {
      createdAt: Date;
      id: string;
      kind: "reply";
      reply: ProfileReplyResult;
      score: number;
    };

const PROFILE_PUBLICATION_UPVOTE_WEIGHT = 3;
const PROFILE_PUBLICATION_DOWNVOTE_WEIGHT = 0.6;
const PROFILE_PUBLICATION_COMMENT_WEIGHT = 5;
const PROFILE_PUBLICATION_PSYCHOLOGIST_REPLY_WEIGHT = 15;
const PROFILE_PUBLICATION_TOP_MENTOR_REPLY_WEIGHT = 25;
const PROFILE_PUBLICATION_SHARE_WEIGHT = 4;
const PROFILE_PUBLICATION_SAVE_WEIGHT = 3;

const selectHighlightedProfileReplyPreview = (replies: ProfileProfessionalReplyResult[]) =>
  [...replies].sort((a, b) => {
    const scoreDiff =
      b.upvotes_count -
      b.downvotes_count * PROFILE_PUBLICATION_DOWNVOTE_WEIGHT -
      (a.upvotes_count - a.downvotes_count * PROFILE_PUBLICATION_DOWNVOTE_WEIGHT);
    if (scoreDiff !== 0) return scoreDiff;

    const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (dateDiff !== 0) return dateDiff;

    return b.id.localeCompare(a.id);
  })[0];

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeLanguages = (value: unknown): string[] => {
  const languages = normalizeStringArray(value);

  return languages.length > 0 ? languages : ["Português"];
};

const trimToNull = (value: unknown) => {
  if (typeof value !== "string") return null;

  return value.trim() || null;
};

const hasRelationItems = (value?: unknown[] | null) => Array.isArray(value) && value.length > 0;

const hasPublishedProfileRequirements = (
  item: {
    name?: string | null;
    psychologist_approaches?: unknown[] | null;
    psychologist_services?: unknown[] | null;
    psychologist_specialties?: unknown[] | null;
  },
  profile: {
    cpf?: string | null;
    crp?: string | null;
    gender?: string | null;
    modality?: string | null;
    professional_address_city?: string | null;
    professional_address_state?: string | null;
    target_audience?: unknown;
    video_url?: string | null;
  },
) => {
  return Boolean(
    trimToNull(item.name) &&
      trimToNull(profile.video_url) &&
      trimToNull(profile.modality) &&
      trimToNull(profile.gender) &&
      trimToNull(profile.cpf) &&
      trimToNull(profile.crp) &&
      trimToNull(profile.professional_address_city) &&
      trimToNull(profile.professional_address_state) &&
      normalizeStringArray(profile.target_audience).length > 0 &&
      hasRelationItems(item.psychologist_specialties) &&
      hasRelationItems(item.psychologist_services) &&
      hasRelationItems(item.psychologist_approaches),
  );
};

const hasAcademicContent = (item: DirectoryPsychologistAcademicFormation) => {
  return Boolean(item.title || item.institution || item.graduation_year);
};

const normalizeAcademicFormation = (item: unknown): DirectoryPsychologistAcademicFormation => {
  if (!item || typeof item !== "object") {
    return { title: null, institution: null, graduation_year: null };
  }

  const academic = item as Record<string, unknown>;

  return {
    title: trimToNull(academic.title),
    institution: trimToNull(academic.institution),
    graduation_year: trimToNull(academic.graduation_year),
  };
};

const normalizeAcademicFormations = (
  value: unknown,
  fallback: DirectoryPsychologistAcademicFormation,
) => {
  if (Array.isArray(value)) {
    return value.map(normalizeAcademicFormation).filter(hasAcademicContent);
  }

  return hasAcademicContent(fallback) ? [fallback] : [];
};

const currentWeekdayValue = () => {
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
  }).format(new Date());

  const normalized = weekday
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

  if (normalized.includes("segunda")) return "segunda";
  if (normalized.includes("terca")) return "terca";
  if (normalized.includes("quarta")) return "quarta";
  if (normalized.includes("quinta")) return "quinta";
  if (normalized.includes("sexta")) return "sexta";
  if (normalized.includes("sabado")) return "sabado";
  return "domingo";
};

const hasAvailableToday = (value: unknown) => {
  return normalizeStringArray(value).includes(currentWeekdayValue());
};

const buildWhatsappUrl = (
  value?: string | null,
  psychologistName?: string | null,
  source: LectumWhatsappMessageSource = "profile",
) => buildLectumWhatsappUrl({ phone: value, psychologistName, source });

const anonymousDisplayNameForAuthor = (authorId: string) => {
  let hash = 0;

  for (const character of authorId) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return `Membro Anônimo #${1000 + (hash % 9000)}`;
};

const isProfessionalVerified = (profile?: { cfp_verified_at: Date | null } | null) => {
  return Boolean(profile?.cfp_verified_at);
};

const hasPaidProfessionalEntitlement = (profile?: { subscriptions: { id: string }[] } | null) => {
  return Boolean(profile?.subscriptions.length);
};

const buildProfessionalWhatsappUrl = (
  profile?: {
    cfp_verified_at: Date | null;
    subscriptions: { id: string }[];
    whatsapp: string | null;
  } | null,
  psychologistName?: string | null,
  source: LectumWhatsappMessageSource = "community_post",
) => {
  if (!isProfessionalVerified(profile) || !hasPaidProfessionalEntitlement(profile)) return null;

  return buildWhatsappUrl(profile?.whatsapp, psychologistName, source);
};

const mentorBadgeForScore = (
  profile?: { cfp_verified_at: Date | null; subscriptions: { id: string }[] } | null,
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

const normalizeVoteValue = (value?: number | null): CurrentVote => {
  if (value === 1 || value === -1) return value;

  return null;
};

const normalizePagination = (query: IProfileListDTO["q"] = {}) => {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(query.limit || DEFAULT_LIMIT)));

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const isCatalogItem = (
  value: DirectoryProfileCatalogItem | null,
): value is DirectoryProfileCatalogItem => {
  return Boolean(value?.id && value.name && value.slug);
};

const toSafeAuthor = (name: string): DirectoryReviewAuthor => {
  const parts = name.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return {
      initials: "P",
      name: "Paciente",
    };
  }

  const firstName = parts[0];
  const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0].toUpperCase()}.` : "";
  const initials =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : firstName.slice(0, 2).toUpperCase();

  return {
    initials,
    name: [firstName, lastInitial].filter(Boolean).join(" "),
  };
};

const toReviewResponse = (item: ProfileReviewResult) => ({
  id: item.id,
  rating: item.rating,
  comment: item.comment,
  response: item.response,
  responded_at: item.responded_at,
  created_at: item.createdAt,
  author: toSafeAuthor(item.author.name),
});

const toCommunityResponse = (item: ProfilePostResult["community"]): CommunityDTO => ({
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

const toPostAuthorResponse = (
  author: ProfileAuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
  featuredBadgeOverride?: string | null,
  forceFeaturedBadgeOverride = false,
  whatsappMessageSource: LectumWhatsappMessageSource = "community_post",
): CommunityAuthorDTO => {
  const profile = author.psychologist_profile;
  const isPsychologist = author.role === "psicologo";
  const shouldMaskAuthor = !isPsychologist && anonymous;
  const featuredBadge =
    (forceFeaturedBadgeOverride
      ? featuredBadgeOverride
      : (featuredBadgeOverride ?? mentorBadgeForScore(profile, mentorScore))) ?? null;

  return {
    id: author.id,
    name: shouldMaskAuthor ? (anonymousDisplayName ?? "Membro Anônimo") : author.name,
    avatar: shouldMaskAuthor ? null : author.avatar,
    role: author.role,
    type_label: authorTypeLabel(author.role, profile?.gender, anonymous),
    crp: isPsychologist ? (profile?.crp ?? null) : null,
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? featuredBadge : null,
    whatsapp_url: isPsychologist
      ? buildProfessionalWhatsappUrl(profile, author.name, whatsappMessageSource)
      : null,
  };
};

const toHighlightedProfessionalReply = (
  reply?: ProfileProfessionalReplyResult | ProfileReplyResult,
  savedReplyIds?: Set<string>,
  requireVerified = true,
  featuredBadgeOverride?: string | null,
  forceFeaturedBadgeOverride = false,
): CommunityProfessionalReplyDTO | null => {
  if (!reply) return null;

  const author = toPostAuthorResponse(
    reply.author,
    reply.upvotes_count,
    false,
    undefined,
    featuredBadgeOverride,
    forceFeaturedBadgeOverride,
    "community_reply",
  );
  if (requireVerified && !author.verified) return null;

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

const toPostMediaItemsResponse = (
  item: Pick<ProfilePostResult, "media_items" | "media_type" | "media_url">,
): CommunityPostDTO["media_items"] => {
  if (item.media_items.length > 0) {
    return item.media_items
      .filter((mediaItem) => mediaItem.media_type === "image" || mediaItem.media_type === "video")
      .map((mediaItem) => {
        const mediaType: "image" | "video" = mediaItem.media_type === "video" ? "video" : "image";

        return {
          id: mediaItem.id,
          media_url: mediaItem.media_url,
          media_type: mediaType,
          position: mediaItem.position,
        };
      });
  }

  if (!item.media_url || (item.media_type !== "image" && item.media_type !== "video")) {
    return [];
  }

  return [
    {
      id: null,
      media_url: item.media_url,
      media_type: item.media_type,
      position: 0,
    },
  ];
};

const rankedMentorBadgeForAuthor = (
  authorId: string,
  profilePsychologistId?: string,
  communityId?: string,
  mentorBadgeByCommunityId?: MentorBadgeByCommunityId,
) => {
  if (!profilePsychologistId || !communityId || !mentorBadgeByCommunityId) {
    return {
      badge: undefined,
      force: false,
    };
  }

  if (authorId !== profilePsychologistId) {
    return {
      badge: undefined,
      force: false,
    };
  }

  return {
    badge: mentorBadgeByCommunityId.get(communityId) ?? null,
    force: true,
  };
};

const toPostResponse = (
  item: ProfilePostResult,
  currentUserVote: CurrentVote,
  saved: boolean,
  savedReplyIds?: Set<string>,
  highlightedReply?: ProfileReplyResult,
  mutedByCurrentUser = false,
  hasPsychologistReply = false,
  profilePsychologistId?: string,
  mentorBadgeByCommunityId?: MentorBadgeByCommunityId,
): CommunityPostDTO => {
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const authorRankedBadge = rankedMentorBadgeForAuthor(
    item.author.id,
    profilePsychologistId,
    item.community.id,
    mentorBadgeByCommunityId,
  );
  const highlightedReplyRankedBadge = highlightedReply
    ? rankedMentorBadgeForAuthor(
        highlightedReply.author.id,
        profilePsychologistId,
        item.community.id,
        mentorBadgeByCommunityId,
      )
    : {
        badge: undefined,
        force: false,
      };
  const author = toPostAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForAuthor(item.author.id) : undefined,
    authorRankedBadge.badge,
    authorRankedBadge.force,
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
    tags: item.community.category ? [item.community.category] : [],
    featured_badge: author.featured_badge,
    media_url: item.media_url,
    media_type: item.media_type,
    media_items: toPostMediaItemsResponse(item),
    current_user_vote: currentUserVote,
    saved,
    muted_by_current_user: mutedByCurrentUser,
    has_psychologist_reply: hasPsychologistReply,
    community: toCommunityResponse(item.community),
    author,
    highlighted_professional_reply:
      toHighlightedProfessionalReply(
        highlightedReply,
        savedReplyIds,
        false,
        highlightedReplyRankedBadge.badge,
        highlightedReplyRankedBadge.force,
      ) ??
      toHighlightedProfessionalReply(
        selectHighlightedProfileReplyPreview(item.replies),
        savedReplyIds,
      ),
  };
};

const profilePublicationScore = ({
  comments,
  downvotes = 0,
  psychologistReplies = 0,
  saves,
  shares = 0,
  topMentorReplies = 0,
  upvotes,
}: {
  comments: number;
  downvotes?: number;
  psychologistReplies?: number;
  saves: number;
  shares?: number;
  topMentorReplies?: number;
  upvotes: number;
}) =>
  upvotes * PROFILE_PUBLICATION_UPVOTE_WEIGHT +
  comments * PROFILE_PUBLICATION_COMMENT_WEIGHT +
  psychologistReplies * PROFILE_PUBLICATION_PSYCHOLOGIST_REPLY_WEIGHT +
  topMentorReplies * PROFILE_PUBLICATION_TOP_MENTOR_REPLY_WEIGHT +
  shares * PROFILE_PUBLICATION_SHARE_WEIGHT +
  saves * PROFILE_PUBLICATION_SAVE_WEIGHT -
  downvotes * PROFILE_PUBLICATION_DOWNVOTE_WEIGHT;

const postEngagementScore = (post: ProfilePostResult) => {
  const verifiedProfessionalReplies = post.replies.filter((reply) =>
    isProfessionalVerified(reply.author.psychologist_profile),
  );
  const topMentorReplies = verifiedProfessionalReplies.filter((reply) =>
    mentorBadgeForScore(reply.author.psychologist_profile, reply.upvotes_count),
  );

  return profilePublicationScore({
    upvotes: post.upvotes_count,
    downvotes: post.downvotes_count,
    comments: post.replies_count,
    saves: post.saves_count,
    psychologistReplies: verifiedProfessionalReplies.length,
    topMentorReplies: topMentorReplies.length,
  });
};

const replyEngagementScore = (
  reply: ProfileReplyResult,
  replyChildrenCountById: Map<string, number>,
  replySavesCountById: Map<string, number>,
) =>
  profilePublicationScore({
    upvotes: reply.upvotes_count,
    downvotes: reply.downvotes_count,
    comments: replyChildrenCountById.get(reply.id) ?? 0,
    saves: replySavesCountById.get(reply.id) ?? 0,
  });

const compareProfilePublicationCandidates = (
  a: ProfilePublicationCandidate,
  b: ProfilePublicationCandidate,
) => {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;

  const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (dateDiff !== 0) return dateDiff;

  return b.id.localeCompare(a.id);
};

const selectHighlightedPublication = (
  posts: ProfilePostResult[],
  replies: ProfileReplyResult[],
  replyChildrenCountById: Map<string, number>,
  replySavesCountById: Map<string, number>,
) => {
  const candidates: ProfilePublicationCandidate[] = [
    ...posts.map((post) => ({
      createdAt: post.createdAt,
      id: post.id,
      kind: "post" as const,
      post,
      score: postEngagementScore(post),
    })),
    ...replies.map((reply) => ({
      createdAt: reply.createdAt,
      id: reply.id,
      kind: "reply" as const,
      reply,
      score: replyEngagementScore(reply, replyChildrenCountById, replySavesCountById),
    })),
  ];

  return candidates.sort(compareProfilePublicationCandidates)[0] ?? null;
};

const publishedProfileWhere = (psychologistId: string): Prisma.userWhereInput => ({
  id: psychologistId,
  role: "psicologo",
  active: true,
  deleted: false,
  psychologist_specialties: {
    some: {
      deleted: false,
      specialty: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_services: {
    some: {
      deleted: false,
      service: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_approaches: {
    some: {
      deleted: false,
      approach: {
        active: true,
        deleted: false,
      },
    },
  },
  psychologist_profile: {
    is: {
      published: true,
      deleted: false,
      video_url: {
        not: null,
      },
      modality: {
        not: null,
      },
      gender: {
        not: null,
      },
      cpf: {
        not: null,
      },
      crp: {
        not: null,
      },
      professional_address_city: {
        not: null,
      },
      professional_address_state: {
        not: null,
      },
      target_audience: {
        not: [],
      },
      NOT: [
        {
          video_url: "",
        },
        {
          modality: "",
        },
        {
          gender: "",
        },
        {
          cpf: "",
        },
        {
          crp: "",
        },
        {
          professional_address_city: "",
        },
        {
          professional_address_state: "",
        },
      ],
    },
  },
});

const topMentorBadgeForPosition = (position: 1 | 2 | 3) => `TOP #${position} MENTOR`;

const topMentorEligiblePsychologistWhere = (): Prisma.userWhereInput => ({
  deleted: false,
  active: true,
  role: "psicologo",
  psychologist_profile: {
    is: {
      deleted: false,
      published: true,
      video_url: {
        not: null,
      },
      NOT: [
        {
          video_url: "",
        },
      ],
      cfp_verified_at: {
        not: null,
      },
      subscriptions: {
        some: activeProfessionalEntitlementWhere(),
      },
    },
  },
});

const getProfileTopMentorCommunities = async (
  psychologistId: string,
): Promise<DirectoryPsychologistTopMentorCommunity[]> => {
  const [eligibleMentors, candidateCommunities] = await Promise.all([
    prisma.user.findMany({
      where: topMentorEligiblePsychologistWhere(),
      select: {
        id: true,
      },
    }),
    prisma.community.findMany({
      where: {
        deleted: false,
        OR: [
          {
            posts: {
              some: {
                author_id: psychologistId,
                deleted: false,
                status: "publicado",
              },
            },
          },
          {
            posts: {
              some: {
                deleted: false,
                status: "publicado",
                replies: {
                  some: {
                    author_id: psychologistId,
                    deleted: false,
                  },
                },
              },
            },
          },
        ],
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: communityCardSelect,
    }),
  ]);
  const eligibleMentorIds = eligibleMentors.map((mentor) => mentor.id);

  if (!eligibleMentorIds.includes(psychologistId) || candidateCommunities.length === 0) {
    return [];
  }

  const rankedCommunities = await Promise.all(
    candidateCommunities.map(async (community) => {
      const ranking = await getCommunityMentorRankingSignals(community.id, eligibleMentorIds);
      const signal = ranking.get(psychologistId);

      if (!signal || signal.position > 3) return null;

      const position = signal.position as 1 | 2 | 3;

      return {
        id: community.id,
        name: community.name,
        slug: community.slug,
        avatar_url: community.avatar_url,
        visual_primary_color: community.visual_primary_color,
        visual_primary_dark_color: community.visual_primary_dark_color,
        visual_soft_color: community.visual_soft_color,
        visual_text_color: community.visual_text_color,
        visual_gradient_color: community.visual_gradient_color,
        position,
        badge: topMentorBadgeForPosition(position),
        score: signal.score,
      };
    }),
  );

  return rankedCommunities
    .filter((community): community is DirectoryPsychologistTopMentorCommunity => community !== null)
    .sort((a, b) => {
      const positionDiff = a.position - b.position;
      if (positionDiff !== 0) return positionDiff;

      const scoreDiff = b.score - a.score;
      if (scoreDiff !== 0) return scoreDiff;

      const nameDiff = a.name.localeCompare(b.name, "pt-BR");
      if (nameDiff !== 0) return nameDiff;

      return a.id.localeCompare(b.id);
    });
};

export class ProfileRepository implements IProfileRepository {
  async hasPublishedProfile(psychologistId: string): Promise<boolean> {
    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(psychologistId),
      select: {
        name: true,
        psychologist_profile: {
          select: {
            video_url: true,
            modality: true,
            gender: true,
            cpf: true,
            crp: true,
            target_audience: true,
            professional_address_city: true,
            professional_address_state: true,
          },
        },
        psychologist_specialties: {
          where: { deleted: false, specialty: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
        psychologist_services: {
          where: { deleted: false, service: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
        psychologist_approaches: {
          where: { deleted: false, approach: { active: true, deleted: false } },
          select: { id: true },
          take: 1,
        },
      },
    });

    return Boolean(
      item?.psychologist_profile &&
        hasPublishedProfileRequirements(item, item.psychologist_profile),
    );
  }

  async show(data: IProfileShowDTO): Promise<DirectoryPsychologistProfile | null> {
    const viewerId = data.auth?.id;
    const viewerRelationWhere = viewerId
      ? {
          user_id: viewerId,
          deleted: false,
        }
      : {
          id: "__anonymous__",
        };

    const item = await prisma.user.findFirst({
      where: publishedProfileWhere(data.p.id),
      select: {
        id: true,
        name: true,
        avatar: true,
        favorited_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        followed_by_patients: {
          where: viewerRelationWhere,
          select: {
            id: true,
          },
          take: 1,
        },
        psychologist_profile: {
          select: {
            headline: true,
            bio: true,
            cover_image_url: true,
            video_url: true,
            video_cover_url: true,
            crp: true,
            cpf: true,
            crp_registration_date: true,
            cfp_verified_at: true,
            gender: true,
            discount_first_session: true,
            social_value: true,
            accepts_insurance: true,
            show_experience_tag: true,
            available_days: true,
            modality: true,
            languages: true,
            target_audience: true,
            academic_title: true,
            academic_institution: true,
            academic_graduation_year: true,
            academic_formations: true,
            professional_address_city: true,
            professional_address_state: true,
            rating_avg: true,
            rating_count: true,
            whatsapp: true,
            subscriptions: {
              where: activeProfessionalEntitlementWhere(),
              select: {
                id: true,
              },
              take: 1,
            },
          },
        },
        psychologist_specialties: {
          where: {
            deleted: false,
            specialty: {
              active: true,
              deleted: false,
            },
          },
          select: {
            specialty: {
              select: catalogSelect,
            },
          },
        },
        psychologist_services: {
          where: {
            deleted: false,
            service: {
              active: true,
              deleted: false,
            },
          },
          select: {
            service: {
              select: catalogSelect,
            },
          },
        },
        psychologist_approaches: {
          where: {
            deleted: false,
            approach: {
              active: true,
              deleted: false,
            },
          },
          select: {
            approach: {
              select: catalogSelect,
            },
          },
        },
      },
    });

    const profile = item?.psychologist_profile;
    if (!item || !profile) return null;
    if (!hasPublishedProfileRequirements(item, profile)) return null;

    return {
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      headline: profile.headline,
      bio: profile.bio,
      cover_image_url: profile.cover_image_url,
      video_url: profile.video_url,
      video_cover_url: profile.video_cover_url,
      crp: profile.crp,
      gender: profile.gender,
      modality: profile.modality,
      languages: normalizeLanguages(profile.languages),
      target_audience: normalizeStringArray(profile.target_audience),
      address_city: profile.professional_address_city,
      address_state: profile.professional_address_state,
      academic_formations: normalizeAcademicFormations(profile.academic_formations, {
        title: trimToNull(profile.academic_title),
        institution: trimToNull(profile.academic_institution),
        graduation_year: trimToNull(profile.academic_graduation_year),
      }),
      rating_avg: profile.rating_avg,
      rating_count: profile.rating_count,
      verified: profile.subscriptions.length > 0,
      available_today: hasAvailableToday(profile.available_days),
      formation_years: crpExperienceYears(profile.crp_registration_date),
      discount_first_session: profile.discount_first_session,
      social_value: profile.social_value,
      accepts_insurance: profile.accepts_insurance,
      show_experience_tag: profile.show_experience_tag,
      whatsapp_url: buildWhatsappUrl(profile.whatsapp, item.name),
      favorited: item.favorited_by_patients.length > 0,
      followed: item.followed_by_patients.length > 0,
      whatsapp_available: Boolean(profile.whatsapp),
      specialties: item.psychologist_specialties
        .map(({ specialty }) => specialty)
        .filter(isCatalogItem),
      services: item.psychologist_services.map(({ service }) => service).filter(isCatalogItem),
      approaches: item.psychologist_approaches
        .map(({ approach }) => approach)
        .filter(isCatalogItem),
    };
  }

  async posts(data: IProfileListDTO): Promise<DirectoryPsychologistPostsResponse> {
    const pagination = normalizePagination(data.q);
    const postsWhere: Prisma.community_postWhereInput = {
      author_id: data.p.id,
      deleted: false,
      status: "publicado",
      community: {
        deleted: false,
      },
    };
    const repliesWhere: Prisma.post_replyWhereInput = {
      author_id: data.p.id,
      deleted: false,
      post: {
        deleted: false,
        status: "publicado",
        community: {
          deleted: false,
        },
      },
    };
    const [posts, postsCount, replies, repliesCount, topMentorCommunities] = await Promise.all([
      prisma.community_post.findMany({
        where: postsWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profilePostSelect,
      }),
      prisma.community_post.count({ where: postsWhere }),
      prisma.post_reply.findMany({
        where: repliesWhere,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profileReplySelect,
      }),
      prisma.post_reply.count({ where: repliesWhere }),
      getProfileTopMentorCommunities(data.p.id),
    ]);
    const mentorBadgeByCommunityId: MentorBadgeByCommunityId = new Map(
      topMentorCommunities.map((community) => [community.id, community.badge]),
    );
    const count = postsCount + repliesCount;
    const allReplyIds = replies.map((reply) => reply.id);
    const [replyChildrenCountRows, replySavesCountRows] = allReplyIds.length
      ? await Promise.all([
          prisma.post_reply.groupBy({
            by: ["parent_reply_id"],
            where: {
              deleted: false,
              parent_reply_id: {
                in: allReplyIds,
              },
            },
            _count: {
              parent_reply_id: true,
            },
          }),
          prisma.post_reply_save.groupBy({
            by: ["reply_id"],
            where: {
              deleted: false,
              reply_id: {
                in: allReplyIds,
              },
            },
            _count: {
              reply_id: true,
            },
          }),
        ])
      : [[], []];
    const replyChildrenCountById = new Map(
      replyChildrenCountRows.flatMap((row) =>
        row.parent_reply_id ? [[row.parent_reply_id, row._count.parent_reply_id]] : [],
      ),
    );
    const replySavesCountById = new Map(
      replySavesCountRows.map((row) => [row.reply_id, row._count.reply_id]),
    );
    const highlightedPublication = selectHighlightedPublication(
      posts,
      replies,
      replyChildrenCountById,
      replySavesCountById,
    );
    const mergedItems = [
      ...posts.map((post) => ({ createdAt: post.createdAt, kind: "post" as const, post })),
      ...replies.map((reply) => ({ createdAt: reply.createdAt, kind: "reply" as const, reply })),
    ]
      .sort((a, b) => {
        const byDate = b.createdAt.getTime() - a.createdAt.getTime();
        if (byDate !== 0) return byDate;

        const aId = a.kind === "post" ? a.post.id : a.reply.id;
        const bId = b.kind === "post" ? b.post.id : b.reply.id;

        return bId.localeCompare(aId);
      })
      .slice(pagination.skip, pagination.skip + pagination.limit);
    const postIds = Array.from(
      new Set(
        [
          ...mergedItems.map((item) => (item.kind === "post" ? item.post.id : item.reply.post.id)),
          highlightedPublication?.kind === "post"
            ? highlightedPublication.post.id
            : highlightedPublication?.reply.post.id,
        ].filter((postId): postId is string => Boolean(postId)),
      ),
    );
    const replyIds = Array.from(
      new Set(
        [
          ...mergedItems.flatMap((item) => (item.kind === "reply" ? [item.reply.id] : [])),
          highlightedPublication?.kind === "reply" ? highlightedPublication.reply.id : null,
        ].filter((replyId): replyId is string => Boolean(replyId)),
      ),
    );
    const authId = data.auth?.id;
    const [votes, saves, replySaves] = authId
      ? await Promise.all([
          postIds.length
            ? prisma.post_vote.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                  value: true,
                },
              })
            : Promise.resolve([]),
          postIds.length
            ? prisma.post_save.findMany({
                where: {
                  deleted: false,
                  post_id: { in: postIds },
                  user_id: authId,
                },
                select: {
                  post_id: true,
                },
              })
            : Promise.resolve([]),
          replyIds.length
            ? prisma.post_reply_save.findMany({
                where: {
                  deleted: false,
                  reply_id: { in: replyIds },
                  user_id: authId,
                },
                select: {
                  reply_id: true,
                },
              })
            : Promise.resolve([]),
        ])
      : [[], [], []];
    const voteByPostId = new Map(
      votes.map((vote) => [vote.post_id, normalizeVoteValue(vote.value)]),
    );
    const savedPostIds = new Set(saves.map((save) => save.post_id));
    const savedReplyIds = new Set(replySaves.map((save) => save.reply_id));
    const [mutedPostIds, postsWithPsychologistReplies] = await Promise.all([
      getMutedPostIds(authId ?? undefined, postIds),
      getPostIdsWithPsychologistReplies(postIds),
    ]);
    const toDirectoryPublication = (
      item:
        | { kind: "post"; post: ProfilePostResult }
        | { kind: "reply"; reply: ProfileReplyResult },
    ): DirectoryPsychologistPost => {
      if (item.kind === "post") {
        return {
          ...toPostResponse(
            item.post,
            voteByPostId.get(item.post.id) ?? null,
            savedPostIds.has(item.post.id),
            savedReplyIds,
            undefined,
            mutedPostIds.has(item.post.id),
            postsWithPsychologistReplies.has(item.post.id),
            data.p.id,
            mentorBadgeByCommunityId,
          ),
          contribution_type: "post",
        };
      }

      return {
        ...toPostResponse(
          item.reply.post,
          voteByPostId.get(item.reply.post.id) ?? null,
          savedPostIds.has(item.reply.post.id),
          savedReplyIds,
          item.reply,
          mutedPostIds.has(item.reply.post.id),
          postsWithPsychologistReplies.has(item.reply.post.id),
          data.p.id,
          mentorBadgeByCommunityId,
        ),
        contribution_type: "reply",
      };
    };

    return {
      data: mergedItems.map((item) => toDirectoryPublication(item)),
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
      summary: {
        posts_count: postsCount,
        replies_count: repliesCount,
        top_mentor_communities: topMentorCommunities.slice(0, 3),
      },
      highlighted_publication: highlightedPublication
        ? toDirectoryPublication(highlightedPublication)
        : null,
    };
  }

  async reviews(data: IProfileListDTO): Promise<DirectoryPsychologistReviewsResponse> {
    const pagination = normalizePagination(data.q);
    const where: Prisma.professional_reviewWhereInput = {
      psychologist_id: data.p.id,
      deleted: false,
      status: "publicada",
      author: {
        active: true,
        deleted: false,
      },
    };

    const [items, count, profile, distributionRows, highlightedReview] = await Promise.all([
      prisma.professional_review.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: profileReviewSelect,
      }),
      prisma.professional_review.count({ where }),
      prisma.psychologist_profile.findFirst({
        where: {
          user_id: data.p.id,
          deleted: false,
          published: true,
          video_url: {
            not: null,
          },
          NOT: [
            {
              video_url: "",
            },
          ],
        },
        select: {
          rating_avg: true,
          rating_count: true,
        },
      }),
      prisma.professional_review.groupBy({
        by: ["rating"],
        where,
        _count: {
          rating: true,
        },
      }),
      prisma.professional_review.findFirst({
        where,
        orderBy: [{ rating: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        select: profileReviewSelect,
      }),
    ]);

    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    } satisfies Record<1 | 2 | 3 | 4 | 5, number>;

    for (const row of distributionRows) {
      if (row.rating >= 1 && row.rating <= 5) {
        distribution[row.rating as 1 | 2 | 3 | 4 | 5] = row._count.rating;
      }
    }

    return {
      data: items.map(toReviewResponse),
      summary: {
        rating_avg: profile?.rating_avg ?? 0,
        rating_count: profile?.rating_count ?? count,
        distribution,
      },
      highlighted_review: highlightedReview ? toReviewResponse(highlightedReview) : null,
      page: pagination.page,
      pages: Math.ceil(count / pagination.limit),
      count,
    };
  }
}
