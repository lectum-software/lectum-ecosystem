"use client";

import { useCallback } from "react";
import { useSharePost, useShareReply } from "@/api/callers/posts";
import type { LectumShareChannel, LectumShareVideoTarget } from "@/utils/lectum-share-target";

export const useLectumShareTracking = (target: LectumShareVideoTarget | null) => {
  const { mutate: sharePost } = useSharePost();
  const { mutate: shareReply } = useShareReply();

  return useCallback(
    (channel: LectumShareChannel) => {
      if (!target) return;

      if (target.replyId) {
        shareReply({
          postId: target.postId,
          replyId: target.replyId,
          body: { channel },
        });
        return;
      }

      sharePost({ id: target.postId, body: { channel } });
    },
    [sharePost, shareReply, target],
  );
};
