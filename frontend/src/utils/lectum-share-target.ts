import type { CommunityAuthor, CommunityPostMediaItem } from "@/api/generator/types/community";
import type {
  PostListPost,
  PostProfessionalReply,
  PostReply,
  UserPostReply,
} from "@/api/generator/types/posts";

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
  "author" | "community" | "id" | "media_items" | "media_type" | "media_url" | "title"
>;

const normalizeForComparison = (value?: string | null) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export const normalizeLectumShareProfessionalName = (name: string) =>
  name
    .replace(/^\s*dr(?:a)?\.?\s+/i, "")
    .replace(/^\s*doutor(?:a)?\s+/i, "")
    .trim();

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
  `/community/${post.community.slug}/post/${post.id}`;

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

  return {
    cardLabel: "Postado na Lectum",
    carouselCount: mediaItems.length,
    kind: "post_media",
    mediaItems,
    mediaType: firstMedia.mediaType,
    mediaUrl: firstMedia.mediaUrl,
    postId: post.id,
    professional: {
      avatar: post.author.avatar,
      name: normalizeLectumShareProfessionalName(post.author.name) || post.author.name,
      roleLabel: normalizeLectumShareProfessionalRole(post.author.type_label),
      verified: post.author.verified,
    },
    replyId: null,
    responseText: null,
    shareText: post.title,
    shareTitle: "Postado na Lectum",
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    sourceKind: "post",
    sourceText: post.title,
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
  const hasCommentContext = Boolean(parentContent?.trim() || reply.parent_reply_id);
  const sourceText = (hasCommentContext ? parentContent : post.title)?.trim() || post.title;
  const responseText = reply.content?.trim() || null;
  const relativeUrl =
    options.relativeUrl ??
    `/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(
      reply.id,
    )}#reply-${reply.id}`;

  return {
    cardLabel: "Respondido na Lectum",
    carouselCount: 1,
    kind: "video_response",
    mediaItems: [{ mediaType: "video", mediaUrl: reply.media_url }],
    mediaType: "video",
    mediaUrl: reply.media_url,
    postId: post.id,
    professional: {
      avatar: reply.author.avatar,
      name: normalizeLectumShareProfessionalName(reply.author.name) || reply.author.name,
      roleLabel: normalizeLectumShareProfessionalRole(reply.author.type_label),
      verified: reply.author.verified,
    },
    responseText,
    replyId: reply.id,
    shareText:
      responseText ||
      (hasCommentContext
        ? "Responderam a um comentário na Lectum."
        : "Responderam a uma pergunta na Lectum."),
    shareTitle: "Respondido na Lectum",
    shareUrl: toAbsoluteShareUrl(relativeUrl),
    sourceKind: hasCommentContext ? "comment" : "post",
    sourceText,
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
