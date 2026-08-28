"use client";

import { useCallback } from "react";
import type { PostReply } from "@/api/generator/types/posts";
import type { LectumShareSocialTarget } from "@/utils/lectum-share-target";
import {
  createLectumSharePostVideoDownloadTarget,
  createLectumShareVideoDownloadTarget,
  findPostReplyInTree,
} from "@/utils/lectum-share-target";

type PostDetailSocialVideoPreviewPost = Parameters<
  typeof createLectumSharePostVideoDownloadTarget
>[0];

type UsePostDetailSocialVideoPreviewOptions = {
  currentUserId: string | null;
  isPsychologistUser: boolean;
  openLectumDownloadDialog: (target: LectumShareSocialTarget) => void;
  post?: PostDetailSocialVideoPreviewPost | null;
  replies: PostReply[];
};

export const usePostDetailSocialVideoPreview = ({
  currentUserId,
  isPsychologistUser,
  openLectumDownloadDialog,
  post,
  replies,
}: UsePostDetailSocialVideoPreviewOptions) => {
  const openPostSocialVideoPreview = useCallback(() => {
    if (!post || typeof window === "undefined") return;
    if (!isPsychologistUser || post.author.id !== currentUserId) return;

    const socialTarget = createLectumSharePostVideoDownloadTarget(post);
    if (socialTarget) openLectumDownloadDialog(socialTarget);
  }, [currentUserId, isPsychologistUser, openLectumDownloadDialog, post]);

  const openReplySocialVideoPreview = useCallback(
    (reply: PostReply) => {
      if (!post || typeof window === "undefined") return;
      if (!isPsychologistUser || reply.author.id !== currentUserId) return;

      const parentReply = findPostReplyInTree(replies, reply.parent_reply_id);
      const socialTarget = createLectumShareVideoDownloadTarget(post, reply, {
        parentContent: parentReply?.content ?? null,
      });
      if (socialTarget) openLectumDownloadDialog(socialTarget);
    },
    [currentUserId, isPsychologistUser, openLectumDownloadDialog, post, replies],
  );

  return { openPostSocialVideoPreview, openReplySocialVideoPreview };
};
