import type { Prisma } from "@/external/generated/prisma/client";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import type { LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";
import type {
  CommunityAuthorDTO,
  CommunityPostDTO,
  CommunityPostSortMetricsDTO,
} from "../../DTOs/ICommunityDTO";

import type {
  AuthorResult,
  CurrentVote,
  PostResult,
  ProfessionalReplyResult,
} from "./community-feed";

import {
  anonymousDisplayNameForAuthor,
  authorTypeLabel,
  buildProfessionalWhatsappUrl,
  isProfessionalVerified,
  mentorBadgeForScore,
  toCommunityResponse,
} from "./community-ranking";

export const postSearchWhere = (search?: string): Prisma.community_postWhereInput["OR"] => {
  if (!search) return undefined;

  return [
    {
      title: {
        contains: search,
        mode: "insensitive",
      },
    },
    {
      content: {
        contains: search,
        mode: "insensitive",
      },
    },
    {
      replies: {
        some: {
          deleted: false,
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              content: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      },
    },
    {
      AND: [
        {
          OR: [
            {
              anonymous: false,
            },
            {
              author: {
                role: "psicologo",
              },
            },
          ],
        },
        {
          author: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ],
    },
  ];
};

export const toAuthorResponse = (
  author: AuthorResult,
  mentorScore = 0,
  anonymous = false,
  anonymousDisplayName?: string,
  whatsappMessageSource: LectumWhatsappMessageSource = "community_post",
): CommunityAuthorDTO => {
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

export const toHighlightedProfessionalReply = (
  reply?: ProfessionalReplyResult,
  savedReplyIds?: Set<string>,
): CommunityPostDTO["highlighted_professional_reply"] => {
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

export const toPostMediaItemsResponse = (
  item: Pick<PostResult, "media_items" | "media_type" | "media_url" | "thumbnail_url">,
): CommunityPostDTO["media_items"] => {
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
  currentUserVote: CurrentVote = null,
  saved = false,
  followedCommunityIds?: Set<string>,
  savedReplyIds?: Set<string>,
  sortMetrics?: CommunityPostSortMetricsDTO,
  highlightedProfessionalReply?: ProfessionalReplyResult | null,
  mutedByCurrentUser = false,
  hasPsychologistReply = false,
): CommunityPostDTO => {
  const responseCommunity = {
    ...toCommunityResponse(item.community),
    ...(followedCommunityIds ? { following: followedCommunityIds.has(item.community.id) } : {}),
  };
  const anonymous = item.author.role !== "psicologo" && item.anonymous;
  const author = toAuthorResponse(
    item.author,
    item.upvotes_count,
    anonymous,
    anonymous ? anonymousDisplayNameForAuthor(item.author.id) : undefined,
  );
  const highlightedReply = toHighlightedProfessionalReply(
    highlightedProfessionalReply ?? item.replies[0],
    savedReplyIds,
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
    highlighted_professional_reply: highlightedReply,
    ...(sortMetrics ? { sort_metrics: sortMetrics } : {}),
  };
};
