"use client";

import { useCallback, useMemo, useState } from "react";
import {
  LectumShareDestinationDialog,
  type LectumShareDestinationMode,
} from "@/components/community/lectum-share-destination-dialog";
import { type LectumShareDestination, useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import type { ShareExportResult } from "@/utils/lectum-share-media/layout";
import type { LectumShareSocialTarget, LectumShareVideoTarget } from "@/utils/lectum-share-target";

type UseLectumShareDialogOptions = {
  onShared?: (target: LectumShareVideoTarget, result: ShareExportResult) => void;
};

const DESKTOP_SHARE_DESTINATION_QUERY = "(hover: hover) and (pointer: fine)";

const resolveLectumShareDestinationMode = (): LectumShareDestinationMode => {
  if (typeof window === "undefined" || !window.matchMedia) return "mobile";

  return window.matchMedia(DESKTOP_SHARE_DESTINATION_QUERY).matches ? "desktop" : "mobile";
};

export const useLectumShareDialog = (options: UseLectumShareDialogOptions = {}) => {
  const [pendingTarget, setPendingTarget] = useState<LectumShareSocialTarget | null>(null);
  const [destinationMode, setDestinationMode] = useState<LectumShareDestinationMode>("mobile");
  const { isSharing, shareLectumTarget: shareDirectTarget } = useLectumDirectShare(options);

  const closeShareDestinationDialog = useCallback(() => {
    if (isSharing) return;

    setPendingTarget(null);
  }, [isSharing]);

  const shareLectumTarget = useCallback(
    async (target: LectumShareVideoTarget) => {
      if (target.kind === "link" || target.mediaType !== "video") {
        await shareDirectTarget(target);
        return;
      }

      setDestinationMode(resolveLectumShareDestinationMode());
      setPendingTarget(target);
    },
    [shareDirectTarget],
  );

  const selectShareDestination = useCallback(
    (destination: LectumShareDestination) => {
      if (!pendingTarget) return;

      const target = pendingTarget;
      setPendingTarget(null);
      void shareDirectTarget(target, { destination });
    },
    [pendingTarget, shareDirectTarget],
  );

  const shareDestinationDialog = useMemo(
    () => (
      <LectumShareDestinationDialog
        disabled={isSharing}
        mode={destinationMode}
        onClose={closeShareDestinationDialog}
        onSelect={selectShareDestination}
        open={Boolean(pendingTarget)}
      />
    ),
    [
      closeShareDestinationDialog,
      destinationMode,
      isSharing,
      pendingTarget,
      selectShareDestination,
    ],
  );

  return {
    isSharing,
    shareDestinationDialog,
    shareLectumTarget,
  };
};
