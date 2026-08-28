import type { CommunityAuthor } from "@/api/generator/types/community";
import type {
  PostListPost,
  PostProfessionalReply,
  PostReply,
  UserPostReply,
} from "@/api/generator/types/posts";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  publicCommunityPostFocusedReplyHref,
  publicCommunityPostHref,
  publicCommunityReplyWhatsappShareHref,
} from "@/utils/public-routes";

export type LectumShareChannel = "clipboard" | "web_share";

type LectumShareBaseTarget = {
  postId: string;
  replyId: string | null;
  shareUrl: string;
};

export type LectumShareLinkTarget = LectumShareBaseTarget & {
  kind: "link";
  text: string | null;
  title: string;
};

export type LectumShareMediaItem = {
  mediaType: "image" | "video";
  mediaUrl: string;
};

export type LectumShareSocialTarget = LectumShareBaseTarget & {
  cardLabel: "Postado na Lectum" | "Respondido na Lectum";
  carouselCount: number;
  kind: "post_media" | "video_response";
  mediaItems: LectumShareMediaItem[];
  mediaType: "image" | "video";
  mediaUrl: string;
  posterUrl?: string | null;
  professional: {
    avatar: string | null;
    name: string;
    roleLabel: "Psicóloga" | "Psicólogo";
    verified: boolean;
  };
  responseText: string | null;
  shareText: string;
  shareTitle: string;
  sourceKind: "comment" | "post";
  sourceText: string;
  whatsappShareUrl: string;
};

export type LectumShareVideoTarget = LectumShareLinkTarget | LectumShareSocialTarget;

type ShareableProfessionalReply = Pick<
  PostProfessionalReply | PostReply | UserPostReply,
  | "author"
  | "content"
  | "id"
  | "media_type"
  | "media_url"
  | "parent_reply_id"
  | "thumbnail_url"
  | "title"
> & {
  parent_content?: string | null;
};

type ShareTargetOptions = {
  parentContent?: string | null;
  relativeUrl?: string;
};

type ShareablePostWithMedia = Pick<
  PostListPost,
  | "author"
  | "community"
  | "content"
  | "id"
  | "media_items"
  | "media_type"
  | "media_url"
  | "thumbnail_url"
  | "title"
>;

const normalizeForComparison = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const LECTUM_SHARE_PROFESSIONAL_TAG_NAME_MAX_LENGTH = 18;

export const truncateLectumShareProfessionalTagName = (name: string) => {
  const normalized = name.replace(/\s+/g, " ").trim();

  if (normalized.length <= LECTUM_SHARE_PROFESSIONAL_TAG_NAME_MAX_LENGTH) return normalized;

  return `${normalized.slice(0, LECTUM_SHARE_PROFESSIONAL_TAG_NAME_MAX_LENGTH).trimEnd()}...`;
};

export const normalizeLectumShareProfessionalName = normalizeProfessionalDisplayName;

export const normalizeLectumShareProfessionalRole = (
  typeLabel?: string | null,
): "Psicóloga" | "Psicólogo" => {
  const normalized = normalizeForComparison(typeLabel);

  return normalized.includes("psicologa") ? "Psicóloga" : "Psicólogo";
};

const isProfessionalAuthor = (author: CommunityAuthor) => author.role === "psicologo";

const isVideoReply = (reply: ShareableProfessionalReply) =>
  reply.media_type === "video" && Boolean(reply.media_url);

const toAbsoluteShareUrl = (relativeUrl: string) =>
  typeof window === "undefined" ? relativeUrl : `${window.location.origin}${relativeUrl}`;

const postRelativeUrl = (post: Pick<PostListPost, "community" | "id">) =>
  publicCommunityPostHref(post.community.slug, post.id);

const isShareableMedia = (
  mediaUrl: string | null | undefined,
  mediaType: string | null | undefined,
): mediaType is "image" | "video" =>
  Boolean(mediaUrl && (mediaType === "image" || mediaType === "video"));

const hasShareablePostMedia = (post: ShareablePostWithMedia) =>
  (post.media_items ?? []).some((item) => isShareableMedia(item.media_url, item.media_type)) ||
  isShareableMedia(post.media_url, post.media_type);

const getFirstShareablePostVideoMedia = (post: ShareablePostWithMedia) => {
  const firstMedia = (post.media_items ?? [])[0];

  if (firstMedia) {
    return firstMedia.media_type === "video" && firstMedia.media_url
      ? {
          mediaUrl: firstMedia.media_url,
          posterUrl: firstMedia.thumbnail_url ?? null,
        }
      : null;
  }

  return post.media_type === "video" && post.media_url
    ? {
        mediaUrl: post.media_url,
        posterUrl: post.thumbnail_url ?? null,
      }
    : null;
};

const createLectumSocialShareTitle = (professionalName: string) =>
  `${professionalName.replace(/\s+/g, " ").trim() || "Lectum"} na Lectum`;

export const createLectumShareLinkTarget = (
  post: Pick<PostListPost, "community" | "id" | "title">,
  options: {
    relativeUrl?: string;
    replyId?: string | null;
    text?: string | null;
    title?: string;
  } = {},
): LectumShareLinkTarget => {
  const relativeUrl = options.relativeUrl ?? postRelativeUrl(post);

  return {
    kind: "link",
    postId: post.id,
    replyId: options.replyId ?? null,
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    text: options.text ?? null,
    title: options.title ?? post.title,
  };
};

