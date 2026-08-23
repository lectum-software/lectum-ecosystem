"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  LectumShareDestinationDialog,
  type LectumShareDestinationMode,
} from "@/components/community/lectum-share-destination-dialog";
import { type LectumShareDestination, useLectumDirectShare } from "@/hooks/use-lectum-direct-share";
import {
  prepareLectumSourceVideoFallbackFile,
  shouldPreferLectumSourceVideoFallbackForSocialShare,
} from "@/utils/lectum-share-media";
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
  const [isPreparingAndroidSocialFile, setIsPreparingAndroidSocialFile] = useState(false);
  const androidPreparationRunRef = useRef(0);
  const { isSharing, shareLectumTarget: shareDirectTarget } = useLectumDirectShare(options);

  const closeShareDestinationDialog = useCallback(() => {
    if (isSharing) return;

    androidPreparationRunRef.current += 1;
    setIsPreparingAndroidSocialFile(false);
    setPendingTarget(null);
  }, [isSharing]);

  const prewarmAndroidSocialFile = useCallback(
    (target: LectumShareSocialTarget, mode: LectumShareDestinationMode) => {
      const runId = androidPreparationRunRef.current + 1;
      androidPreparationRunRef.current = runId;

      if (mode !== "mobile" || !shouldPreferLectumSourceVideoFallbackForSocialShare()) {
        setIsPreparingAndroidSocialFile(false);
        return;
      }

      setIsPreparingAndroidSocialFile(true);

      void prepareLectumSourceVideoFallbackFile(target)
        .finally(() => {
          if (androidPreparationRunRef.current === runId) {
            setIsPreparingAndroidSocialFile(false);
          }
        })
        .catch(() => undefined);
    },
    [],
  );

  const shareLectumTarget = useCallback(
    async (target: LectumShareVideoTarget) => {
      if (target.kind === "link" || target.mediaType !== "video") {
        await shareDirectTarget(target);
        return;
      }

      const mode = resolveLectumShareDestinationMode();
      setDestinationMode(mode);
      setPendingTarget(target);
      prewarmAndroidSocialFile(target, mode);
    },
    [prewarmAndroidSocialFile, shareDirectTarget],
  );

  const selectShareDestination = useCallback(
    (destination: LectumShareDestination) => {
      if (!pendingTarget) return;

      const target = pendingTarget;
      androidPreparationRunRef.current += 1;
      setIsPreparingAndroidSocialFile(false);
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
        preparingSocial={isPreparingAndroidSocialFile}
      />
    ),
    [
      closeShareDestinationDialog,
      destinationMode,
      isPreparingAndroidSocialFile,
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
