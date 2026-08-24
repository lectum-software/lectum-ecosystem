"use client";

import { useCallback } from "react";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type { LectumShareLinkTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

const toLectumLinkOnlyTarget = (target: LectumShareVideoTarget): LectumShareLinkTarget => {
  if (target.kind === "link") return target;

  return {
    kind: "link",
    postId: target.postId,
    replyId: target.replyId,
    shareUrl: target.shareUrl,
    text: null,
    title: target.shareTitle,
  };
};

export const useLectumShareDialog = (options: UseLectumShareDialogOptions = {}) => {
  const { isSharing, shareLectumTarget: shareDirectTarget } = useLectumDirectShare(options);

  const shareLectumTarget = useCallback(
    async (target: LectumShareVideoTarget) => {
      await shareDirectTarget(toLectumLinkOnlyTarget(target));
    },
    [shareDirectTarget],
  );

  return {
    isSharing,
    shareDestinationDialog: null,
    shareLectumTarget,
  };
};
