import type { CommunityAuthor } from "@/api/generator/types/community";
import type {
  PostListPost,
  PostProfessionalReply,
  PostReply,
  UserPostReply,
} from "@/api/generator/types/posts";

export type LectumShareFormat = "story" | "feed";

export type LectumShareChannel = "clipboard" | "web_share";

export type LectumShareVideoTarget = {
  postId: string;
  professional: {
    avatar: string | null;
    name: string;
    roleLabel: "Psicóloga" | "Psicólogo";
    verified: boolean;
  };
  replyId: string;
  shareUrl: string;
  sourceKind: "comment" | "post";
  sourceText: string;
  videoUrl: string;
};

type ShareableProfessionalReply = Pick<
  PostProfessionalReply | PostReply | UserPostReply,
  "author" | "content" | "id" | "media_type" | "media_url" | "parent_reply_id" | "title"
> & {
  parent_content?: string | null;
};

type ShareTargetOptions = {
  parentContent?: string | null;
};

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

export const createLectumShareVideoTarget = (
  post: Pick<PostListPost, "community" | "id" | "title">,
  reply: ShareableProfessionalReply,
  options: ShareTargetOptions = {},
): LectumShareVideoTarget | null => {
  if (!isProfessionalAuthor(reply.author) || !isVideoReply(reply) || !reply.media_url) {
    return null;
  }

  const parentContent =
    options.parentContent ?? ("parent_content" in reply ? reply.parent_content : null);
  const hasCommentContext = Boolean(parentContent?.trim() || reply.parent_reply_id);
  const sourceText = (hasCommentContext ? parentContent : post.title)?.trim() || post.title;
  const relativeUrl = `/community/${post.community.slug}/post/${post.id}?focusReplyId=${encodeURIComponent(
    reply.id,
  )}#reply-${reply.id}`;

  return {
    postId: post.id,
    professional: {
      avatar: reply.author.avatar,
      name: normalizeLectumShareProfessionalName(reply.author.name) || reply.author.name,
      roleLabel: normalizeLectumShareProfessionalRole(reply.author.type_label),
      verified: reply.author.verified,
    },
    replyId: reply.id,
    shareUrl:
      typeof window === "undefined" ? relativeUrl : `${window.location.origin}${relativeUrl}`,
    sourceKind: hasCommentContext ? "comment" : "post",
    sourceText,
    videoUrl: reply.media_url,
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
