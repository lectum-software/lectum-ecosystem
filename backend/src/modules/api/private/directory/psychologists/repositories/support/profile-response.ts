import type {
  CommunityAuthorDTO,
  CommunityDTO,
  CommunityPostDTO,
  CommunityProfessionalReplyDTO,
} from "@/modules/api/private/community/DTOs/ICommunityDTO";
import {
  buildProfessionalFullDisplayName,
  getProfessionalWhatsappDisplayName,
} from "@/utils/professional-name";
import type { LectumWhatsappMessageSource } from "@/utils/whatsapp-contact";

import {
  anonymousDisplayNameForAuthor,
  authorTypeLabel,
  buildProfessionalWhatsappUrl,
  type CurrentVote,
  isProfessionalVerified,
  type MentorBadgeByCommunityId,
  mentorBadgeForScore,
  PROFILE_PUBLICATION_COMMENT_WEIGHT,
  PROFILE_PUBLICATION_DOWNVOTE_WEIGHT,
  PROFILE_PUBLICATION_PSYCHOLOGIST_REPLY_WEIGHT,
  PROFILE_PUBLICATION_SAVE_WEIGHT,
  PROFILE_PUBLICATION_SHARE_WEIGHT,
  PROFILE_PUBLICATION_TOP_MENTOR_REPLY_WEIGHT,
  PROFILE_PUBLICATION_UPVOTE_WEIGHT,
  type ProfileAuthorResult,
  type ProfilePostResult,
  type ProfileProfessionalReplyResult,
  type ProfilePublicationCandidate,
  type ProfileReplyResult,
  selectHighlightedProfileReplyPreview,
} from "./profile-base";

export const toCommunityResponse = (item: ProfilePostResult["community"]): CommunityDTO => ({
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

export const toPostAuthorResponse = (
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
  const displayName = isPsychologist
    ? buildProfessionalFullDisplayName({
        fallbackName: author.name,
        firstName: profile?.professional_first_name,
        lastName: profile?.professional_last_name,
      })
    : author.name;
  const whatsappDisplayName = isPsychologist
    ? getProfessionalWhatsappDisplayName({
        fallbackName: displayName,
        firstName: profile?.professional_first_name,
      })
    : null;
  const featuredBadge =
    (forceFeaturedBadgeOverride
      ? featuredBadgeOverride
      : (featuredBadgeOverride ?? mentorBadgeForScore(profile, mentorScore))) ?? null;

  return {
    id: author.id,
    name: shouldMaskAuthor ? (anonymousDisplayName ?? "Membro Anônimo") : displayName,
    avatar: shouldMaskAuthor ? null : author.avatar,
    role: author.role,
    type_label: authorTypeLabel(author.role, profile?.gender, anonymous),
    crp: isPsychologist ? (profile?.crp ?? null) : null,
    verified: isPsychologist && isProfessionalVerified(profile),
    featured_badge: isPsychologist ? featuredBadge : null,
    whatsapp_name: isPsychologist ? whatsappDisplayName : null,
    whatsapp_url: isPsychologist
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
  item: Pick<ProfilePostResult, "media_items" | "media_type" | "media_url" | "thumbnail_url">,
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
          thumbnail_url: mediaItem.thumbnail_url,
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
      thumbnail_url: item.thumbnail_url,
      position: 0,
    },
  ];
};

export const rankedMentorBadgeForAuthor = (
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

export const toPostResponse = (
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
    thumbnail_url: item.thumbnail_url,
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

export const profilePublicationScore = ({
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

export const postEngagementScore = (post: ProfilePostResult) => {
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

export const replyEngagementScore = (
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

export const compareProfilePublicationCandidates = (
  a: ProfilePublicationCandidate,
  b: ProfilePublicationCandidate,
) => {
  const scoreDiff = b.score - a.score;
  if (scoreDiff !== 0) return scoreDiff;

  const dateDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (dateDiff !== 0) return dateDiff;

  return b.id.localeCompare(a.id);
};

export const selectHighlightedPublication = (
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
