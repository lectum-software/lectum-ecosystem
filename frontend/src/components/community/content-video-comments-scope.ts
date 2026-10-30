import type { PostReply } from "@/api/generator/types/posts";
import { findReplyInTree } from "@/app/app/community/[slug]/post/[id]/modules/reply-support";

export const getContentVideoReplyCommentCount = (
  videoReplyId: string,
  videoReply: PostReply | undefined,
): number | undefined =>
  videoReply?.id === videoReplyId
    ? (videoReply.descendants_count ?? videoReply.replies_count)
    : undefined;

/** The video itself is context, never a comment in its own sheet. */
export const getContentVideoCommentReplies = (
  videoReplyId: string,
  videoReply: PostReply | undefined,
  continuationId = "",
): PostReply[] => {
  if (videoReply?.id !== videoReplyId) return [];
  if (!continuationId) return videoReply.replies;
  const descendant = findReplyInTree(videoReply.replies, continuationId);
  return descendant ? [descendant] : [];
};

export const getContentVideoCommentTarget = (
  videoReplyId: string | undefined,
  nestedTarget: { id: string } | null,
) => nestedTarget?.id ?? videoReplyId ?? null;