export const createLectumSharePostMediaTarget = (
  post: ShareablePostWithMedia,
  options: ShareTargetOptions = {},
): LectumShareLinkTarget | null => {
  if (!isProfessionalAuthor(post.author)) return null;

  if (!hasShareablePostMedia(post)) return null;

  const relativeUrl = options.relativeUrl ?? postRelativeUrl(post);
  const professionalName =
    normalizeLectumShareProfessionalName(post.author.name) || post.author.name;

  return createLectumShareLinkTarget(post, {
    relativeUrl,
    title: createLectumSocialShareTitle(professionalName),
  });
};

export const createLectumShareVideoTarget = (
  post: Pick<PostListPost, "community" | "id" | "title">,
  reply: ShareableProfessionalReply,
  options: ShareTargetOptions = {},
): LectumShareLinkTarget | null => {
  if (!isProfessionalAuthor(reply.author) || !isVideoReply(reply) || !reply.media_url) {
    return null;
  }

  const relativeUrl =
    options.relativeUrl ??
    publicCommunityPostFocusedReplyHref(post.community.slug, post.id, reply.id);
  const professionalName =
    normalizeLectumShareProfessionalName(reply.author.name) || reply.author.name;

  return createLectumShareLinkTarget(post, {
    relativeUrl,
    replyId: reply.id,
    title: createLectumSocialShareTitle(professionalName),
  });
};

export const createLectumShareTargetFromHighlightedReply = (
  post: Pick<PostListPost, "community" | "highlighted_professional_reply" | "id" | "title">,
) => {
  if (!post.highlighted_professional_reply) return null;

  return createLectumShareVideoTarget(post, post.highlighted_professional_reply);
};

export const createLectumSharePostVideoDownloadTarget = (
  post: ShareablePostWithMedia,
  options: ShareTargetOptions = {},
): LectumShareSocialTarget | null => {
  if (!isProfessionalAuthor(post.author)) return null;

  const videoMedia = getFirstShareablePostVideoMedia(post);
  if (!videoMedia) return null;

  const sourceText = post.title.trim() || post.content.trim() || "Post na Lectum";
  const relativeUrl = options.relativeUrl ?? postRelativeUrl(post);
  const professionalName =
    normalizeLectumShareProfessionalName(post.author.name) || post.author.name;

  return {
    cardLabel: "Postado na Lectum",
    carouselCount: 1,
    kind: "post_media",
    mediaItems: [{ mediaType: "video", mediaUrl: videoMedia.mediaUrl }],
    mediaType: "video",
    mediaUrl: videoMedia.mediaUrl,
    posterUrl: videoMedia.posterUrl,
    postId: post.id,
    professional: {
      avatar: post.author.avatar,
      name: professionalName,
      roleLabel: normalizeLectumShareProfessionalRole(post.author.type_label),
      verified: post.author.verified,
    },
    replyId: null,
    responseText: post.content.trim() || null,
    shareText: sourceText,
    shareTitle: createLectumSocialShareTitle(professionalName),
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    sourceKind: "post",
    sourceText,
    whatsappShareUrl: toAbsoluteShareUrl(relativeUrl),
  };
};

export const createLectumShareVideoDownloadTarget = (
  post: Pick<PostListPost, "community" | "id" | "title">,
  reply: ShareableProfessionalReply,
  options: ShareTargetOptions = {},
): LectumShareSocialTarget | null => {
  if (!isProfessionalAuthor(reply.author) || !isVideoReply(reply) || !reply.media_url) {
    return null;
  }

  const parentContent =
    options.parentContent ?? ("parent_content" in reply ? reply.parent_content : null);
  const postTitle = post.title.trim() || "Pergunta na Lectum";
  const hasCommentContext = Boolean(parentContent?.trim() || reply.parent_reply_id);
  const sourceText = (hasCommentContext ? parentContent : postTitle)?.trim() || postTitle;
  const responseText = reply.content?.trim() || null;
  const relativeUrl =
    options.relativeUrl ??
    publicCommunityPostFocusedReplyHref(post.community.slug, post.id, reply.id);
  const cardLabel = "Respondido na Lectum";
  const professionalName =
    normalizeLectumShareProfessionalName(reply.author.name) || reply.author.name;

  return {
    cardLabel,
    carouselCount: 1,
    kind: "video_response",
    mediaItems: [{ mediaType: "video", mediaUrl: reply.media_url }],
    mediaType: "video",
    mediaUrl: reply.media_url,
    posterUrl: reply.thumbnail_url ?? null,
    postId: post.id,
    professional: {
      avatar: reply.author.avatar,
      name: professionalName,
      roleLabel: normalizeLectumShareProfessionalRole(reply.author.type_label),
      verified: reply.author.verified,
    },
    replyId: reply.id,
    responseText,
    shareText: postTitle,
    shareTitle: createLectumSocialShareTitle(professionalName),
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    sourceKind: hasCommentContext ? "comment" : "post",
    sourceText,
    whatsappShareUrl: toAbsoluteShareUrl(
      publicCommunityReplyWhatsappShareHref(post.community.slug, post.id, reply.id),
    ),
  };
};

export const findPostReplyInTree = (
  items: PostReply[],
  replyId?: string | null,
): PostReply | null => {
  if (!replyId) return null;

  for (const item of items) {
    if (item.id === replyId) return item;

    const nested = findPostReplyInTree(item.replies, replyId);
    if (nested) return nested;
  }

  return null;
};
