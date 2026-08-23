import type { CommunityAuthor, CommunityPostMediaItem } from "@/api/generator/types/community";
import type {
  PostListPost,
  PostProfessionalReply,
  PostReply,
  UserPostReply,
} from "@/api/generator/types/posts";
import { normalizeProfessionalDisplayName } from "@/utils/professional-name";
import {
  publicCommunityPostHref,
  publicCommunityPostWhatsappShareHref,
  publicCommunityReplyThreadHref,
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
  "author" | "content" | "id" | "media_type" | "media_url" | "parent_reply_id" | "title"
> & {
  parent_content?: string | null;
};

type ShareTargetOptions = {
  parentContent?: string | null;
  relativeUrl?: string;
};

type ShareablePostWithMedia = Pick<
  PostListPost,
  "author" | "community" | "content" | "id" | "media_items" | "media_type" | "media_url" | "title"
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

const normalizePostMediaItem = (
  mediaUrl: string | null | undefined,
  mediaType: string | null | undefined,
): LectumShareMediaItem | null => {
  if (!mediaUrl || (mediaType !== "image" && mediaType !== "video")) return null;

  return {
    mediaType,
    mediaUrl,
  };
};

const sortMediaItems = (items: CommunityPostMediaItem[]) =>
  [...items].sort((left, right) => left.position - right.position);

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
): LectumShareSocialTarget | null => {
  if (!isProfessionalAuthor(post.author)) return null;

  const carouselItems = sortMediaItems(post.media_items ?? [])
    .map((item) => normalizePostMediaItem(item.media_url, item.media_type))
    .filter((item): item is LectumShareMediaItem => Boolean(item));
  const singleItem = normalizePostMediaItem(post.media_url, post.media_type);
  const mediaItems = carouselItems.length > 0 ? carouselItems : singleItem ? [singleItem] : [];
  const firstMedia = mediaItems[0];

  if (!firstMedia) return null;

  const relativeUrl = options.relativeUrl ?? postRelativeUrl(post);
  const responseText = post.content?.trim() || null;
  const cardLabel = "Postado na Lectum";
  const professionalName =
    normalizeLectumShareProfessionalName(post.author.name) || post.author.name;

  return {
    cardLabel,
    carouselCount: mediaItems.length,
    kind: "post_media",
    mediaItems,
    mediaType: firstMedia.mediaType,
    mediaUrl: firstMedia.mediaUrl,
    postId: post.id,
    professional: {
      avatar: post.author.avatar,
      name: professionalName,
      roleLabel: normalizeLectumShareProfessionalRole(post.author.type_label),
      verified: post.author.verified,
    },
    replyId: null,
    responseText,
    shareText: post.title,
    shareTitle: createLectumSocialShareTitle(professionalName),
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    sourceKind: "post",
    sourceText: post.title,
    whatsappShareUrl: toAbsoluteShareUrl(
      publicCommunityPostWhatsappShareHref(post.community.slug, post.id),
    ),
  };
};

export const createLectumShareVideoTarget = (
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
    options.relativeUrl ?? publicCommunityReplyThreadHref(post.community.slug, post.id, reply.id);
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
    postId: post.id,
    professional: {
      avatar: reply.author.avatar,
      name: professionalName,
      roleLabel: normalizeLectumShareProfessionalRole(reply.author.type_label),
      verified: reply.author.verified,
    },
    responseText,
    replyId: reply.id,
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

export const createLectumShareTargetFromHighlightedReply = (
  post: Pick<PostListPost, "community" | "highlighted_professional_reply" | "id" | "title">,
) => {
  if (!post.highlighted_professional_reply) return null;

  return createLectumShareVideoTarget(post, post.highlighted_professional_reply);
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
