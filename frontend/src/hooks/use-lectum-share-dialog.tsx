"use client";

import { useCallback } from "react";
import { useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import type { ShareExportResult } from "@/utils/lectum-share-media";
import type { LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

export const useLectumShareDialog = (options: UseLectumShareDialogOptions = {}) => {
  const { isSharing, shareLectumTarget: shareDirectTarget } = useLectumDirectShare(options);

  const shareLectumTarget = useCallback(
    async (target: LectumShareVideoTarget) => {
      await shareDirectTarget(target);
    },
    [shareDirectTarget],
  );

  return {
    isSharing,
    shareLectumTarget,
  };
};
